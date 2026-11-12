import pytest
from conftest import BASE_URL, login


def test_notification_auth_protection(client):
    """Unauthenticated requests must be rejected with 401."""
    res = client.get(f"{BASE_URL}/api/notifications", timeout=20)
    assert res.status_code == 401

    res_post = client.post(f"{BASE_URL}/api/notifications/read", timeout=20)
    assert res_post.status_code == 401


def test_notification_category_breakdown_and_filtering(company_client):
    """Test category breakdown (all, creators, companies) and unread counters."""
    res = company_client.get(f"{BASE_URL}/api/notifications", timeout=20)
    assert res.status_code == 200
    data = res.json()

    assert "notifications" in data
    assert "counts" in data
    assert "unread" in data
    assert "unread_counts" in data
    assert all(n.get("type") != "message" for n in data["notifications"])

    counts = data["counts"]
    assert counts["all"] >= counts["creators"] + counts["companies"]
    assert counts["creators"] > 0
    assert counts["companies"] > 0

    # Filter: creators
    res_creators = company_client.get(f"{BASE_URL}/api/notifications?origin=creators", timeout=20)
    assert res_creators.status_code == 200
    creators_data = res_creators.json()
    assert all(n["origin"] == "creator" for n in creators_data["notifications"])
    assert all(n.get("type") != "message" for n in creators_data["notifications"])

    # Filter: companies
    res_companies = company_client.get(f"{BASE_URL}/api/notifications?origin=companies", timeout=20)
    assert res_companies.status_code == 200
    companies_data = res_companies.json()
    assert all(n["origin"] == "company" for n in companies_data["notifications"])
    assert all(n.get("type") != "message" for n in companies_data["notifications"])


def test_mark_single_notification_read(client):
    """Marking an individual notification as read updates its status."""
    login(client, "creator", email="priya.nair@collabonet.demo")
    res = client.get(f"{BASE_URL}/api/notifications", timeout=20)
    assert res.status_code == 200
    notifications = res.json()["notifications"]

    target = notifications[0]
    notif_id = target["notif_id"]
    res_read = client.post(f"{BASE_URL}/api/notifications/{notif_id}/read", timeout=20)
    assert res_read.status_code == 200
    assert res_read.json() == {"ok": True}

    res_after = client.get(f"{BASE_URL}/api/notifications", timeout=20)
    updated = next(n for n in res_after.json()["notifications"] if n["notif_id"] == notif_id)
    assert updated["read"] is True


def test_mark_all_notifications_read(client):
    """Batch-marking notifications as read zeroes unread counters."""
    login(client, "creator", email="priya.nair@collabonet.demo")
    res_read_all = client.post(f"{BASE_URL}/api/notifications/read", timeout=20)
    assert res_read_all.status_code == 200
    assert res_read_all.json() == {"ok": True}

    res_after = client.get(f"{BASE_URL}/api/notifications", timeout=20)
    data = res_after.json()
    assert data["unread"] == 0
    assert data["unread_counts"]["all"] == 0


def test_notification_pagination(client):
    """Pagination responds with next_offset and has_more flags."""
    login(client, "creator", email="priya.nair@collabonet.demo")
    page_1 = client.get(f"{BASE_URL}/api/notifications?offset=0&limit=2", timeout=20)
    assert page_1.status_code == 200
    p1_data = page_1.json()

    assert len(p1_data["notifications"]) == 2
    assert p1_data["has_more"] is True
    assert p1_data["next_offset"] == 2

    page_2 = client.get(
        f"{BASE_URL}/api/notifications?offset={p1_data['next_offset']}&limit=2",
        timeout=20,
    )
    assert page_2.status_code == 200
    p2_data = page_2.json()
    assert len(p2_data["notifications"]) == 2

    # Verify disjoint pages
    p1_ids = {n["notif_id"] for n in p1_data["notifications"]}
    p2_ids = {n["notif_id"] for n in p2_data["notifications"]}
    assert p1_ids.isdisjoint(p2_ids)
