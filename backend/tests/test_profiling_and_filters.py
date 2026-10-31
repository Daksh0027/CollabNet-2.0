"""Tests for Creator & Sponsor Profiling, stats matrix, and compound search filters."""
import os
import pytest
import requests

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


def test_creator_filters_commercial_terms_and_sorting(client):
    """Verify commercial terms filtering and sorting options."""
    login(client, "company")

    # Commercial term
    res = client.get(f"{BASE_URL}/api/creators", params={"commercial_term": "Organic Posting Only"}, timeout=20)
    assert res.status_code == 200
    organic_creators = res.json()
    assert len(organic_creators) >= 1
    assert any(c["display_name"] == "Dario Velez" for c in organic_creators)

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


def test_campaigns_search_and_filters_with_company_stats(client):
    """Verify GET /api/campaigns returns enriched company stats and supports filters."""
    login(client, "creator")

    # Basic listing
    res = client.get(f"{BASE_URL}/api/campaigns", timeout=20)
    assert res.status_code == 200
    camps = res.json()
    assert len(camps) >= 3
    first_co = camps[0]["company"]
    assert "industry" in first_co
    assert "total_spend" in first_co
    assert "commercial_terms" in first_co

    # Filter campaigns by niche
    res = client.get(f"{BASE_URL}/api/campaigns", params={"niche": "Fitness"}, timeout=20)
    assert res.status_code == 200
    fit_camps = res.json()
    assert len(fit_camps) >= 1
    assert all(any("Fitness" in n for n in c["niches"]) for c in fit_camps)

    # Filter campaigns by budget
    res = client.get(f"{BASE_URL}/api/campaigns", params={"min_budget": 5000}, timeout=20)
    assert res.status_code == 200
    budget_camps = res.json()
    assert len(budget_camps) >= 1
    assert all(c["budget_max"] >= 5000 for c in budget_camps)


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
