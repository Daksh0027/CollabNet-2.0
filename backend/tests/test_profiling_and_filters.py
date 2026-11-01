"""Tests for Creator & Sponsor Profiling, stats matrix, and compound search filters."""
import os
import pytest
import requests
from pymongo import MongoClient
from uuid import uuid4

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")


@pytest.fixture
def client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def login(client, role):
    response = client.post(f"{BASE_URL}/api/auth/demo", json={"role": role}, timeout=20)
    assert response.status_code == 200, response.text
    return response.json()


def test_creators_profiling_stats_returned(client):
    """Verify that listing creators returns all enriched stats, platforms metrics, and tags."""
    login(client, "company")
    res = client.get(f"{BASE_URL}/api/creators", timeout=20)
    assert res.status_code == 200
    creators = res.json()
    assert len(creators) >= 6

    # Verify structure of first creator (e.g. Maya Chen)
    maya = next((c for c in creators if c["display_name"] == "Maya Chen"), None)
    assert maya is not None
    assert maya["niche"] == "Tech & Gadgets"
    assert "Smart Home" in maya["sub_niches"]
    assert "Dedicated Long-Form Video" in maya["content_types"]
    assert "Short-Form Video" in maya["content_types"]
    assert "100% Escrow Upfront" in maya["commercial_terms"]
    assert maya["top_followers"] >= 800000
    assert maya["total_reach"] >= 900000
    assert maya["avg_views"] >= 200000
    assert maya["engagement_rate"] >= 4.5
    assert maya["connections_count"] >= 1
    assert maya["completed_deals_count"] >= 1
    assert maya["on_time_delivery_rate"] >= 95.0

    # Verify platform details have post counts and views
    yt_plat = next((p for p in maya["platforms"] if p["platform"] == "YouTube"), None)
    assert yt_plat is not None
    assert yt_plat["posts_count"] > 0
    assert yt_plat["avg_views"] > 0
    assert yt_plat["engagement_rate"] > 0


def test_creator_filters_niche_and_content_type(client):
    """Verify multi-niche and content-type filtering."""
    login(client, "company")
    
    # Filter by single niche
    res = client.get(f"{BASE_URL}/api/creators", params={"niche": "Gaming"}, timeout=20)
    assert res.status_code == 200
    gaming_creators = res.json()
    assert len(gaming_creators) >= 1
    assert all("Gaming" in c["niche"] or "Gaming" in " ".join(c.get("sub_niches", [])) for c in gaming_creators)

    # Filter by content type
    res = client.get(f"{BASE_URL}/api/creators", params={"content_type": "Live Stream Placement"}, timeout=20)
    assert res.status_code == 200
    stream_creators = res.json()
    assert len(stream_creators) >= 1
    assert any(c["display_name"] == "Leo Tanaka" for c in stream_creators)
    assert all("Live Stream Placement" in c["content_types"] for c in stream_creators)


def test_creator_filters_numeric_metrics(client):
    """Verify numeric range filters: followers, avg views, engagement, min connections."""
    login(client, "company")

    # Min views filter
    res = client.get(f"{BASE_URL}/api/creators", params={"min_views": 200000}, timeout=20)
    assert res.status_code == 200
    high_view_creators = res.json()
    assert len(high_view_creators) >= 2
    assert all(c["avg_views"] >= 200000 for c in high_view_creators)

    # Min engagement filter
    res = client.get(f"{BASE_URL}/api/creators", params={"min_engagement": 6.5}, timeout=20)
    assert res.status_code == 200
    high_eng_creators = res.json()
    assert len(high_eng_creators) >= 2
    assert all(c["engagement_rate"] >= 6.5 for c in high_eng_creators)

    # Min connections filter
    res = client.get(f"{BASE_URL}/api/creators", params={"min_connections": 2}, timeout=20)
    assert res.status_code == 200
    conn_creators = res.json()
    assert all(c["connections_count"] >= 2 for c in conn_creators)


def test_creator_filters_upper_metric_bounds_and_location(client):
    """Upper bounds and location filters return matching, known creator data."""
    login(client, "company")
    res = client.get(
        f"{BASE_URL}/api/creators",
        params={
            "location": "Austin",
            "max_followers": 900000,
            "max_views": 250000,
            "max_engagement": 5.2,
        },
        timeout=20,
    )
    assert res.status_code == 200
    creators = res.json()
    maya = next((creator for creator in creators if creator["display_name"] == "Maya Chen"), None)
    assert maya is not None
    assert all("austin" in creator["location"].lower() for creator in creators)
    assert all(creator["top_followers"] <= 900000 for creator in creators)
    assert all(creator["avg_views"] <= 250000 for creator in creators)
    assert all(creator["engagement_rate"] <= 5.2 for creator in creators)


def test_creator_filters_sorting(client):
    """Verify supported creator sort options."""
    login(client, "company")

    # Sort by views
    res = client.get(f"{BASE_URL}/api/creators", params={"sort_by": "views"}, timeout=20)
    assert res.status_code == 200
    sorted_views = res.json()
    for i in range(len(sorted_views) - 1):
        assert sorted_views[i]["avg_views"] >= sorted_views[i+1]["avg_views"]

    # Sort by engagement
    res = client.get(f"{BASE_URL}/api/creators", params={"sort_by": "engagement"}, timeout=20)
    assert res.status_code == 200
    sorted_eng = res.json()
    for i in range(len(sorted_eng) - 1):
        assert sorted_eng[i]["engagement_rate"] >= sorted_eng[i+1]["engagement_rate"]


def test_creator_discovery_pages_beyond_legacy_limit_and_aggregates_uncapped_stats(client):
    mongo_url = os.environ.get("MONGO_URL")
    database_name = os.environ.get("DB_NAME")
    if not mongo_url or not database_name:
        pytest.skip("This integration test requires the backend MongoDB configuration.")

    login(client, "company")
    test_run_id = uuid4().hex
    creator_ids = [f"discovery_perf_{test_run_id}_{index:03d}" for index in range(505)]
    users = [
        {
            "user_id": creator_id,
            "name": creator_id,
            "role": "creator",
            "verified": True,
            "creator": {
                "niche": "Discovery performance fixture",
                "sub_niches": [],
                "content_types": [],
                "platforms": [{
                    "platform": "YouTube",
                    "followers": 2_000_000 + index,
                    "avg_views": 200_000,
                    "engagement_rate": 4.2,
                }],
                "projects": [],
            },
        }
        for index, creator_id in enumerate(creator_ids)
    ]
    client_db = MongoClient(mongo_url)[database_name]
    try:
        client_db.users.insert_many(users)
        target_creator_id = creator_ids[0]
        client_db.connections.insert_many([
            {
                "discovery_test_id": test_run_id,
                "status": "accepted",
                "from_id": target_creator_id,
                "to_id": f"external_{index}",
            }
            for index in range(10_005)
        ])
        client_db.contracts.insert_many([
            {
                "discovery_test_id": test_run_id,
                "status": "completed",
                "creator_id": target_creator_id,
            }
            for _ in range(5_005)
        ])
        client_db.reviews.insert_many([
            {
                "discovery_test_id": test_run_id,
                "status": "approved",
                "reviewee_id": target_creator_id,
                "rating": 4.2,
            }
            for _ in range(5_005)
        ])

        first_page = client.get(
            f"{BASE_URL}/api/creators",
            params={
                "niche": "Discovery performance fixture",
                "limit": 500,
            },
            timeout=60,
        )
        assert first_page.status_code == 200, first_page.text
        assert len(first_page.json()) == 100

        last_page = client.get(
            f"{BASE_URL}/api/creators",
            params={
                "niche": "Discovery performance fixture",
                "offset": 500,
                "limit": 500,
            },
            timeout=60,
        )
        assert last_page.status_code == 200, last_page.text
        results = last_page.json()
        assert len(results) == 5
        assert [creator["user_id"] for creator in results] == list(reversed(creator_ids[:5]))

        tail_creator = next(
            creator for creator in results
            if creator["user_id"] == target_creator_id
        )
        assert tail_creator["connections_count"] == 10_005
        assert tail_creator["completed_deals_count"] == 5_005
        assert tail_creator["review_count"] == 5_005
        assert tail_creator["rating_avg"] == 4.2
    finally:
        client_db.users.delete_many({"user_id": {"$in": creator_ids}})
        client_db.connections.delete_many({"discovery_test_id": test_run_id})
        client_db.contracts.delete_many({"discovery_test_id": test_run_id})
        client_db.reviews.delete_many({"discovery_test_id": test_run_id})
        client_db.client.close()


def test_public_user_profile_detail_stats(client):
    """Verify GET /api/users/{user_id} returns connection count and deals count."""
    login(client, "company")
    creators = client.get(f"{BASE_URL}/api/creators", timeout=20).json()
    first_id = creators[0]["user_id"]

    res = client.get(f"{BASE_URL}/api/users/{first_id}", timeout=20)
    assert res.status_code == 200
    profile = res.json()
    assert "connections_count" in profile
    assert "completed_deals_count" in profile
    assert "rating_avg" in profile
    assert profile["user_id"] == first_id


def test_creator_rates_are_private_in_discovery_and_public_profiles(client):
    """Private baseline rates stay visible to their owner only."""
    login(client, "company")
    creators = client.get(f"{BASE_URL}/api/creators", timeout=20).json()
    maya = next(creator for creator in creators if creator["display_name"] == "Maya Chen")
    assert "rates" not in maya
    assert "rate_from" not in maya
    assert "rates" not in maya["creator"]

    public_profile = client.get(f"{BASE_URL}/api/users/{maya['user_id']}", timeout=20).json()
    assert "rates" not in public_profile["creator"]

    login(client, "creator")
    owner_profile = client.get(f"{BASE_URL}/api/auth/me", timeout=20).json()
    assert owner_profile["creator"]["rates"]


def test_campaigns_search_filters_and_public_budget_privacy(client):
    """Campaign search uses supported profile data and does not expose private budgets."""
    login(client, "creator")

    # Basic listing
    res = client.get(f"{BASE_URL}/api/campaigns", timeout=20)
    assert res.status_code == 200
    camps = res.json()
    assert len(camps) >= 3
    first_co = camps[0]["company"]
    assert "industry" in first_co
    assert "total_spend" not in first_co
    assert "commercial_terms" not in first_co
    assert "budget_min" not in camps[0]
    assert "budget_max" not in camps[0]

    # Filter campaigns by niche
    res = client.get(f"{BASE_URL}/api/campaigns", params={"niche": "Fitness"}, timeout=20)
    assert res.status_code == 200
    fit_camps = res.json()
    assert len(fit_camps) >= 1
    assert all(any("Fitness" in n for n in c["niches"]) for c in fit_camps)

    # Recommendations are constrained to the creator's actual niche.
    res = client.get(f"{BASE_URL}/api/campaigns", params={"recommended": 1}, timeout=20)
    assert res.status_code == 200
    recommended = res.json()
    assert len(recommended) >= 1
    assert all("Tech & Gadgets" in campaign["niches"] for campaign in recommended)


def test_creator_projects_github_fields_and_tag_search(client):
    """Verify projects contain GitHub-style fields: bio, genre, tags list, pinned, and search matches tags."""
    login(client, "company")
    res = client.get(f"{BASE_URL}/api/creators", timeout=20)
    assert res.status_code == 200
    creators = res.json()

    maya = next((c for c in creators if c["display_name"] == "Maya Chen"), None)
    assert maya is not None
    assert len(maya["projects"]) >= 2
    p1 = maya["projects"][0]
    assert "title" in p1
    assert "bio" in p1
    assert "genre" in p1
    assert "tags" in p1
    assert isinstance(p1["tags"], list)
    assert len(p1["tags"]) >= 3
    assert "Smart Home" in p1["tags"]
    assert p1.get("pinned") is True

    # Search by tag
    res_tag = client.get(f"{BASE_URL}/api/creators", params={"tag": "Ergonomics"}, timeout=20)
    assert res_tag.status_code == 200
    assert any(c["display_name"] == "Maya Chen" for c in res_tag.json())

    # Search keyword matching project tag
    res_search = client.get(f"{BASE_URL}/api/creators", params={"search": "Keyboards"}, timeout=20)
    assert res_search.status_code == 200
    assert any(c["display_name"] == "Maya Chen" for c in res_search.json())
