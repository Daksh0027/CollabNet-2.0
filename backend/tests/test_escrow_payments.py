"""Escrow checkout authorization, idempotency surfaces, and seeded contract states."""
import os

import pytest
import requests


BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


@pytest.fixture
def company_client():
    client = requests.Session()
    response = client.post(f"{BASE_URL}/api/auth/demo", json={"role": "company"}, timeout=30)
    assert response.status_code == 200, response.text
    return client


@pytest.fixture
def creator_client():
    client = requests.Session()
    response = client.post(f"{BASE_URL}/api/auth/demo", json={"role": "creator"}, timeout=30)
    assert response.status_code == 200, response.text
    return client


def seeded_deals(client):
    response = client.get(f"{BASE_URL}/api/contracts", timeout=30)
    assert response.status_code == 200, response.text
    return {deal["title"]: deal for deal in response.json()}


def test_seeded_escrow_contract_states(company_client):
    deals = seeded_deals(company_client)
    launch = deals["Launch Week Sprint"]
    marathon = deals["Marathon Expo Booth"]
    assert launch["status"] == "in_review"
    assert launch["funding_status"] == "unfunded"
    assert marathon["status"] == "completed"
    assert marathon["funding_status"] == "released"


def test_creator_cannot_create_checkout(creator_client, company_client):
    deal = seeded_deals(company_client)["Launch Week Sprint"]
    response = creator_client.post(
        f"{BASE_URL}/api/payments/checkout/{deal['deal_id']}",
        json={"origin_url": BASE_URL},
        timeout=45,
    )
    assert response.status_code == 404
    assert "Deal not found" in response.json()["detail"]


def test_double_fund_guard_on_released_deal(company_client):
    deal = seeded_deals(company_client)["Marathon Expo Booth"]
    response = company_client.post(
        f"{BASE_URL}/api/payments/checkout/{deal['deal_id']}",
        json={"origin_url": BASE_URL},
        timeout=30,
    )
    assert response.status_code == 400
    assert "already released" in response.json()["detail"]


def test_payment_status_unknown_session_is_not_silent(company_client):
    response = company_client.get(f"{BASE_URL}/api/payments/status/e2e_unknown_session", timeout=30)
    assert response.status_code == 404
    assert response.json()["detail"] == "Transaction not found"