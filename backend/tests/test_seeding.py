import os
from pymongo import MongoClient
import requests
from conftest import BASE_URL

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://mongo:27017" if os.path.exists("/.dockerenv") else "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "collabonet")


def test_seeded_users_and_complete_profiles():
    """Verify seeded users contain rich profiles and valid roles."""
    db = MongoClient(MONGO_URL)[DB_NAME]
    users_count = db.users.count_documents({})
    assert users_count >= 9
    assert db.campaigns.count_documents({}) >= 3
    assert db.contracts.count_documents({}) >= 2
    assert db.notifications.count_documents({}) >= 10

    maya = db.users.find_one({"email": "maya.chen@collabonet.demo"}, {"_id": 0})
    assert maya is not None
    assert maya["role"] == "creator"
    creator_data = maya.get("creator", {})
    assert len(creator_data.get("sub_niches", [])) > 0
    assert len(creator_data.get("projects", [])) > 0
    assert len(creator_data.get("commercial_terms", [])) > 0
    assert len(creator_data.get("platforms", [])) > 0


def test_seeded_notifications_have_valid_origins():
    """All seeded notifications must carry an explicit valid origin token."""
    db = MongoClient(MONGO_URL)[DB_NAME]
    notifications = list(db.notifications.find({}, {"_id": 0, "origin": 1, "title": 1, "user_id": 1}))
    assert len(notifications) > 0
    for n in notifications:
        assert n.get("origin") in ("creator", "company", "system"), f"Invalid notification origin in {n}"


def test_seed_status_endpoint_or_health():
    """Verify API running and health check endpoint."""
    res = requests.get(f"{BASE_URL}/api/", timeout=20)
    assert res.status_code == 200
    assert res.json() == {"message": "CollaboNet API running"}
