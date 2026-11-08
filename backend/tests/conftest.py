import os
import sys
import pytest
import requests

# Ensure backend root is on sys.path for all workers
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")


def login(client: requests.Session, role: str, email: str = None) -> dict:
    """Log in as a demo user (creator or company) and return user payload."""
    payload = {"role": role}
    if email:
        payload["email"] = email
    res = client.post(f"{BASE_URL}/api/auth/demo", json=payload, timeout=20)
    assert res.status_code == 200, f"Demo login failed: {res.text}"
    return res.json()


@pytest.fixture
def base_url():
    return BASE_URL


@pytest.fixture
def client():
    session = requests.Session()
    yield session
    session.close()


@pytest.fixture
def creator_session(client):
    login(client, "creator")
    return client


@pytest.fixture
def company_session(client):
    login(client, "company")
    return client


@pytest.fixture
def creator_client():
    session = requests.Session()
    login(session, "creator")
    yield session
    session.close()


@pytest.fixture
def company_client():
    session = requests.Session()
    login(session, "company")
    yield session
    session.close()


@pytest.fixture
def creator_user(creator_client):
    res = creator_client.get(f"{BASE_URL}/api/auth/me", timeout=20)
    assert res.status_code == 200
    return res.json()


@pytest.fixture
def company_user(company_client):
    res = company_client.get(f"{BASE_URL}/api/auth/me", timeout=20)
    assert res.status_code == 200
    return res.json()
