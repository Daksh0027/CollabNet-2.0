from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from core.database import db
from core.dependencies import get_user

router = APIRouter(tags=["notifications"])


@router.get("/notifications")
async def list_notifications(
    request: Request,
    origin: Optional[str] = None,
    offset: int = 0,
    limit: int = 50,
):
    user = await get_user(request)
    user_id = user["user_id"]

    offset = max(0, offset)
    limit = min(100, max(1, limit))
    user_query = {"user_id": user_id, "type": {"$ne": "message"}}
    creator_query = {**user_query, "origin": "creator"}
    company_query = {**user_query, "origin": "company"}
    unread_query = {**user_query, "read": {"$ne": True}}

    count_all = await db.notifications.count_documents(user_query)
    count_creators = await db.notifications.count_documents(creator_query)
    count_companies = await db.notifications.count_documents(company_query)
    unread_all = await db.notifications.count_documents(unread_query)
    unread_creators = await db.notifications.count_documents({**creator_query, "read": {"$ne": True}})
    unread_companies = await db.notifications.count_documents({**company_query, "read": {"$ne": True}})

    if origin and origin.lower() in ("creator", "creators"):
        filtered_query = creator_query
        filtered_count = count_creators
    elif origin and origin.lower() in ("company", "companies"):
        filtered_query = company_query
        filtered_count = count_companies
    else:
        filtered_query = user_query
        filtered_count = count_all

    notifications = await (
        db.notifications.find(filtered_query, {"_id": 0})
        .sort([("created_at", -1), ("notif_id", -1)])
        .skip(offset)
        .to_list(limit)
    )
    next_offset = offset + len(notifications)

    return {
        "notifications": notifications,
        "has_more": next_offset < filtered_count,
        "next_offset": next_offset,
        "unread": unread_all,
        "counts": {
            "all": count_all,
            "creators": count_creators,
            "companies": count_companies,
        },
        "unread_counts": {
            "all": unread_all,
            "creators": unread_creators,
            "companies": unread_companies,
        },
    }


@router.post("/notifications/{notif_id}/read")
async def read_notification(notif_id: str, request: Request):
    user = await get_user(request)
    result = await db.notifications.update_one(
        {"notif_id": notif_id, "user_id": user["user_id"]},
        {"$set": {"read": True}},
    )
    if not result.matched_count:
        raise HTTPException(404, "Notification not found")
    return {"ok": True}


@router.post("/notifications/read")
async def read_notifications(request: Request, origin: Optional[str] = None):
    user = await get_user(request)
    q = {"user_id": user["user_id"]}
    if origin and origin.lower() in ("creator", "creators"):
        q["origin"] = "creator"
    elif origin and origin.lower() in ("company", "companies"):
        q["origin"] = "company"
    await db.notifications.update_many(q, {"$set": {"read": True}})
    return {"ok": True}
