from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from core.config import AI_API_KEY, AI_MODEL
from core.database import db
from core.dependencies import get_user
from core.security import display_name
from services.ai_service import (
    benchmark_creator_rates,
    draft_outreach,
    summarize_messages,
)

router = APIRouter(tags=["ai"])


class SummarizeIn(BaseModel):
    thread_id: str


class DraftIn(BaseModel):
    kind: str
    to_id: str = ""
    context: str = ""


class BenchmarkIn(BaseModel):
    creator_id: str


@router.get("/ai/status")
async def ai_status():
    return {"configured": bool(AI_API_KEY), "model": AI_MODEL}


@router.post("/ai/summarize")
async def ai_summarize(payload: SummarizeIn, request: Request):
    user = await get_user(request)
    t = await db.threads.find_one({"thread_id": payload.thread_id}, {"_id": 0})
    if not t or user["user_id"] not in t["participants"]:
        raise HTTPException(404, "Thread not found")
    msgs = await db.messages.find({"thread_id": payload.thread_id}, {"_id": 0}).sort("created_at", -1).to_list(40)
    if not msgs:
        raise HTTPException(400, "Nothing to summarize yet")
    summary = await summarize_messages(msgs)
    return {"summary": summary}


@router.post("/ai/draft")
async def ai_draft(payload: DraftIn, request: Request):
    user = await get_user(request)
    to_u = await db.users.find_one({"user_id": payload.to_id}, {"_id": 0}) if payload.to_id else None
    who = display_name(to_u) if to_u else "the other party"
    text = await draft_outreach(
        sender_name=display_name(user),
        sender_role=user.get("role", "creator"),
        recipient_name=who,
        kind=payload.kind,
        context=payload.context,
    )
    return {"draft": text}


@router.post("/ai/benchmark")
async def ai_benchmark(payload: BenchmarkIn, request: Request):
    await get_user(request)
    u = await db.users.find_one({"user_id": payload.creator_id}, {"_id": 0})
    if not u or u.get("role") != "creator":
        raise HTTPException(404, "Creator not found")
    c = u.get("creator", {})
    return await benchmark_creator_rates(c)
