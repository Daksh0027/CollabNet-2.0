from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from core.database import db
from core.dependencies import enrich_user, get_user, require_role
from core.security import display_name, now, pub_user, uid
from services.chat_service import ensure_thread
from services.notification_service import log_activity, notify

router = APIRouter(tags=["campaigns"])


class CampaignIn(BaseModel):
    title: str
    brief: str = ""
    deliverables: List[str] = []
    budget_min: float = 0
    budget_max: float = 0
    deadline: str = ""
    niches: List[str] = []


class ApplyIn(BaseModel):
    message: str = ""


class InviteIn(BaseModel):
    creator_id: str
    message: str = ""


@router.get("/campaigns")
async def list_campaigns(
    request: Request,
    mine: int = 0,
    search: str = "",
    niche: str = "",
    content_type: str = "",
    recommended: int = 0,
    offset: int = 0,
    limit: int = 200,
):
    user = await get_user(request)
    q = {}
    if mine:
        require_role(user, "company")
        q["company_id"] = user["user_id"]
    else:
        require_role(user, "creator")
        q["status"] = "open"
    offset = max(0, offset)
    limit = min(200, max(1, limit))
    docs = await db.campaigns.find(q, {"_id": 0}).sort("created_at", -1).skip(offset).to_list(limit)

    creator_niches = []
    if recommended:
        creator_niche_data = user.get("creator", {})
        creator_niches = [
            str(value).strip().lower()
            for value in [creator_niche_data.get("niche", "")] + creator_niche_data.get("sub_niches", [])
            if str(value).strip()
        ]

    comp_ids = list(set(c["company_id"] for c in docs if c.get("company_id")))
    comp_users = await db.users.find({"user_id": {"$in": comp_ids}}, {"_id": 0}).to_list(len(comp_ids) or 10)
    comp_map = {cu["user_id"]: cu for cu in comp_users}

    conn_docs = await db.connections.find({"status": "accepted"}, {"from_id": 1, "to_id": 1, "_id": 0}).to_list(10000)
    conn_counts = {}
    for cd in conn_docs:
        f, t = cd.get("from_id"), cd.get("to_id")
        if f:
            conn_counts[f] = conn_counts.get(f, 0) + 1
        if t:
            conn_counts[t] = conn_counts.get(t, 0) + 1

    out = []
    niche_filters = [n.strip().lower() for n in niche.split(",") if n.strip() and n.strip().lower() != "all"]
    ct_filters = [ct.strip().lower() for ct in content_type.split(",") if ct.strip() and ct.strip().lower() != "all"]

    for c in docs:
        if not mine and c.get("deadline"):
            try:
                deadline = datetime.fromisoformat(str(c["deadline"])[:10]).date()
                if deadline < datetime.now(timezone.utc).date():
                    continue
            except ValueError:
                pass
        cu = comp_map.get(c["company_id"], {})
        co = cu.get("company", {})
        comp_conns = conn_counts.get(c["company_id"], 0)
        if not mine and not cu.get("verified", False):
            continue

        if search:
            search_str = (
                c.get("title", "") + " " +
                c.get("brief", "") + " " +
                co.get("name", "") + " " +
                co.get("industry", "") + " " +
                " ".join(c.get("niches", [])) + " " +
                " ".join(c.get("deliverables", []))
            ).lower()
            if search.lower() not in search_str:
                continue

        if niche_filters:
            camp_niches = [cn.lower() for cn in c.get("niches", [])]
            if not any(nf in camp_niches for nf in niche_filters):
                continue
        if recommended:
            campaign_niches = [value.lower() for value in c.get("niches", [])]
            if not creator_niches or not any(value in campaign_niches for value in creator_niches):
                continue

        if ct_filters:
            deliv_text = " ".join(c.get("deliverables", [])).lower()
            if not any(ct in deliv_text for ct in ct_filters):
                continue

        public_company = pub_user(cu)
        if public_company and public_company.get("company"):
            public_company["company"] = {
                key: value
                for key, value in public_company["company"].items()
                if key not in {"commercial_terms", "total_spend"}
            }
        enr_comp = {
            **public_company,
            "industry": co.get("industry", ""),
            "employees": co.get("employees", 0),
            "website": co.get("website", ""),
            "about": co.get("about", ""),
            "completed_campaigns_count": co.get("completed_campaigns_count", 0),
            "connections_count": comp_conns,
        }
        public_campaign = {
            key: value for key, value in c.items()
            if key not in {"budget_min", "budget_max"}
        }
        out.append({**public_campaign, "company": enr_comp})

    return out


@router.post("/campaigns")
async def create_campaign(payload: CampaignIn, request: Request):
    user = await get_user(request)
    require_role(user, "company")
    doc = {
        "camp_id": uid("cmp"),
        "company_id": user["user_id"],
        "title": payload.title,
        "brief": payload.brief,
        "deliverables": [d for d in payload.deliverables if d.strip()],
        "budget_min": payload.budget_min,
        "budget_max": payload.budget_max,
        "deadline": payload.deadline,
        "niches": payload.niches,
        "status": "open",
        "created_at": now(),
    }
    await db.campaigns.insert_one(doc)
    doc.pop("_id", None)
    await log_activity(user["user_id"], f"Published a new campaign brief: {payload.title}.")
    creators = await db.users.find({"role": "creator", "verified": True}, {"_id": 0}).to_list(200)
    for cr in creators:
        if payload.niches and cr.get("creator", {}).get("niche") in payload.niches:
            await notify(
                cr["user_id"],
                "campaign",
                f"New brief matches your niche: {payload.title}",
                f"{display_name(user)} is hiring.",
                "/app/explore",
                origin="company",
                actor_id=user["user_id"],
            )
    return {**doc, "company": pub_user(user)}


@router.post("/campaigns/{camp_id}/close")
async def close_campaign(camp_id: str, request: Request):
    user = await get_user(request)
    camp = await db.campaigns.find_one({"camp_id": camp_id}, {"_id": 0})
    if not camp or camp["company_id"] != user["user_id"]:
        raise HTTPException(404, "Campaign not found")
    await db.campaigns.update_one({"camp_id": camp_id}, {"$set": {"status": "closed"}})
    return {"ok": True}


@router.post("/campaigns/{camp_id}/apply")
async def apply_campaign(camp_id: str, payload: ApplyIn, request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    camp = await db.campaigns.find_one({"camp_id": camp_id}, {"_id": 0})
    if not camp:
        raise HTTPException(404, "Campaign not found")
    if camp.get("status") != "open":
        raise HTTPException(400, "This campaign is no longer accepting applications")
    if camp.get("deadline"):
        try:
            deadline = datetime.fromisoformat(str(camp["deadline"])[:10]).date()
            if deadline < datetime.now(timezone.utc).date():
                raise HTTPException(400, "The application deadline has passed")
        except ValueError:
            pass
    existing = await db.applications.find_one(
        {
            "camp_id": camp_id,
            "creator_id": user["user_id"],
            "type": "application",
            "status": {"$in": ["pending", "accepted"]},
        },
        {"_id": 0},
    )
    if existing:
        raise HTTPException(400, "You already applied to this campaign")
    doc = {
        "app_id": uid("app"),
        "camp_id": camp_id,
        "campaign_title": camp["title"],
        "creator_id": user["user_id"],
        "company_id": camp["company_id"],
        "type": "application",
        "status": "pending",
        "message": payload.message,
        "created_at": now(),
    }
    await db.applications.insert_one(doc)
    doc.pop("_id", None)
    await notify(
        camp["company_id"],
        "application",
        f"{display_name(user)} applied to {camp['title']}",
        payload.message or "Review the application in Campaigns.",
        "/app/campaigns",
        origin="creator",
        actor_id=user["user_id"],
    )
    await log_activity(user["user_id"], f"Applied to campaign: {camp['title']}.")
    return doc


@router.post("/campaigns/{camp_id}/invite")
async def invite_creator(camp_id: str, payload: InviteIn, request: Request):
    user = await get_user(request)
    require_role(user, "company")
    camp = await db.campaigns.find_one({"camp_id": camp_id}, {"_id": 0})
    if not camp or camp["company_id"] != user["user_id"]:
        raise HTTPException(404, "Campaign not found")
    doc = {
        "app_id": uid("app"),
        "camp_id": camp_id,
        "campaign_title": camp["title"],
        "creator_id": payload.creator_id,
        "company_id": user["user_id"],
        "type": "invitation",
        "status": "pending",
        "message": payload.message,
        "created_at": now(),
    }
    await db.applications.insert_one(doc)
    doc.pop("_id", None)
    await notify(
        payload.creator_id,
        "invitation",
        f"{display_name(user)} invited you to {camp['title']}",
        payload.message or "Respond from your dashboard.",
        "/app/overview",
        origin="company",
        actor_id=user["user_id"],
    )
    await log_activity(user["user_id"], f"Invited a creator to campaign: {camp['title']}.")
    return doc


@router.get("/applications")
async def list_applications(request: Request):
    user = await get_user(request)
    if user.get("role") == "creator":
        q = {"creator_id": user["user_id"]}
    else:
        q = {"company_id": user["user_id"]}
    docs = await db.applications.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [
        {
            **a,
            "creator": await enrich_user(a["creator_id"]),
            "company": await enrich_user(a["company_id"]),
        }
        for a in docs
    ]


@router.post("/applications/{app_id}/accept")
async def accept_application(app_id: str, request: Request):
    user = await get_user(request)
    app_ = await db.applications.find_one({"app_id": app_id}, {"_id": 0})
    if not app_:
        raise HTTPException(404, "Application not found")
    expected_role = "company" if app_.get("type") == "application" else "creator"
    expected_user_id = app_.get("company_id") if expected_role == "company" else app_.get("creator_id")
    if user["user_id"] != expected_user_id or user.get("role") != expected_role:
        raise HTTPException(404, "Application not found")
    if app_.get("status") != "pending":
        raise HTTPException(409, "Application is no longer pending")
    await db.applications.update_one({"app_id": app_id}, {"$set": {"status": "accepted", "updated_at": now()}})
    existing = await db.connections.find_one({
        "$or": [
            {"from_id": app_["creator_id"], "to_id": app_["company_id"]},
            {"from_id": app_["company_id"], "to_id": app_["creator_id"]},
        ],
    }, {"_id": 0})
    if existing:
        await db.connections.update_one(
            {"conn_id": existing["conn_id"]},
            {"$set": {"status": "accepted", "updated_at": now()}},
        )
        await ensure_thread(existing["from_id"], existing["to_id"])
    else:
        await db.connections.insert_one({
            "conn_id": uid("con"),
            "from_id": app_["company_id"],
            "to_id": app_["creator_id"],
            "from_role": "company",
            "to_role": "creator",
            "status": "accepted",
            "message": f"Connected via campaign: {app_['campaign_title']}",
            "created_at": now(),
            "updated_at": now(),
        })
        await ensure_thread(app_["creator_id"], app_["company_id"])
    counterpart = app_["creator_id"] if user["user_id"] == app_["company_id"] else app_["company_id"]
    await notify(
        counterpart,
        "application",
        f"Application accepted — {app_['campaign_title']}",
        "A chat thread is now open between you.",
        "/app/messages",
        origin=user.get("role", "company"),
        actor_id=user["user_id"],
    )
    await log_activity(user["user_id"], f"Accepted the {app_['type']} for {app_['campaign_title']}.")
    return {"ok": True}


@router.post("/applications/{app_id}/decline")
async def decline_application(app_id: str, request: Request):
    user = await get_user(request)
    app_ = await db.applications.find_one({"app_id": app_id}, {"_id": 0})
    if not app_:
        raise HTTPException(404, "Application not found")
    expected_role = "company" if app_.get("type") == "application" else "creator"
    expected_user_id = app_.get("company_id") if expected_role == "company" else app_.get("creator_id")
    if user["user_id"] != expected_user_id or user.get("role") != expected_role:
        raise HTTPException(404, "Application not found")
    if app_.get("status") != "pending":
        raise HTTPException(409, "Application is no longer pending")
    await db.applications.update_one({"app_id": app_id}, {"$set": {"status": "declined", "updated_at": now()}})
    counterpart_id = app_["creator_id"] if expected_role == "company" else app_["company_id"]
    await notify(
        counterpart_id,
        "application",
        f"Application update — {app_['campaign_title']}",
        f"Your application was declined by {display_name(user)}." if expected_role == "company" else "The invitation was declined.",
        "/app/campaigns",
        origin=user.get("role", ""),
        actor_id=user["user_id"],
    )
    return {"ok": True}


@router.post("/applications/{app_id}/withdraw")
async def withdraw_application(app_id: str, request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    app_ = await db.applications.find_one({
        "app_id": app_id,
        "creator_id": user["user_id"],
        "type": "application",
        "status": "pending",
    }, {"_id": 0})
    if not app_:
        raise HTTPException(404, "Pending application not found")
    await db.applications.update_one(
        {"app_id": app_id, "status": "pending"},
        {"$set": {"status": "withdrawn", "updated_at": now()}},
    )
    await notify(
        app_["company_id"],
        "application",
        f"{display_name(user)} withdrew an application",
        app_["campaign_title"],
        "/app/campaigns",
        origin="creator",
        actor_id=user["user_id"],
    )
    return {"ok": True}
