from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from core.database import db
from core.dependencies import get_user
from core.security import now, uid
from services.notification_service import log_activity

router = APIRouter(tags=["calendar"])


class EventIn(BaseModel):
    title: str
    date: str
    type: str = "milestone"


@router.get("/events")
async def list_events(request: Request, month: str = ""):
    user = await get_user(request)
    q = {"participants": user["user_id"]}
    docs = await db.events.find(q, {"_id": 0}).sort("date", 1).to_list(300)
    if month:
        docs = [e for e in docs if e["date"].startswith(month)]
    return docs


@router.post("/events")
async def create_event(payload: EventIn, request: Request):
    user = await get_user(request)
    colors = {
        "campaign": "#1ED760",
        "meeting": "#4FC9D4",
        "shoot": "#7FE8CE",
        "milestone": "#D7F26B",
    }
    doc = {
        "event_id": uid("evt"),
        "title": payload.title,
        "date": payload.date,
        "type": payload.type if payload.type in colors else "milestone",
        "color": colors.get(payload.type, colors["milestone"]),
        "status": "scheduled",
        "deal_id": "",
        "participants": [user["user_id"]],
        "created_at": now(),
    }
    await db.events.insert_one(doc)
    doc.pop("_id", None)
    await log_activity(user["user_id"], f"Added a calendar event: {payload.title}.")
    return doc


@router.post("/events/{event_id}/status")
async def move_event(event_id: str, request: Request):
    user = await get_user(request)
    body = await request.json()
    status = body.get("status", "scheduled")
    e = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not e or user["user_id"] not in e.get("participants", []):
        raise HTTPException(404, "Event not found")
    await db.events.update_one({"event_id": event_id}, {"$set": {"status": status}})
    return {"ok": True}
