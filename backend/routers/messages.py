from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from core.database import db
from core.dependencies import enrich_user, get_user
from core.security import display_name, now
from services.chat_service import create_chat_message
from services.notification_service import notify

router = APIRouter(tags=["messages"])


class MsgIn(BaseModel):
    text: str = ""
    attachments: Optional[List[dict]] = None
    audio_url: Optional[str] = None
    audio_duration: Optional[float] = None


@router.get("/threads")
async def list_threads(request: Request):
    user = await get_user(request)
    docs = await db.threads.find({"participants": user["user_id"]}, {"_id": 0}).sort("last_at", -1).to_list(100)
    out = []
    for t in docs:
        other_id = next((p for p in t.get("participants", []) if p != user["user_id"]), "")
        other = await enrich_user(other_id) if other_id else None
        last_read = t.get("reads", {}).get(user["user_id"], "")
        unread = await db.messages.count_documents({
            "thread_id": t["thread_id"],
            "sender_id": {"$ne": user["user_id"]},
            "created_at": {"$gt": last_read},
        })
        last_sender_id = t.get("last_sender_id")
        if not last_sender_id:
            last_msg = await db.messages.find_one({"thread_id": t["thread_id"]}, sort=[("created_at", -1)])
            if last_msg:
                last_sender_id = last_msg.get("sender_id")
        out.append({**t, "other": other, "unread": unread, "last_sender_id": last_sender_id})
    return out


@router.get("/threads/{thread_id}")
async def get_thread(thread_id: str, request: Request):
    user = await get_user(request)
    t = await db.threads.find_one({"thread_id": thread_id}, {"_id": 0})
    if not t or user["user_id"] not in t.get("participants", []):
        raise HTTPException(404, "Thread not found")
    msgs = await db.messages.find({"thread_id": thread_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    current_time = now()
    await db.threads.update_one(
        {"thread_id": thread_id},
        {"$set": {f"reads.{user['user_id']}": current_time}},
    )
    if "reads" not in t:
        t["reads"] = {}
    t["reads"][user["user_id"]] = current_time
    other_id = next((p for p in t.get("participants", []) if p != user["user_id"]), "")
    return {"thread": t, "messages": msgs, "other": await enrich_user(other_id) if other_id else None}


@router.post("/threads/{thread_id}")
async def send_message(thread_id: str, payload: MsgIn, request: Request):
    user = await get_user(request)
    t = await db.threads.find_one({"thread_id": thread_id}, {"_id": 0})
    if not t or user["user_id"] not in t.get("participants", []):
        raise HTTPException(404, "Thread not found")

    clean_text = (payload.text or "").strip()
    clean_attachments = payload.attachments or []
    clean_audio = (payload.audio_url or "").strip()

    if not clean_text and not clean_attachments and not clean_audio:
        raise HTTPException(400, "Empty message")

    msg = await create_chat_message(
        thread_id=thread_id,
        sender_id=user["user_id"],
        text=clean_text,
        attachments=clean_attachments,
        audio_url=clean_audio,
        audio_duration=payload.audio_duration or 0,
    )

    other_id = next((p for p in t.get("participants", []) if p != user["user_id"]), "")
    if other_id:
        preview = clean_text or ("🎤 Voice message" if clean_audio else "📎 Attachment")
        await notify(
            other_id,
            "message",
            f"New message from {display_name(user)}",
            preview[:80],
            "/app/messages",
            origin=user.get("role", "creator"),
            actor_id=user["user_id"],
        )
    return msg
