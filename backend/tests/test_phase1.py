"""Phase 1 (Subscription, Birthdays, Site-Settings extensions) backend tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ADMIN_USERNAME = "livanespor"
ADMIN_PASSWORD = "Livanespor2026"


# ─────────── Fixtures ───────────
@pytest.fixture(scope="session")
def admin_token():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
               timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    d = r.json()
    return d.get("access_token") or d.get("token")


@pytest.fixture(scope="session")
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json",
                      "Authorization": f"Bearer {admin_token}"})
    return s


@pytest.fixture(scope="session")
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ─────────── Auth (username-based) ───────────
class TestUsernameAuth:
    def test_login_with_username(self, anon_client):
        r = anon_client.post(f"{BASE_URL}/api/auth/login",
                             json={"email": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
                             timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        token = d.get("access_token") or d.get("token")
        assert token
        assert d["user"]["role"] == "super_admin"

    def test_login_username_case_insensitive(self, anon_client):
        r = anon_client.post(f"{BASE_URL}/api/auth/login",
                             json={"email": "Livanespor", "password": ADMIN_PASSWORD},
                             timeout=15)
        assert r.status_code == 200, r.text


# ─────────── Subscription endpoints ───────────
class TestSubscription:
    def test_get_subscription_initialized(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/subscription", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        # Must have basic fields
        for k in ["plan_name", "plan_display_name", "monthly_credit_limit",
                  "credit_balance", "last_reset_year_month", "transactions"]:
            assert k in d, f"missing key: {k}"
        assert d["plan_name"] in ("starter", "plus", "pro")
        assert d["monthly_credit_limit"] in (30, 100, 500)
        assert isinstance(d["transactions"], list)

    def test_set_plan_plus_then_starter(self, admin_client):
        # Set to plus
        r = admin_client.put(f"{BASE_URL}/api/admin/subscription/plan",
                             json={"plan_name": "plus"}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plan_name"] == "plus"
        assert d["monthly_credit_limit"] == 100
        assert d["credit_balance"] == 100  # reset on plan change
        # plan_change tx must be present
        types = [t.get("type") for t in d.get("transactions", [])]
        assert "plan_change" in types

        # Verify via GET
        rg = admin_client.get(f"{BASE_URL}/api/admin/subscription", timeout=10)
        assert rg.status_code == 200
        assert rg.json()["plan_name"] == "plus"

        # Switch to pro
        r2 = admin_client.put(f"{BASE_URL}/api/admin/subscription/plan",
                              json={"plan_name": "pro"}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["plan_name"] == "pro"
        assert r2.json()["monthly_credit_limit"] == 500
        assert r2.json()["credit_balance"] == 500

        # Back to starter (cleanup)
        r3 = admin_client.put(f"{BASE_URL}/api/admin/subscription/plan",
                              json={"plan_name": "starter"}, timeout=15)
        assert r3.status_code == 200
        assert r3.json()["plan_name"] == "starter"
        assert r3.json()["monthly_credit_limit"] == 30

    def test_invalid_plan(self, admin_client):
        r = admin_client.put(f"{BASE_URL}/api/admin/subscription/plan",
                             json={"plan_name": "enterprise"}, timeout=10)
        assert r.status_code in (400, 422)

    def test_credit_adjust_add_and_deduct(self, admin_client):
        # Get current balance
        r0 = admin_client.get(f"{BASE_URL}/api/admin/subscription", timeout=10)
        before = r0.json()["credit_balance"]

        # Add 5
        r1 = admin_client.post(f"{BASE_URL}/api/admin/subscription/credit-adjust",
                               json={"amount": 5, "note": "TEST_add"}, timeout=10)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["ok"] is True
        assert d1["credit_balance"] == before + 5

        # Verify tx logged
        rg = admin_client.get(f"{BASE_URL}/api/admin/subscription", timeout=10)
        txs = rg.json().get("transactions", [])
        assert any(t.get("type") == "manual_adjust" and t.get("amount") == 5 for t in txs)

        # Deduct 3
        r2 = admin_client.post(f"{BASE_URL}/api/admin/subscription/credit-adjust",
                               json={"amount": -3, "note": "TEST_deduct"}, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["credit_balance"] == before + 5 - 3

    def test_credit_cannot_go_below_zero(self, admin_client):
        # Get current balance
        r0 = admin_client.get(f"{BASE_URL}/api/admin/subscription", timeout=10)
        bal = r0.json()["credit_balance"]
        # Try to deduct way more than balance
        r = admin_client.post(f"{BASE_URL}/api/admin/subscription/credit-adjust",
                              json={"amount": -(bal + 1000), "note": "TEST_overflow"},
                              timeout=10)
        assert r.status_code == 200
        assert r.json()["credit_balance"] == 0

        # Restore
        admin_client.post(f"{BASE_URL}/api/admin/subscription/credit-adjust",
                          json={"amount": bal, "note": "TEST_restore"}, timeout=10)


# ─────────── Auth gating for super_admin endpoints ───────────
class TestSubscriptionAuthGate:
    def test_anonymous_cannot_access(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/admin/subscription", timeout=10)
        assert r.status_code in (401, 403)

        r2 = anon_client.put(f"{BASE_URL}/api/admin/subscription/plan",
                             json={"plan_name": "starter"}, timeout=10)
        assert r2.status_code in (401, 403)


# ─────────── Birthdays + Dashboard stats ───────────
class TestBirthdaysAndDashboard:
    def test_birthdays_endpoint(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/dashboard/birthdays?days=30",
                             timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list)
        # If non-empty, validate shape and ordering
        if d:
            for item in d:
                assert "days_until" in item
                assert "turning_age" in item
                assert "name" in item
            for i in range(len(d) - 1):
                assert d[i]["days_until"] <= d[i+1]["days_until"]

    def test_player_with_birthdate_appears_in_birthdays(self, admin_client):
        # Create player with birth_date today
        from datetime import datetime, timedelta
        target = datetime.utcnow().date() + timedelta(days=3)
        # Use month/day with year=2000 to compute age
        bd = f"2000-{target.month:02d}-{target.day:02d}"
        unique = uuid.uuid4().hex[:6]
        payload = {
            "name": f"TEST_BD_{unique}",
            "slug": f"test-bd-{unique}",
            "position": "MF",
            "jersey_number": 88,
            "active": True,
            "birth_date": bd,
        }
        rc = admin_client.post(f"{BASE_URL}/api/admin/players", json=payload, timeout=10)
        assert rc.status_code in (200, 201), rc.text
        pid = rc.json()["id"]

        try:
            rb = admin_client.get(f"{BASE_URL}/api/admin/dashboard/birthdays?days=30",
                                  timeout=10)
            assert rb.status_code == 200
            names = [x.get("name") for x in rb.json()]
            assert payload["name"] in names, f"Expected {payload['name']} in {names}"
        finally:
            admin_client.delete(f"{BASE_URL}/api/admin/players/{pid}", timeout=10)

    def test_dashboard_stats_extended(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/dashboard/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["media_total", "upcoming_birthdays", "mackolik", "subscription"]:
            assert k in d, f"dashboard/stats missing {k}"
        sub = d["subscription"]
        for k in ["plan_name", "plan_display_name", "credit_balance",
                  "monthly_credit_limit", "last_reset_year_month"]:
            assert k in sub
        macko = d["mackolik"]
        for k in ["enabled", "team_display_name", "last_sync_at",
                  "last_sync_status", "last_sync_summary"]:
            assert k in macko


# ─────────── Site Settings new fields ───────────
class TestSiteSettingsExtended:
    def test_put_new_fields_persist(self, admin_client):
        # Get current first
        r0 = admin_client.get(f"{BASE_URL}/api/admin/site-settings", timeout=10)
        assert r0.status_code == 200

        payload = {
            "short_name": "LIV",
            "primary_color": "#FFD700",
            "secondary_color": "#000000",
            "bg_color": "#0F0F0F",
            "instagram_username": "livanespor_test",
            "default_theme": "dark",
        }
        r = admin_client.put(f"{BASE_URL}/api/admin/site-settings",
                             json=payload, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        for k, v in payload.items():
            assert d.get(k) == v, f"{k} expected {v} got {d.get(k)}"

        # Verify via GET (persistence)
        rg = admin_client.get(f"{BASE_URL}/api/admin/site-settings", timeout=10)
        assert rg.status_code == 200
        dg = rg.json()
        for k, v in payload.items():
            assert dg.get(k) == v
