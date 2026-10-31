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


def test_creator_collaborator_requests_saved_creators_and_privacy(client):
    user = login(client, "creator")
    creators = client.get(f"{BASE_URL}/api/creators", timeout=20)
    assert creators.status_code == 200
    available = creators.json()
    assert all(creator["user_id"] != user["user_id"] for creator in available)
    assert available
    target_id = available[0]["user_id"]

    profile = client.get(f"{BASE_URL}/api/users/{target_id}", timeout=20)
    assert profile.status_code == 200
    assert "email" not in profile.json()
    assert "rates" not in profile.json().get("creator", {})

    saved = client.post(
        f"{BASE_URL}/api/saved-creators",
        json={"creator_id": target_id},
        timeout=20,
    )
    assert saved.status_code == 200
    saved_rows = client.get(f"{BASE_URL}/api/saved-creators", timeout=20).json()
    assert any(row["creator_id"] == target_id for row in saved_rows)
    removed = client.delete(f"{BASE_URL}/api/saved-creators/{target_id}", timeout=20)
    assert removed.status_code == 200

    request = client.post(
        f"{BASE_URL}/api/collaboration-requests",
        json={
            "to_id": target_id,
            "title": "Joint creator project",
            "collaboration_type": "Video collaboration",
            "message": "Would you like to work together?",
            "proposed_idea": "Create a joint short-form video.",
            "platform": "Instagram",
            "deliverables": ["One collaborative Reel"],
        },
        timeout=20,
    )
    assert request.status_code == 200, request.text
    request_id = request.json()["request_id"]
    assert request.json()["status"] == "pending"

    duplicate = client.post(
        f"{BASE_URL}/api/collaboration-requests",
        json={"to_id": target_id, "title": "Duplicate request"},
        timeout=20,
    )
    assert duplicate.status_code == 409
    sent = client.get(
        f"{BASE_URL}/api/collaboration-requests?direction=sent",
        timeout=20,
    )
    assert any(row["request_id"] == request_id for row in sent.json())

    withdrawn = client.post(
        f"{BASE_URL}/api/collaboration-requests/{request_id}/withdraw",
        timeout=20,
    )
    assert withdrawn.status_code == 200


def test_ai_endpoints_return_expected_disabled_response(client):
    login(client, "creator")
    response = client.post(f"{BASE_URL}/api/ai/draft", json={"kind": "outreach"}, timeout=20)
    assert response.status_code == 503
    assert "AI not configured" in response.json()["detail"]


def test_notifications_category_filtering(client):
    login(client, "company")
    all_notifs = client.get(f"{BASE_URL}/api/notifications", timeout=20)
    assert all_notifs.status_code == 200
    data = all_notifs.json()
    assert "counts" in data
    assert data["counts"]["all"] >= data["counts"]["creators"] + data["counts"]["companies"]
    assert data["counts"]["creators"] > 0
    assert data["counts"]["companies"] > 0

    creator_notifs = client.get(f"{BASE_URL}/api/notifications?origin=creators", timeout=20).json()
    assert all(n["origin"] == "creator" for n in creator_notifs["notifications"])

    company_notifs = client.get(f"{BASE_URL}/api/notifications?origin=companies", timeout=20).json()
    assert all(n["origin"] == "company" for n in company_notifs["notifications"])
