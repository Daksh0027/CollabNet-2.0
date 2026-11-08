from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError
from core.database import db
from core.dependencies import enrich_user, get_user, require_role
from core.security import display_name, now, pub_user, uid
from services.chat_service import ensure_thread
from services.notification_service import log_activity, notify

router = APIRouter(tags=["collaborations"])


class ConnectIn(BaseModel):
    to_id: str
    message: str = ""


class CollaborationRequestIn(BaseModel):
    to_id: str
    title: str
    collaboration_type: str = ""
    message: str = ""
    proposed_idea: str = ""
    platform: str = ""
    deliverables: List[str] = []
    preferred_dates: str = ""
    location: str = ""
    budget: Optional[float] = None


class SaveCreatorIn(BaseModel):
    creator_id: str


class SaveOpportunityIn(BaseModel):
    camp_id: str


async def upgrade_connection(conn_id: str):
    conn = await db.connections.find_one({"conn_id": conn_id}, {"_id": 0})
    if not conn:
        return None
    await db.connections.update_one(
        {"conn_id": conn_id},
        {"$set": {"status": "accepted", "updated_at": now()}},
    )
    await ensure_thread(conn["from_id"], conn["to_id"])
    return conn


@router.get("/connections")
async def list_connections(request: Request, status: str = ""):
    user = await get_user(request)
    q = {"$or": [{"from_id": user["user_id"]}, {"to_id": user["user_id"]}]}
    if status:
        q["status"] = status
    docs = await db.connections.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    out = []
    for c in docs:
        other_id = c["to_id"] if c["from_id"] == user["user_id"] else c["from_id"]
        out.append({
            **c,
            "other": await enrich_user(other_id),
            "direction": "outgoing" if c["from_id"] == user["user_id"] else "incoming",
        })
    return out


@router.post("/connections")
async def create_connection(payload: ConnectIn, request: Request):
    user = await get_user(request)
    if payload.to_id == user["user_id"]:
        raise HTTPException(400, "Cannot connect to yourself")
    other = await db.users.find_one({"user_id": payload.to_id}, {"_id": 0})
    if not other:
        raise HTTPException(404, "User not found")
    existing = await db.connections.find_one({
        "$or": [
            {"from_id": user["user_id"], "to_id": payload.to_id},
            {"from_id": payload.to_id, "to_id": user["user_id"]},
        ],
    }, {"_id": 0})
    if existing:
        return {**existing, "other": pub_user(other)}
    doc = {
        "conn_id": uid("con"),
        "from_id": user["user_id"],
        "to_id": payload.to_id,
        "from_role": user.get("role"),
        "to_role": other.get("role"),
        "status": "pending",
        "message": payload.message,
        "created_at": now(),
        "updated_at": now(),
    }
    await db.connections.insert_one(doc)
    doc.pop("_id", None)
    await notify(
        payload.to_id,
        "connection",
        f"{display_name(user)} wants to connect",
        payload.message or "Open CollaboNet to accept or decline.",
        "/app/overview",
        origin=user.get("role", "creator"),
        actor_id=user["user_id"],
    )
    await log_activity(user["user_id"], f"Sent a connection request to {display_name(other)}.")
    return {**doc, "other": pub_user(other)}


@router.post("/connections/{conn_id}/accept")
async def accept_connection(conn_id: str, request: Request):
    user = await get_user(request)
    conn = await db.connections.find_one({"conn_id": conn_id}, {"_id": 0})
    if not conn or conn["to_id"] != user["user_id"]:
        raise HTTPException(404, "Request not found")
    await upgrade_connection(conn_id)
    other = await enrich_user(conn["from_id"])
    await notify(
        conn["from_id"],
        "connection",
        f"{display_name(user)} accepted your request",
        "You can now chat and open a deal room.",
        "/app/messages",
        origin=user.get("role", "creator"),
        actor_id=user["user_id"],
    )
    await log_activity(user["user_id"], f"Accepted the connection request from {other['display_name'] if other else 'a user'}.")
    return {"ok": True}


@router.post("/connections/{conn_id}/decline")
async def decline_connection(conn_id: str, request: Request):
    user = await get_user(request)
    conn = await db.connections.find_one({"conn_id": conn_id}, {"_id": 0})
    if not conn or conn["to_id"] != user["user_id"]:
        raise HTTPException(404, "Request not found")
    await db.connections.update_one({"conn_id": conn_id}, {"$set": {"status": "declined", "updated_at": now()}})
    return {"ok": True}


@router.get("/collaboration-requests")
async def list_collaboration_requests(
    request: Request,
    direction: str = "all",
    status: str = "",
    offset: int = 0,
    limit: int = 50,
):
    user = await get_user(request)
    require_role(user, "creator")
    user_id = user["user_id"]
    query = {}
    if direction == "received":
        query["receiver_creator_id"] = user_id
    elif direction == "sent":
        query["sender_creator_id"] = user_id
    else:
        query["$or"] = [
            {"sender_creator_id": user_id},
            {"receiver_creator_id": user_id},
        ]
    if status:
        query["status"] = status
    offset = max(0, offset)
    limit = min(100, max(1, limit))
    docs = await db.collaboration_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).to_list(limit)
    results = []
    for doc in docs:
        results.append({
            **doc,
            "sender": await enrich_user(doc["sender_creator_id"]),
            "receiver": await enrich_user(doc["receiver_creator_id"]),
        })
    return results


@router.post("/collaboration-requests")
async def create_collaboration_request(payload: CollaborationRequestIn, request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    target_id = payload.to_id.strip()
    if target_id == user["user_id"]:
        raise HTTPException(400, "Cannot send a collaboration request to yourself")
    if not payload.title.strip():
        raise HTTPException(422, "Request title is required")
    target = await db.users.find_one(
        {"user_id": target_id, "role": "creator", "verified": True},
        {"_id": 0},
    )
    if not target:
        raise HTTPException(404, "Creator not found")
    existing = await db.collaboration_requests.find_one({
        "sender_creator_id": user["user_id"],
        "receiver_creator_id": target_id,
        "status": "pending",
    }, {"_id": 0})
    if existing:
        raise HTTPException(409, "A pending request already exists for this creator")

    doc = {
        "request_id": uid("colreq"),
        "sender_creator_id": user["user_id"],
        "receiver_creator_id": target_id,
        "title": payload.title.strip(),
        "collaboration_type": payload.collaboration_type.strip(),
        "message": payload.message.strip(),
        "proposed_idea": payload.proposed_idea.strip(),
        "platform": payload.platform.strip(),
        "deliverables": [value.strip() for value in payload.deliverables if value.strip()],
        "preferred_dates": payload.preferred_dates.strip(),
        "location": payload.location.strip(),
        "budget": payload.budget,
        "status": "pending",
        "created_at": now(),
        "updated_at": now(),
    }
    try:
        await db.collaboration_requests.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(409, "A pending request already exists for this creator")
    doc.pop("_id", None)
    await notify(
        target_id,
        "collaboration_request",
        f"{display_name(user)} sent you a collaboration request",
        doc["title"],
        "/app/collaborators?tab=received",
        origin="creator",
        actor_id=user["user_id"],
    )
    return {
        **doc,
        "sender": pub_user(user),
        "receiver": pub_user(target),
    }


@router.post("/collaboration-requests/{request_id}/accept")
async def accept_collaboration_request(request_id: str, request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    collab_request = await db.collaboration_requests.find_one({
        "request_id": request_id,
        "receiver_creator_id": user["user_id"],
        "status": "pending",
    }, {"_id": 0})
    if not collab_request:
        raise HTTPException(404, "Pending collaboration request not found")
    result = await db.collaboration_requests.update_one(
        {"request_id": request_id, "status": "pending"},
        {"$set": {"status": "accepted", "updated_at": now()}},
    )
    if not result.modified_count:
        raise HTTPException(409, "Collaboration request is no longer pending")

    sender_id = collab_request["sender_creator_id"]
    connection = await db.connections.find_one({
        "$or": [
            {"from_id": sender_id, "to_id": user["user_id"]},
            {"from_id": user["user_id"], "to_id": sender_id},
        ],
    }, {"_id": 0})
    if connection:
        await db.connections.update_one(
            {"conn_id": connection["conn_id"]},
            {"$set": {"status": "accepted", "updated_at": now()}},
        )
    else:
        await db.connections.insert_one({
            "conn_id": uid("con"),
            "from_id": sender_id,
            "to_id": user["user_id"],
            "from_role": "creator",
            "to_role": "creator",
            "status": "accepted",
            "message": collab_request["title"],
            "created_at": now(),
            "updated_at": now(),
        })
    await ensure_thread(sender_id, user["user_id"])
    collaboration = {
        "collaboration_id": uid("collab"),
        "request_id": request_id,
        "title": collab_request["title"],
        "participants": [sender_id, user["user_id"]],
        "collaboration_type": collab_request.get("collaboration_type", ""),
        "platform": collab_request.get("platform", ""),
        "deliverables": collab_request.get("deliverables", []),
        "preferred_dates": collab_request.get("preferred_dates", ""),
        "status": "active",
        "created_at": now(),
        "updated_at": now(),
    }
    await db.collaborations.insert_one(collaboration)
    await notify(
        sender_id,
        "collaboration_request",
        f"{display_name(user)} accepted your collaboration request",
        collab_request["title"],
        "/app/collaborators?tab=connections",
        origin="creator",
        actor_id=user["user_id"],
    )
    return {"ok": True, "collaboration_id": collaboration["collaboration_id"]}


@router.post("/collaboration-requests/{request_id}/reject")
async def reject_collaboration_request(request_id: str, request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    collab_request = await db.collaboration_requests.find_one({
        "request_id": request_id,
        "receiver_creator_id": user["user_id"],
        "status": "pending",
    }, {"_id": 0})
    if not collab_request:
        raise HTTPException(404, "Pending collaboration request not found")
    await db.collaboration_requests.update_one(
        {"request_id": request_id, "status": "pending"},
        {"$set": {"status": "rejected", "updated_at": now()}},
    )
    await notify(
        collab_request["sender_creator_id"],
        "collaboration_request",
        f"{display_name(user)} declined your collaboration request",
        collab_request["title"],
        "/app/collaborators?tab=sent",
        origin="creator",
        actor_id=user["user_id"],
    )
    return {"ok": True}


@router.post("/collaboration-requests/{request_id}/withdraw")
async def withdraw_collaboration_request(request_id: str, request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    result = await db.collaboration_requests.update_one(
        {
            "request_id": request_id,
            "sender_creator_id": user["user_id"],
            "status": "pending",
        },
        {"$set": {"status": "withdrawn", "updated_at": now()}},
    )
    if not result.modified_count:
        raise HTTPException(404, "Pending collaboration request not found")
    return {"ok": True}


@router.get("/my-connections")
async def list_creator_connections(request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    docs = await db.connections.find({
        "$or": [
            {"from_id": user["user_id"], "to_role": "creator"},
            {"to_id": user["user_id"], "from_role": "creator"},
        ],
        "status": "accepted",
    }, {"_id": 0}).sort("updated_at", -1).to_list(200)
    results = []
    for doc in docs:
        other_id = doc["to_id"] if doc["from_id"] == user["user_id"] else doc["from_id"]
        results.append({**doc, "other": await enrich_user(other_id)})
    return results


@router.get("/collaborations")
async def list_collaborations(request: Request, status: str = "active"):
    user = await get_user(request)
    require_role(user, "creator")
    query = {"participants": user["user_id"]}
    if status:
        query["status"] = status
    docs = await db.collaborations.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)
    results = []
    for doc in docs:
        other_id = next(
            (participant for participant in doc["participants"] if participant != user["user_id"]),
            "",
        )
        results.append({**doc, "other": await enrich_user(other_id)})
    return results


@router.get("/saved-creators")
async def list_saved_creators(request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    docs = await db.saved_creators.find(
        {"user_id": user["user_id"]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(500)
    return [
        {**doc, "creator": await enrich_user(doc["creator_id"])}
        for doc in docs
    ]


@router.post("/saved-creators")
async def save_creator(payload: SaveCreatorIn, request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    creator_id = payload.creator_id.strip()
    if creator_id == user["user_id"]:
        raise HTTPException(400, "Cannot save your own profile")
    creator = await db.users.find_one(
        {"user_id": creator_id, "role": "creator", "verified": True},
        {"_id": 0, "user_id": 1},
    )
    if not creator:
        raise HTTPException(404, "Creator not found")
    try:
        await db.saved_creators.update_one(
            {"user_id": user["user_id"], "creator_id": creator_id},
            {"$setOnInsert": {
                "user_id": user["user_id"],
                "creator_id": creator_id,
                "created_at": now(),
            }},
            upsert=True,
        )
    except DuplicateKeyError:
        pass
    return {"ok": True}


@router.delete("/saved-creators/{creator_id}")
async def unsave_creator(creator_id: str, request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    await db.saved_creators.delete_one({
        "user_id": user["user_id"],
        "creator_id": creator_id,
    })
    return {"ok": True}


@router.get("/saved-opportunities")
async def list_saved_opportunities(request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    docs = await db.saved_opportunities.find(
        {"creator_id": user["user_id"]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(500)
    open_campaign_ids = {
        campaign["camp_id"]
        for campaign in await db.campaigns.find(
            {"camp_id": {"$in": [doc["camp_id"] for doc in docs]}, "status": "open"},
            {"_id": 0, "camp_id": 1},
        ).to_list(len(docs) or 1)
    }
    return [doc for doc in docs if doc["camp_id"] in open_campaign_ids]


@router.post("/saved-opportunities")
async def save_opportunity(payload: SaveOpportunityIn, request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    campaign = await db.campaigns.find_one(
        {"camp_id": payload.camp_id, "status": "open"},
        {"_id": 0},
    )
    if not campaign:
        raise HTTPException(404, "Open opportunity not found")
    try:
        await db.saved_opportunities.update_one(
            {"creator_id": user["user_id"], "camp_id": payload.camp_id},
            {"$setOnInsert": {
                "creator_id": user["user_id"],
                "camp_id": payload.camp_id,
                "created_at": now(),
            }},
            upsert=True,
        )
    except DuplicateKeyError:
        pass
    return {"ok": True}


@router.delete("/saved-opportunities/{camp_id}")
async def unsave_opportunity(camp_id: str, request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    await db.saved_opportunities.delete_one({
        "creator_id": user["user_id"],
        "camp_id": camp_id,
    })
    return {"ok": True}
