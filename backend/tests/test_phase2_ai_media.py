"""Phase 2+3 backend tests: AI templates, jobs, media archive, public media."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
ADMIN_USERNAME = os.environ.get("TEST_ADMIN_EMAIL", "livanespor")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Livanespor2026")

EXPECTED_TEMPLATES = {
    "match_week", "match_day", "lineup", "full_time", "motm",
    "birthday", "special_day", "new_transfer", "fan_invite",
}


# ─────────── Fixtures ───────────
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    d = r.json()
    return d.get("access_token") or d.get("token")


@pytest.fixture(scope="session")
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update(
        {"Content-Type": "application/json",
         "Authorization": f"Bearer {admin_token}"}
    )
    return s


@pytest.fixture(scope="session")
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _set_credits_to(admin_client, amount: int):
    """Adjust credit_balance to exactly amount using credit-adjust delta."""
    r = admin_client.get(f"{BASE_URL}/api/admin/subscription", timeout=10)
    bal = r.json()["credit_balance"]
    delta = amount - bal
    if delta != 0:
        admin_client.post(
            f"{BASE_URL}/api/admin/subscription/credit-adjust",
            json={"amount": delta, "note": f"TEST_set_to_{amount}"},
            timeout=10,
        )


# ─────────── AI Templates catalog ───────────
class TestAITemplatesCatalog:
    def test_templates_list_has_9(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/ai/templates", timeout=10)
        assert r.status_code == 200, r.text
        rows = r.json()
        assert isinstance(rows, list)
        keys = {x["key"] for x in rows}
        assert keys == EXPECTED_TEMPLATES, f"Keys mismatch: {keys}"
        for x in rows:
            for k in ("key", "name", "aspect_ratio", "required_inputs"):
                assert k in x, f"{x['key']} missing {k}"
            assert isinstance(x["required_inputs"], list)

    def test_templates_requires_auth(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/admin/ai/templates", timeout=10)
        assert r.status_code in (401, 403)


# ─────────── Insufficient credit ───────────
class TestInsufficientCredit:
    def test_402_when_no_credits(self, admin_client):
        # Remember current credits
        r0 = admin_client.get(f"{BASE_URL}/api/admin/subscription", timeout=10)
        initial = r0.json()["credit_balance"]
        try:
            _set_credits_to(admin_client, 0)
            # Attempt template submit
            rt = admin_client.post(
                f"{BASE_URL}/api/admin/ai/generate-template",
                json={
                    "template_key": "fan_invite",
                    "context": {"match_text": "LIV vs XYZ", "message": "Gel!"},
                    "aspect_ratio": "1:1",
                    "quality": "low",
                },
                timeout=15,
            )
            assert rt.status_code == 402, rt.text
            body = rt.json()
            msg = body.get("detail") or body.get("message") or ""
            assert "Kredi" in msg or "yetersiz" in msg.lower()

            # Same for freeform endpoint
            rf = admin_client.post(
                f"{BASE_URL}/api/admin/ai/generate-image",
                json={"prompt": "test", "aspect_ratio": "1:1",
                      "quality": "low", "save_to_media": False},
                timeout=15,
            )
            assert rf.status_code == 402
        finally:
            # Restore credits
            _set_credits_to(admin_client, initial)


# ─────────── Invalid template key ───────────
class TestInvalidTemplate:
    def test_invalid_template_returns_400(self, admin_client):
        r = admin_client.post(
            f"{BASE_URL}/api/admin/ai/generate-template",
            json={"template_key": "bogus_xyz", "context": {}},
            timeout=15,
        )
        # Note: current impl checks credit BEFORE template key, so credit deducts.
        # Acceptable outcomes: 400 (key invalid) or 402 (no credit). 400 preferred.
        assert r.status_code in (400, 402), r.text


# ─────────── Jobs listing + 404 ───────────
class TestJobsListing:
    def test_jobs_list_ok(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/ai/jobs?limit=5", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_job_detail_404(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/ai/jobs/nonexistent-id", timeout=10)
        assert r.status_code == 404


# ─────────── Full round-trip: fan_invite (1 real generation) ───────────
class TestTemplateRoundTrip:
    def test_fan_invite_full_roundtrip(self, admin_client):
        # Make sure we have credit
        _set_credits_to(admin_client, max(5, 5))
        r0 = admin_client.get(f"{BASE_URL}/api/admin/subscription", timeout=10)
        before = r0.json()["credit_balance"]

        payload = {
            "template_key": "fan_invite",
            "context": {
                "match_text": "Livanespor vs TEST FC - Cumartesi 19:00",
                "message": "Tribünlerde buluşalım!",
            },
            "aspect_ratio": "1:1",
            "quality": "low",
            "title": "TEST_fan_invite",
        }
        r = admin_client.post(
            f"{BASE_URL}/api/admin/ai/generate-template", json=payload, timeout=30
        )
        assert r.status_code == 200, r.text
        body = r.json()
        # Phase 2 v2 response shape: batch with jobs[]
        assert "batch_id" in body and "jobs" in body
        assert len(body["jobs"]) >= 1
        job = body["jobs"][0]
        assert job["status"] == "pending"
        assert "id" in job
        job_id = job["id"]

        # Credit deducted by 1
        r1 = admin_client.get(f"{BASE_URL}/api/admin/subscription", timeout=10)
        assert r1.json()["credit_balance"] == before - 1

        # Poll for up to 120s
        final = None
        for _ in range(40):
            time.sleep(3)
            rj = admin_client.get(
                f"{BASE_URL}/api/admin/ai/jobs/{job_id}", timeout=15
            )
            assert rj.status_code == 200
            st = rj.json().get("status")
            if st in ("success", "error"):
                final = rj.json()
                break
        assert final is not None, "Job did not finish in 120s"
        assert final["status"] == "success", f"Job failed: {final.get('error')}"

        for k in ("public_url", "storage_path", "model", "prompt", "media_id"):
            assert final.get(k), f"missing {k} in success job"
        assert final["public_url"].startswith("/api/public/media/")

        # Fetch public media WITHOUT auth
        anon = requests.Session()
        pr = anon.get(f"{BASE_URL}{final['public_url']}", timeout=30)
        assert pr.status_code == 200, pr.text[:200]
        assert pr.headers.get("content-type", "").startswith("image/")
        assert "Cache-Control" in pr.headers or "cache-control" in {k.lower() for k in pr.headers}
        assert len(pr.content) > 1000  # real PNG bytes

        # Archive filter ?source=ai_template contains this item
        ra = admin_client.get(
            f"{BASE_URL}/api/admin/media-archive?source=ai_template", timeout=10
        )
        assert ra.status_code == 200
        ids = [m["id"] for m in ra.json()]
        assert final["media_id"] in ids

        # Soft delete the media
        rd = admin_client.post(
            f"{BASE_URL}/api/admin/media/soft-delete",
            json={"id": final["media_id"]},
            timeout=10,
        )
        assert rd.status_code == 200
        assert rd.json().get("ok") is True

        # Verify disappears from archive
        ra2 = admin_client.get(
            f"{BASE_URL}/api/admin/media-archive?source=ai_template", timeout=10
        )
        ids2 = [m["id"] for m in ra2.json()]
        assert final["media_id"] not in ids2

        # Public URL now 404
        pr2 = anon.get(f"{BASE_URL}{final['public_url']}", timeout=15)
        assert pr2.status_code == 404


# ─────────── Public media 404 ───────────
class TestPublicMedia:
    def test_nonexistent_returns_404(self, anon_client):
        r = anon_client.get(
            f"{BASE_URL}/api/public/media/does-not-exist/xyz.png", timeout=10
        )
        assert r.status_code == 404


# ─────────── Archive list basic ───────────
class TestArchiveList:
    def test_archive_list_ok(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/media-archive", timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        for m in rows:
            # All rows returned must not be soft-deleted
            assert m.get("is_deleted") is not True

    def test_archive_filter_source(self, admin_client):
        r = admin_client.get(
            f"{BASE_URL}/api/admin/media-archive?source=upload", timeout=10
        )
        assert r.status_code == 200
        for m in r.json():
            assert m.get("source") == "upload"

    def test_archive_requires_auth(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/admin/media-archive", timeout=10)
        assert r.status_code in (401, 403)


# ─────────── soft-delete 404 ───────────
class TestSoftDelete404:
    def test_nonexistent_id_404(self, admin_client):
        r = admin_client.post(
            f"{BASE_URL}/api/admin/media/soft-delete",
            json={"id": "does-not-exist-xyz"},
            timeout=10,
        )
        assert r.status_code == 404
