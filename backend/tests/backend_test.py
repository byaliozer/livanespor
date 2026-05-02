"""Livanespor backend API tests (pytest)."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-media-hub-37.preview.emergentagent.com').rstrip('/')
ADMIN_EMAIL = "livanespor"
ADMIN_PASSWORD = "Livanespor2026"


# ─────────────── Fixtures ───────────────
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login",
                 json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="session")
def admin_client(api, admin_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json",
                      "Authorization": f"Bearer {admin_token}"})
    return s


# ─────────────── Health ───────────────
class TestHealth:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d.get("status") == "ok"

    def test_health(self, api):
        r = api.get(f"{BASE_URL}/api/health", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d.get("ok") is True


# ─────────────── Auth ───────────────
class TestAuth:
    def test_login_success(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        token = d.get("access_token") or d.get("token")
        assert token and isinstance(token, str)
        assert "user" in d
        assert d["user"]["email"] == ADMIN_EMAIL

    def test_login_wrong_password(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": ADMIN_EMAIL, "password": "WrongPassword!"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d.get("email") == ADMIN_EMAIL

    def test_me_without_token(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert r.status_code in (401, 403)


# ─────────────── Public endpoints ───────────────
class TestPublic:
    @pytest.mark.parametrize("path,min_count", [
        ("/api/public/site-settings", None),
        ("/api/public/hero-slides", 3),
        ("/api/public/players", 6),
        ("/api/public/standings", 8),
        ("/api/public/matches", 0),
        ("/api/public/sponsors", 0),
        ("/api/public/academy/groups", 6),
        ("/api/public/academy/sessions", 6),
        ("/api/public/posts", 4),
        ("/api/public/categories", 8),
    ])
    def test_public_lists(self, api, path, min_count):
        r = api.get(f"{BASE_URL}{path}", timeout=15)
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"
        d = r.json()
        if min_count is not None:
            assert isinstance(d, list)
            assert len(d) >= min_count, f"{path} expected >={min_count}, got {len(d)}"

    def test_matches_next(self, api):
        r = api.get(f"{BASE_URL}/api/public/matches/next", timeout=10)
        assert r.status_code in (200, 404)

    def test_matches_last(self, api):
        r = api.get(f"{BASE_URL}/api/public/matches/last", timeout=10)
        assert r.status_code in (200, 404)

    def test_player_detail_by_slug(self, api):
        # Use the slug from the seeded data
        list_r = api.get(f"{BASE_URL}/api/public/players", timeout=10)
        assert list_r.status_code == 200
        players = list_r.json()
        assert len(players) > 0
        slug = players[0].get("slug")
        assert slug, "Player must have slug"
        r = api.get(f"{BASE_URL}/api/public/players/{slug}", timeout=10)
        assert r.status_code == 200
        assert r.json().get("slug") == slug

    def test_post_detail_by_slug(self, api):
        list_r = api.get(f"{BASE_URL}/api/public/posts", timeout=10)
        assert list_r.status_code == 200
        posts = list_r.json()
        assert len(posts) > 0
        slug = posts[0].get("slug")
        assert slug
        r = api.get(f"{BASE_URL}/api/public/posts/{slug}", timeout=10)
        assert r.status_code == 200
        assert r.json().get("slug") == slug

    def test_contact_form(self, api):
        payload = {"name": "TEST_Contact", "email": "test@example.com",
                   "subject": "Test", "message": "Test mesaj"}
        r = api.post(f"{BASE_URL}/api/public/contact", json=payload, timeout=10)
        assert r.status_code in (200, 201)
        d = r.json()
        assert d.get("name") == "TEST_Contact"
        assert "id" in d

    def test_academy_apply(self, api):
        payload = {"first_name": "TEST", "last_name": "Applicant",
                   "birth_date": "2015-01-01", "phone": "5551234567",
                   "parent_name": "TEST Parent", "email": "tparent@example.com"}
        r = api.post(f"{BASE_URL}/api/public/academy/apply", json=payload, timeout=10)
        assert r.status_code in (200, 201)
        d = r.json()
        assert "application_no" in d
        assert d["application_no"].startswith("LIV-")


# ─────────────── Admin auth gating ───────────────
class TestAdminAuthGate:
    def test_admin_players_no_token(self, api):
        r = api.get(f"{BASE_URL}/api/admin/players", timeout=10)
        assert r.status_code in (401, 403)

    def test_admin_dashboard_no_token(self, api):
        r = api.get(f"{BASE_URL}/api/admin/dashboard/stats", timeout=10)
        assert r.status_code in (401, 403)


# ─────────────── Admin CRUD ───────────────
class TestAdminCRUD:
    def test_dashboard_stats(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/dashboard/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for key in ["posts_total", "players_active", "sponsors_active",
                    "upcoming_matches", "recent_applications", "recent_messages"]:
            assert key in d

    def test_site_settings_get_put(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/site-settings", timeout=10)
        assert r.status_code == 200
        # PUT
        payload = {"site_title": "Livanespor TEST", "phone": "0224 000 0000"}
        r2 = admin_client.put(f"{BASE_URL}/api/admin/site-settings", json=payload, timeout=10)
        assert r2.status_code == 200
        assert r2.json().get("site_title") == "Livanespor TEST"

    def test_ai_settings_masked(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/ai-settings", timeout=10)
        assert r.status_code == 200
        d = r.json()
        # api key must be masked - never returned in plain
        assert "openai_api_key" not in d or d.get("openai_api_key") in (None, "")

    @pytest.mark.parametrize("coll", ["players", "posts", "sponsors", "matches"])
    def test_admin_list(self, admin_client, coll):
        r = admin_client.get(f"{BASE_URL}/api/admin/{coll}", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_player_crud_lifecycle(self, admin_client):
        # CREATE
        payload = {"name": "TEST_Player", "slug": "test-player-temp",
                   "position": "FW", "jersey_number": 99, "active": True}
        r = admin_client.post(f"{BASE_URL}/api/admin/players", json=payload, timeout=10)
        assert r.status_code in (200, 201), r.text
        created = r.json()
        pid = created.get("id")
        assert pid
        assert created["name"] == "TEST_Player"

        # GET
        rg = admin_client.get(f"{BASE_URL}/api/admin/players/{pid}", timeout=10)
        assert rg.status_code == 200
        assert rg.json()["name"] == "TEST_Player"

        # UPDATE
        ru = admin_client.put(f"{BASE_URL}/api/admin/players/{pid}",
                              json={"name": "TEST_Player_Upd", "slug": "test-player-temp"}, timeout=10)
        assert ru.status_code == 200
        assert ru.json()["name"] == "TEST_Player_Upd"

        # DELETE
        rd = admin_client.delete(f"{BASE_URL}/api/admin/players/{pid}", timeout=10)
        assert rd.status_code in (200, 204)

        # Verify deleted
        rg2 = admin_client.get(f"{BASE_URL}/api/admin/players/{pid}", timeout=10)
        assert rg2.status_code == 404


# ─────────────── AI Image Generation ───────────────
class TestAIImage:
    def test_generate_image_low_quality(self, admin_client):
        payload = {
            "prompt": "Bursa football team yellow black jersey night match",
            "aspect_ratio": "1:1",
            "quality": "low",
            "save_to_media": False,
        }
        r = admin_client.post(f"{BASE_URL}/api/admin/ai/generate-image",
                              json=payload, timeout=120)
        assert r.status_code == 200, f"AI gen failed: {r.status_code} {r.text[:500]}"
        d = r.json()
        # New behavior: either public_url (Object Storage) or data_url (fallback)
        public_url = d.get("public_url")
        data_url = d.get("data_url")
        assert public_url or data_url, f"Expected public_url or data_url, got {d}"
        if public_url:
            assert public_url.startswith("/api/public/media/")
            assert d.get("storage_path")
        else:
            assert data_url.startswith("data:image/")
        assert d.get("model") in ("gpt-image-2", "gpt-image-1")
