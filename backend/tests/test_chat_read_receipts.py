"""Comprehensive tests for chat read receipts, unread badges, and delivery status."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")


@pytest.fixture
def creator_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/demo", json={"role": "creator"}, timeout=20)
    assert r.status_code == 200, r.text
    return s, r.json()


@pytest.fixture
def company_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/demo", json={"role": "company"}, timeout=20)
    assert r.status_code == 200, r.text
    return s, r.json()


def test_thread_list_contains_read_receipt_metadata(creator_session):
    client, user = creator_session
    res = client.get(f"{BASE_URL}/api/threads", timeout=20)
    assert res.status_code == 200
    threads = res.json()
    assert len(threads) >= 1

    for t in threads:
        assert "thread_id" in t
        assert "participants" in t
        assert "reads" in t
        assert "unread" in t
        assert isinstance(t["unread"], int)
        assert "last_sender_id" in t
        assert "other" in t
        assert "display_name" in t["other"]


def test_read_receipt_lifecycle_between_company_and_creator(creator_session, company_session):
    c_client, creator = creator_session
    co_client, company = company_session

    c_id = creator["user_id"]
    co_id = company["user_id"]
    tid = "::".join(sorted([c_id, co_id]))

    # Step 1: Company sends a new message to Creator
    msg_text = f"Automated test proposal text {os.urandom(4).hex()}"
    send_res = co_client.post(f"{BASE_URL}/api/threads/{tid}", json={"text": msg_text}, timeout=20)
    assert send_res.status_code == 200
    sent_msg = send_res.json()
    assert sent_msg["text"] == msg_text
    assert sent_msg["sender_id"] == co_id

    # Step 2: Company checks threads list -> unread is 0 for sender, but recipient hasn't read it
    co_threads_res = co_client.get(f"{BASE_URL}/api/threads", timeout=20)
    assert co_threads_res.status_code == 200
    co_thread = next(t for t in co_threads_res.json() if t["thread_id"] == tid)
    assert co_thread["last_message"] == msg_text
    assert co_thread["last_sender_id"] == co_id
    assert co_thread["unread"] == 0
    # Creator hasn't read this new message yet
    c_last_read = co_thread["reads"].get(c_id, "")
    assert c_last_read < sent_msg["created_at"], "Creator read timestamp should be prior to newly sent message"

    # Step 3: Creator checks threads list -> Creator MUST see unread >= 1
    c_threads_res = c_client.get(f"{BASE_URL}/api/threads", timeout=20)
    assert c_threads_res.status_code == 200
    c_thread = next(t for t in c_threads_res.json() if t["thread_id"] == tid)
    assert c_thread["unread"] >= 1, f"Expected at least 1 unread message for creator, got {c_thread['unread']}"
    assert c_thread["last_sender_id"] == co_id

    # Step 4: Creator opens the thread -> marks as read
    detail_res = c_client.get(f"{BASE_URL}/api/threads/{tid}", timeout=20)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert any(m["msg_id"] == sent_msg["msg_id"] for m in detail["messages"])
    updated_c_read = detail["thread"]["reads"].get(c_id, "")
    assert updated_c_read >= sent_msg["created_at"], "Opening thread must update creator read timestamp"

    # Step 5: Creator re-checks threads list -> unread count is now 0
    c_threads_res2 = c_client.get(f"{BASE_URL}/api/threads", timeout=20)
    c_thread2 = next(t for t in c_threads_res2.json() if t["thread_id"] == tid)
    assert c_thread2["unread"] == 0, f"Unread count should be 0 after reading, got {c_thread2['unread']}"

    # Step 6: Company re-checks threads -> confirms creator has read the message (green double check)
    co_threads_res2 = co_client.get(f"{BASE_URL}/api/threads", timeout=20)
    co_thread2 = next(t for t in co_threads_res2.json() if t["thread_id"] == tid)
    final_c_read = co_thread2["reads"].get(c_id, "")
    assert final_c_read >= sent_msg["created_at"], "Sender must see that recipient read timestamp is >= message timestamp"


def test_bidirectional_read_receipt_reply(creator_session, company_session):
    c_client, creator = creator_session
    co_client, company = company_session

    c_id = creator["user_id"]
    co_id = company["user_id"]
    tid = "::".join(sorted([c_id, co_id]))

    # Creator sends reply to Company
    reply_text = f"Creator reply confirming deliverables {os.urandom(4).hex()}"
    send_reply = c_client.post(f"{BASE_URL}/api/threads/{tid}", json={"text": reply_text}, timeout=20)
    assert send_reply.status_code == 200
    reply_msg = send_reply.json()

    # Company checks threads list -> Company has unread >= 1
    co_threads = co_client.get(f"{BASE_URL}/api/threads", timeout=20).json()
    co_thread = next(t for t in co_threads if t["thread_id"] == tid)
    assert co_thread["unread"] >= 1
    assert co_thread["last_sender_id"] == c_id

    # Company opens the thread -> clears unread
    co_detail = co_client.get(f"{BASE_URL}/api/threads/{tid}", timeout=20).json()
    assert co_detail["thread"]["reads"].get(co_id, "") >= reply_msg["created_at"]

    # Company checks threads list again -> unread is 0
    co_threads_after = co_client.get(f"{BASE_URL}/api/threads", timeout=20).json()
    co_thread_after = next(t for t in co_threads_after if t["thread_id"] == tid)
    assert co_thread_after["unread"] == 0


def test_send_attachment_and_voice_note_messages(creator_session, company_session):
    c_client, creator = creator_session
    co_client, company = company_session

    c_id = creator["user_id"]
    co_id = company["user_id"]
    tid = "::".join(sorted([c_id, co_id]))

    # 1. Send file attachment
    attachment = {
        "name": "Campaign_Brief_v2.pdf",
        "size": 1048576,
        "type": "application/pdf",
        "data_url": "data:application/pdf;base64,JVBERi0xLjQK..."
    }
    att_res = c_client.post(f"{BASE_URL}/api/threads/{tid}", json={
        "text": "Here is the signed brief document",
        "attachments": [attachment]
    }, timeout=20)
    assert att_res.status_code == 200
    att_msg = att_res.json()
    assert len(att_msg["attachments"]) == 1
    assert att_msg["attachments"][0]["name"] == "Campaign_Brief_v2.pdf"

    # 2. Send voice note
    voice_res = c_client.post(f"{BASE_URL}/api/threads/{tid}", json={
        "audio_url": "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8USA...",
        "audio_duration": 4.5
    }, timeout=20)
    assert voice_res.status_code == 200
    voice_msg = voice_res.json()
    assert voice_msg["audio_url"].startswith("data:audio/webm")
    assert voice_msg["audio_duration"] == 4.5

    # 3. Check thread preview reflects the voice note as latest
    threads_res = c_client.get(f"{BASE_URL}/api/threads", timeout=20)
    t = next(item for item in threads_res.json() if item["thread_id"] == tid)
    assert "Voice message" in t["last_message"]
