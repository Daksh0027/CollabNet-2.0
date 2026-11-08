from typing import List, Optional
from core.database import db
from core.security import uid, now


def thread_id_for(a: str, b: str) -> str:
    return "::".join(sorted([a, b]))


async def ensure_thread(a: str, b: str) -> str:
    tid = thread_id_for(a, b)
    existing = await db.threads.find_one({"thread_id": tid}, {"_id": 0})
    if not existing:
        await db.threads.insert_one({
            "thread_id": tid,
            "participants": [a, b],
            "last_message": "",
            "last_at": now(),
            "reads": {a: now(), b: now()},
            "created_at": now(),
        })
    return tid


async def create_chat_message(
    thread_id: str,
    sender_id: str,
    text: str = "",
    attachments: Optional[List[dict]] = None,
    audio_url: str = "",
    audio_duration: float = 0,
) -> dict:
    clean_text = (text or "").strip()
    clean_attachments = attachments or []
    clean_audio = (audio_url or "").strip()

    if clean_text:
        preview = clean_text
    elif clean_audio:
        preview = "🎤 Voice message"
    elif clean_attachments:
        att_name = clean_attachments[0].get("name", "Document")
        preview = f"📎 {att_name}"
    else:
        preview = "Attachment"

    created_at = now()
    msg = {
        "msg_id": uid("msg"),
        "thread_id": thread_id,
        "sender_id": sender_id,
        "text": clean_text,
        "attachments": clean_attachments,
        "audio_url": clean_audio,
        "audio_duration": audio_duration or 0,
        "created_at": created_at,
    }
    await db.messages.insert_one(msg)
    msg.pop("_id", None)
    await db.threads.update_one(
        {"thread_id": thread_id},
        {"$set": {
            "last_message": preview[:120],
            "last_at": created_at,
            "last_sender_id": sender_id,
            f"reads.{sender_id}": created_at,
        }},
    )
    return msg


async def add_contract_chat_message(contract: dict, sender_id: str, text: str):
    thread_id = await ensure_thread(contract["company_id"], contract["creator_id"])
    return await create_chat_message(thread_id=thread_id, sender_id=sender_id, text=text)
