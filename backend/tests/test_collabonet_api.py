"""Regression coverage for CollaboNet auth, seeded marketplace data, and AI-off behavior."""
import os

import pytest
import requests


BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


@pytest.fixture
def client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def login(client, role):
    response = client.post(f"{BASE_URL}/api/auth/demo", json={"role": role}, timeout=20)
    assert response.status_code == 200, response.text
    return response.json()


def test_auth_guard_and_ai_status(client):
    unauth = client.get(f"{BASE_URL}/api/auth/me", timeout=20)
    assert unauth.status_code == 401
    status = client.get(f"{BASE_URL}/api/ai/status", timeout=20)
    assert status.status_code == 200
    assert status.json()["configured"] is False


def test_creator_seed_overview_campaigns_and_filter(client):
    user = login(client, "creator")
    assert user["email"] == "maya.chen@collabonet.demo"
    overview = client.get(f"{BASE_URL}/api/overview", timeout=20)
    assert overview.status_code == 200
    assert overview.json()["role"] == "creator"
    campaigns = client.get(f"{BASE_URL}/api/campaigns", timeout=20)
    assert campaigns.status_code == 200
    assert len(campaigns.json()) >= 3
    apps = client.get(f"{BASE_URL}/api/applications", timeout=20)
    assert apps.status_code == 200
    # Seed intentionally gives the invitation to Jonas, not Maya.
    assert not any(a["type"] == "invitation" for a in apps.json())


def test_company_creator_search_and_seed_connections(client):
    user = login(client, "company")
    assert user["email"] == "elena.brand@collabonet.demo"
    creators = client.get(
        f"{BASE_URL}/api/creators",
        params={"platform": "Instagram", "min_followers": 100000},
        timeout=20,
    )
    assert creators.status_code == 200
    assert len(creators.json()) >= 3
    assert all(any(p["platform"] == "Instagram" for p in c["platforms"]) for c in creators.json())
    connections = client.get(f"{BASE_URL}/api/connections?status=accepted", timeout=20)
    assert connections.status_code == 200
    assert any(c["other"]["display_name"] == "Maya Chen" for c in connections.json())


def test_ai_endpoints_return_expected_disabled_response(client):
    login(client, "creator")
    response = client.post(f"{BASE_URL}/api/ai/draft", json={"kind": "outreach"}, timeout=20)
    assert response.status_code == 503
    assert "AI not configured" in response.json()["detail"]