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


def test_contract_history_exposes_legacy_contract_as_version_one(company_client):
    deal = seeded_deals(company_client)["Launch Week Sprint"]
    response = company_client.get(
        f"{BASE_URL}/api/contracts/{deal['deal_id']}/history", timeout=30
    )
    assert response.status_code == 200, response.text
    history = response.json()
    assert history["current_version"] == 1
    assert history["versions"][0]["version"] == 1
    assert history["versions"][0]["agreement_text"] == deal["agreement_text"]


def test_contract_revision_is_versioned_and_change_request_is_scoped(company_client):
    deal = seeded_deals(company_client)["Launch Week Sprint"]
    revision = company_client.post(
        f"{BASE_URL}/api/contracts/{deal['deal_id']}/revisions",
        json={
            "title": deal["title"],
            "deliverables": deal["deliverables"] + ["Campaign recap email"],
            "start_date": deal["start_date"],
            "end_date": deal["end_date"],
            "compensation": deal["compensation"] + 500,
            "agreement_text": deal["agreement_text"],
            "change_summary": "Added the campaign recap email.",
        },
        timeout=30,
    )
    assert revision.status_code == 200, revision.text
    version = revision.json()
    assert version["version"] == 2
    assert version["change_summary"] == "Added the campaign recap email."

    history = company_client.get(
        f"{BASE_URL}/api/contracts/{deal['deal_id']}/history", timeout=30
    ).json()
    assert history["current_version"] == 2
    assert [item["version"] for item in history["versions"]] == [1, 2]

    change = company_client.post(
        f"{BASE_URL}/api/contracts/{deal['deal_id']}/change-requests",
        json={"version": 2, "comment": "Please confirm the recap email audience."},
        timeout=30,
    )
    assert change.status_code == 200, change.text
    assert change.json()["status"] == "open"
    threads = company_client.get(f"{BASE_URL}/api/threads", timeout=30)
    assert threads.status_code == 200, threads.text
    assert any("Changes requested on contract v2" in thread["last_message"] for thread in threads.json())

    stale = company_client.post(
        f"{BASE_URL}/api/contracts/{deal['deal_id']}/change-requests",
        json={"version": 1, "comment": "This targets an old revision."},
        timeout=30,
    )
    assert stale.status_code == 409


def test_contract_history_rejects_empty_change_request_and_funded_revision(company_client):
    launch = seeded_deals(company_client)["Launch Week Sprint"]
    empty = company_client.post(
        f"{BASE_URL}/api/contracts/{launch['deal_id']}/change-requests",
        json={"version": 2, "comment": "   "},
        timeout=30,
    )
    assert empty.status_code == 400

    funded = seeded_deals(company_client)["Marathon Expo Booth"]
    revision = company_client.post(
        f"{BASE_URL}/api/contracts/{funded['deal_id']}/revisions",
        json={
            "title": funded["title"],
            "deliverables": funded["deliverables"],
            "compensation": funded["compensation"],
            "change_summary": "Attempt to edit a released deal.",
        },
        timeout=30,
    )
    assert revision.status_code == 400
    assert "amendment" in revision.json()["detail"]


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