"""
Phase 3 club management tests:
- Finance (income/expense + summary + pending)
- Contracts + Payments (breakdown by payment_type + 90-day alert)
- Match analysis AI generate + cached GET + auto-reset on finished
"""
import os
import requests
from datetime import datetime, timezone, timedelta
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ADMIN_USER = 'Livanespor'
ADMIN_PASS = 'Livanespor2026'


@pytest.fixture(scope='module')
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope='module')
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


# ───────── Finance ─────────
class TestFinance:
    created_ids = []

    def test_create_income_paid(self, client):
        r = client.post(f"{BASE_URL}/api/admin/finance_transactions", json={
            "type": "income", "category": "Sponsorluk", "amount": 15000,
            "date": datetime.now(timezone.utc).date().isoformat(),
            "paid": True, "note": "TEST_income_paid"
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["category"] == "Sponsorluk"
        assert d["amount"] == 15000
        assert d["type"] == "income"
        assert d["paid"] is True
        TestFinance.created_ids.append(d["id"])

    def test_create_expense(self, client):
        r = client.post(f"{BASE_URL}/api/admin/finance_transactions", json={
            "type": "expense", "category": "Saha Kirası", "amount": 3500,
            "date": datetime.now(timezone.utc).date().isoformat(),
            "paid": True, "note": "TEST_expense"
        })
        assert r.status_code == 200, r.text
        TestFinance.created_ids.append(r.json()["id"])

    def test_create_unpaid_income(self, client):
        r = client.post(f"{BASE_URL}/api/admin/finance_transactions", json={
            "type": "income", "category": "Akademi Aidatı", "amount": 2000,
            "date": datetime.now(timezone.utc).date().isoformat(),
            "paid": False, "note": "TEST_unpaid"
        })
        assert r.status_code == 200, r.text
        TestFinance.created_ids.append(r.json()["id"])

    def test_finance_summary(self, client):
        r = client.get(f"{BASE_URL}/api/admin/finance/summary")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "this_month" in d
        assert "chart" in d
        assert len(d["chart"]) == 6
        # This month: income(15k+2k)=17k expense=3.5k -> net 13.5k (but test adds to whatever was there)
        assert d["this_month"]["income"] >= 17000
        assert d["this_month"]["expense"] >= 3500
        assert d["pending_count"] >= 1
        assert d["pending_total"] >= 2000

    def test_list_and_delete(self, client):
        r = client.get(f"{BASE_URL}/api/admin/finance_transactions")
        assert r.status_code == 200
        # Cleanup
        for tid in TestFinance.created_ids:
            client.delete(f"{BASE_URL}/api/admin/finance_transactions/{tid}")


# ───────── Contracts & Payments ─────────
class TestContracts:
    player_id = None
    contract_id = None
    payment_ids = []
    second_player_id = None
    second_contract_id = None

    def test_pick_player(self, client):
        r = client.get(f"{BASE_URL}/api/admin/players")
        assert r.status_code == 200
        players = r.json()
        if not players:
            # Create a test player
            r2 = client.post(f"{BASE_URL}/api/admin/players", json={
                "name": "TEST_Player_A", "jersey_number": 99, "position": "Forvet"
            })
            assert r2.status_code == 200
            TestContracts.player_id = r2.json()["id"]
        else:
            TestContracts.player_id = players[0]["id"]

    def test_create_contract(self, client):
        start = datetime.now(timezone.utc).date()
        end = start + timedelta(days=180)
        r = client.post(f"{BASE_URL}/api/admin/player_contracts", json={
            "player_id": TestContracts.player_id,
            "contract_type": "season",
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "total_amount": 600000,
            "from_club": "Test FC",
            "notes": "10 gol = 50K bonus"
        })
        assert r.status_code == 200, r.text
        TestContracts.contract_id = r.json()["id"]

    def test_create_payments_and_summary(self, client):
        today = datetime.now(timezone.utc).date().isoformat()
        for ptype, amount in [("Bonservis", 100000), ("Imza Parası", 50000), ("Maç Başı Prim", 10000)]:
            r = client.post(f"{BASE_URL}/api/admin/player_payments", json={
                "player_id": TestContracts.player_id,
                "contract_id": TestContracts.contract_id,
                "payment_type": ptype,
                "amount": amount,
                "date": today,
                "note": f"TEST_{ptype}"
            })
            assert r.status_code == 200, r.text
            TestContracts.payment_ids.append(r.json()["id"])

        r = client.get(f"{BASE_URL}/api/admin/players/{TestContracts.player_id}/financial-summary")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["contracted_amount"] == 600000
        assert d["total_paid"] >= 160000
        assert d["remaining"] is not None
        # Our 3 payment types should appear
        assert "Bonservis" in d["by_type"]
        assert "Imza Parası" in d["by_type"]
        assert "Maç Başı Prim" in d["by_type"]
        assert d["by_type"]["Bonservis"] >= 100000

    def test_contract_90_day_alert(self, client):
        # Create a 2nd player if possible
        r = client.get(f"{BASE_URL}/api/admin/players")
        players = r.json()
        if len(players) >= 2:
            TestContracts.second_player_id = players[1]["id"]
        else:
            r2 = client.post(f"{BASE_URL}/api/admin/players", json={
                "name": "TEST_Player_B", "jersey_number": 98, "position": "Defans"
            })
            TestContracts.second_player_id = r2.json()["id"]

        start = datetime.now(timezone.utc).date()
        end = start + timedelta(days=60)  # within 90 days
        r = client.post(f"{BASE_URL}/api/admin/player_contracts", json={
            "player_id": TestContracts.second_player_id,
            "contract_type": "season",
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "total_amount": 100000
        })
        assert r.status_code == 200
        TestContracts.second_contract_id = r.json()["id"]

        # Fetch list, verify our 60-day contract is present with end_date in 90 days
        r = client.get(f"{BASE_URL}/api/admin/player_contracts")
        assert r.status_code == 200
        contracts = r.json()
        cutoff = (start + timedelta(days=90)).isoformat()
        expiring = [c for c in contracts if c.get("end_date") and c["end_date"] <= cutoff]
        assert len(expiring) >= 1

    def test_cleanup_contracts(self, client):
        for pid in TestContracts.payment_ids:
            client.delete(f"{BASE_URL}/api/admin/player_payments/{pid}")
        if TestContracts.contract_id:
            client.delete(f"{BASE_URL}/api/admin/player_contracts/{TestContracts.contract_id}")
        if TestContracts.second_contract_id:
            client.delete(f"{BASE_URL}/api/admin/player_contracts/{TestContracts.second_contract_id}")


# ───────── Match Analysis (AI) ─────────
class TestMatchAnalysis:
    test_match_id = None

    def test_create_upcoming_match(self, client):
        # Create a dedicated upcoming match to analyze
        future = (datetime.now(timezone.utc).date() + timedelta(days=5)).isoformat()
        r = client.post(f"{BASE_URL}/api/admin/matches", json={
            "home_team": "Livanespor",
            "away_team": "TEST_Opponent FC",
            "match_date": future,
            "status": "upcoming",
            "competition": "Test Ligi",
            "venue": "Test Sahası"
        })
        assert r.status_code == 200, r.text
        TestMatchAnalysis.test_match_id = r.json()["id"]

    def test_upcoming_endpoint_no_report(self, client):
        r = client.get(f"{BASE_URL}/api/admin/match-analysis/upcoming/next")
        assert r.status_code == 200
        d = r.json()
        assert "match" in d
        assert "report" in d

    def test_get_empty_before_generate(self, client):
        r = client.get(f"{BASE_URL}/api/admin/match-analysis/{TestMatchAnalysis.test_match_id}")
        assert r.status_code == 200
        assert r.json() == {}

    def test_generate_report(self, client):
        # Ensure credit balance is sufficient
        sub = client.get(f"{BASE_URL}/api/admin/subscription").json()
        balance_before = sub.get("credit_balance", 0)
        if balance_before < 1:
            # Top up
            r = client.post(f"{BASE_URL}/api/admin/subscription/credit-adjust", json={"delta": 5, "reason": "TEST_topup"})
            assert r.status_code == 200
            balance_before = r.json().get("credit_balance", 0)

        r = client.post(f"{BASE_URL}/api/admin/match-analysis/generate",
                        json={"match_id": TestMatchAnalysis.test_match_id}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "content_markdown" in d
        assert len(d["content_markdown"]) > 100
        assert d["opponent_name"]
        assert d["credits_used"] == 1

        sub2 = client.get(f"{BASE_URL}/api/admin/subscription").json()
        assert sub2.get("credit_balance", 0) == balance_before - 1

    def test_get_cached_report_idempotent(self, client):
        sub = client.get(f"{BASE_URL}/api/admin/subscription").json()
        balance_before = sub.get("credit_balance", 0)
        r = client.get(f"{BASE_URL}/api/admin/match-analysis/{TestMatchAnalysis.test_match_id}")
        assert r.status_code == 200
        assert r.json().get("content_markdown")
        sub2 = client.get(f"{BASE_URL}/api/admin/subscription").json()
        # GET shouldn't consume credit
        assert sub2.get("credit_balance", 0) == balance_before

        # Regenerate on existing returns the same (cached) report without consuming credit
        r2 = client.post(f"{BASE_URL}/api/admin/match-analysis/generate",
                         json={"match_id": TestMatchAnalysis.test_match_id}, timeout=30)
        assert r2.status_code == 200
        sub3 = client.get(f"{BASE_URL}/api/admin/subscription").json()
        assert sub3.get("credit_balance", 0) == balance_before

    def test_auto_reset_on_finished(self, client):
        # PUT match status = finished
        r = client.put(f"{BASE_URL}/api/admin/matches/{TestMatchAnalysis.test_match_id}",
                       json={"status": "finished", "home_score": 2, "away_score": 1})
        assert r.status_code == 200
        # GET analysis should be empty
        r2 = client.get(f"{BASE_URL}/api/admin/match-analysis/{TestMatchAnalysis.test_match_id}")
        assert r2.status_code == 200
        assert r2.json() == {}

        # upcoming/next should not list this match, and report should be cleaned
        r3 = client.get(f"{BASE_URL}/api/admin/match-analysis/upcoming/next")
        assert r3.status_code == 200

    def test_cleanup_match(self, client):
        if TestMatchAnalysis.test_match_id:
            client.delete(f"{BASE_URL}/api/admin/matches/{TestMatchAnalysis.test_match_id}")
