from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
import os
import re
import uuid
import json
import httpx
import logging
import zipfile
from fastapi.responses import FileResponse
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest, CheckoutStatusResponse,
)
import certifi
import stripe as _stripe

_stripe.ca_bundle_path = certifi.where()
from pathlib import Path
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="CollaboNet API")
api_router = APIRouter(prefix="/api")

SESSION_COOKIE = "session_token"
AUTH_EXCHANGE_URL = os.environ.get("AUTH_EXCHANGE_URL", "").strip()
BANNED_WORDS = {"scam", "fraud", "idiot", "stupid", "trash", "hate", "worst", "liar", "thief"}

PLATFORMS = ["YouTube", "Instagram", "TikTok", "Twitch"]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def clean(d: dict) -> dict:
    return {k: v for k, v in d.items()}


def day_offset(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")


def iso_offset(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


# ---------------------------------------------------------------- auth helpers
async def get_user(request: Request) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
    if not token:
        raise HTTPException(401, "Not authenticated")
    sess = await db.sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(401, "Invalid session")
    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(401, "Session expired")
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def display_name(u: dict) -> str:
    if u.get("role") == "company" and u.get("company", {}).get("name"):
        return u["company"]["name"]
    return u.get("name") or u.get("email", "").split("@")[0]


def pub_user(u: Optional[dict], full: bool = False) -> Optional[dict]:
    if not u:
        return None
    base = {
        "user_id": u["user_id"],
        "name": u.get("name", ""),
        "display_name": display_name(u),
        "picture": u.get("picture", ""),
        "role": u.get("role"),
        "verified": u.get("verified", False),
    }
    if full:
        base["email"] = u.get("email", "")
        base["company"] = u.get("company", {})
        base["creator"] = u.get("creator", {})
        base["created_at"] = u.get("created_at")
    return base


async def enrich_user(user_id: str) -> Optional[dict]:
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return pub_user(u) if u else None


async def require_role(user: dict, role: str):
    if user.get("role") != role:
        raise HTTPException(403, f"This action requires a {role} account")


async def notify(user_id: str, type_: str, title: str, body: str = "", link: str = ""):
    await db.notifications.insert_one({
        "notif_id": uid("ntf"), "user_id": user_id, "type": type_,
        "title": title, "body": body, "link": link, "read": False, "created_at": now(),
    })


async def log_activity(user_id: str, text: str):
    await db.activities.insert_one({"act_id": uid("act"), "user_id": user_id, "text": text, "created_at": now()})


def thread_id_for(a: str, b: str) -> str:
    return "::".join(sorted([a, b]))


async def ensure_thread(a: str, b: str) -> str:
    tid = thread_id_for(a, b)
    existing = await db.threads.find_one({"thread_id": tid}, {"_id": 0})
    if not existing:
        await db.threads.insert_one({
            "thread_id": tid, "participants": [a, b],
            "last_message": "", "last_at": now(), "reads": {a: now(), b: now()},
            "created_at": now(),
        })
    return tid


def default_agreement(company: str, creator: str, title: str, deliverables: List[str],
                      start: str, end: str, compensation) -> str:
    items = "\n".join([f"  - {d}" for d in deliverables]) or "  - To be agreed in chat"
    return (
        f"COLLABORATION AGREEMENT — {title}\n"
        f"Parties: {company} (\"Sponsor\") and {creator} (\"Creator\")\n\n"
        f"1. Scope. The Creator will produce:\n{items}\n"
        f"2. Timeline. Content window: {start} to {end}. Publishing dates are tracked on the shared calendar.\n"
        f"3. Compensation. ${compensation} flat fee, payable within 14 days of final delivery.\n"
        f"4. Usage. Sponsor receives 30-day paid usage rights on all deliverables.\n"
        f"5. Completion. Both parties confirm delivery in the deal room and exchange moderated ratings.\n"
    )


# ---------------------------------------------------------------- auth routes
class SessionIn(BaseModel):
    session_id: str


class RoleIn(BaseModel):
    role: str


class DemoIn(BaseModel):
    role: str


def build_new_user(email: str, name: str, picture: str) -> dict:
    return {
        "user_id": uid("user"), "email": email,
        "name": name or email.split("@")[0], "picture": picture,
        "role": None, "verified": False,
        "company": {}, "creator": {},
        "created_at": now(),
    }


async def start_session(response: Response, user: dict, token: str):
    await db.sessions.insert_one({
        "session_id": uid("sess"), "user_id": user["user_id"], "session_token": token,
        "expires_at": iso_offset(7), "created_at": now(),
    })
    cors_env = os.environ.get("CORS_ORIGINS", "*")
    is_secure = not ("localhost" in cors_env or cors_env == "*")
    samesite = "none" if is_secure else "lax"
    response.set_cookie(key=SESSION_COOKIE, value=token, httponly=True, secure=is_secure,
                        samesite=samesite, path="/", max_age=7 * 24 * 3600)


@api_router.post("/auth/session")
async def auth_session(payload: SessionIn, response: Response):
    if not AUTH_EXCHANGE_URL:
        raise HTTPException(503, "External authentication is not configured")
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(AUTH_EXCHANGE_URL, headers={"X-Session-ID": payload.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Invalid or expired session_id")
    data = r.json()
    email = data.get("email")
    if not email:
        raise HTTPException(401, "No email in session data")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = build_new_user(email, data.get("name", ""), data.get("picture", ""))
        await db.users.insert_one(user)
        await notify(user["user_id"], "system", "Welcome to CollaboNet",
                     "Pick your account type to get started.", "/onboarding")
    else:
        upd = {}
        if data.get("picture") and data["picture"] != user.get("picture"):
            upd["picture"] = data["picture"]
        if data.get("name") and not user.get("name"):
            upd["name"] = data["name"]
        if upd:
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": upd})
            user.update(upd)
    await start_session(response, user, data["session_token"])
    return pub_user(user, full=True)


@api_router.post("/auth/demo")
async def auth_demo(payload: DemoIn, response: Response):
    if payload.role not in ("creator", "company"):
        raise HTTPException(400, "role must be creator or company")
    user = await db.users.find_one(
        {"role": payload.role, "email": {"$regex": "@collabonet\\.demo$|@demo$"}}, {"_id": 0})
    if not user:
        user = await db.users.find_one({"role": payload.role}, {"_id": 0})
    if not user:
        raise HTTPException(404, "No demo account seeded")
    await start_session(response, user, f"demo_{uuid.uuid4().hex}")
    return pub_user(user, full=True)


@api_router.post("/auth/role")
async def auth_role(payload: RoleIn, request: Request):
    user = await get_user(request)
    if payload.role not in ("creator", "company"):
        raise HTTPException(400, "Invalid role")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"role": payload.role}})
    templates = [
        {"kind": "brief", "title": "Standard campaign brief", "body": "Deliverables:\n- \nTiming:\n- \nBudget:\n- \nDos & don'ts:\n- "},
        {"kind": "outreach", "title": "First-touch outreach", "body": "Hi {name}, we love your work in {niche}. We're planning a campaign and think you'd be a great fit. Open to a quick chat?"},
        {"kind": "agreement", "title": "Simple collaboration agreement", "body": "Scope:\nTimeline:\nCompensation:\nUsage rights:\nCompletion & review:"},
    ]
    for t in templates:
        await db.templates.insert_one({
            "tpl_id": uid("tpl"), "owner_id": user["user_id"], **t, "created_at": now(),
        })
    await log_activity(user["user_id"], f"Joined CollaboNet as a {'creator' if payload.role == 'creator' else 'company / sponsor'}.")
    return {"ok": True, "role": payload.role}


@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_user(request)
    return pub_user(user, full=True)


@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        await db.sessions.delete_one({"session_token": token})
    response.delete_cookie(key=SESSION_COOKIE, path="/")
    return {"ok": True}


# ---------------------------------------------------------------- verification
class SocialVerifyIn(BaseModel):
    platforms: List[dict]  # [{platform, handle, followers}]


class CompanyVerifyIn(BaseModel):
    company_name: str
    industry: str = ""
    website: str = ""
    employees: int = 0
    about: str = ""
    company_email: str = ""


@api_router.post("/verify/social")
async def verify_social(payload: SocialVerifyIn, request: Request):
    user = await get_user(request)
    await require_role(user, "creator")
    platforms = [p for p in payload.platforms if p.get("platform") and p.get("handle")]
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"verified": True, "creator.platforms": platforms,
                  "creator.verification_mock": "simulated-oauth", "verified_at": now()}})
    await notify(user["user_id"], "verification", "Accounts connected", "Your social accounts were verified (simulated).", "/app/account")
    await log_activity(user["user_id"], f"Connected {len(platforms)} social account(s) — profile verified.")
    return {"ok": True, "verified": True}


@api_router.post("/verify/company")
async def verify_company(payload: CompanyVerifyIn, request: Request):
    user = await get_user(request)
    await require_role(user, "company")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"verified": True,
                  "company": {
                      "name": payload.company_name, "industry": payload.industry,
                      "website": payload.website, "employees": payload.employees,
                      "about": payload.about, "company_email": payload.company_email,
                      "verification_mock": "email + onboarding call (simulated)",
                  }, "verified_at": now()}})
    await notify(user["user_id"], "verification", "Company verified",
                 "Company details confirmed. Your onboarding call slot is booked (simulated).", "/app/account")
    await log_activity(user["user_id"], "Completed company verification and booked the onboarding call.")
    return {"ok": True, "verified": True}


# ---------------------------------------------------------------- profiles
class ProfileIn(BaseModel):
    name: Optional[str] = None
    creator: Optional[dict] = None
    company: Optional[dict] = None


@api_router.put("/profile")
async def update_profile(payload: ProfileIn, request: Request):
    user = await get_user(request)
    upd = {}
    if payload.name:
        upd["name"] = payload.name
    if payload.creator is not None and user.get("role") == "creator":
        keep = user.get("creator", {}).get("platforms")
        if keep:
            payload.creator["platforms"] = keep
        upd["creator"] = {**user.get("creator", {}), **payload.creator}
    if payload.company is not None and user.get("role") == "company":
        upd["company"] = {**user.get("company", {}), **payload.company}
    if upd:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": upd})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return pub_user(fresh, full=True)


@api_router.get("/creators")
async def list_creators(request: Request, search: str = "", niche: str = "", platform: str = "",
                        min_followers: int = 0, max_followers: int = 0):
    await get_user(request)
    docs = await db.users.find({"role": "creator", "verified": True}, {"_id": 0}).to_list(500)
    out = []
    for u in docs:
        c = u.get("creator", {})
        plats = c.get("platforms", [])
        followers = max([p.get("followers", 0) for p in plats], default=0)
        if search and search.lower() not in (u.get("name", "").lower() + " " + c.get("niche", "").lower() + " " + c.get("bio", "").lower()):
            continue
        if niche and c.get("niche", "") != niche:
            continue
        if platform and not any(p.get("platform") == platform for p in plats):
            continue
        if min_followers and followers < min_followers:
            continue
        if max_followers and followers > max_followers:
            continue
        rates = c.get("rates", {})
        out.append({
            **pub_user(u),
            "niche": c.get("niche", ""), "bio": c.get("bio", ""),
            "location": c.get("location", ""), "platforms": plats,
            "rates": rates, "stats": c.get("stats", {}),
            "rate_from": min([v for v in rates.values() if v], default=0),
            "top_followers": followers,
        })
    out.sort(key=lambda x: x["top_followers"], reverse=True)
    return out


@api_router.get("/users/{user_id}")
async def get_public_user(user_id: str, request: Request):
    await get_user(request)
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(404, "User not found")
    reviews = await db.reviews.find({"reviewee_id": user_id, "status": "approved"}, {"_id": 0}).sort("created_at", -1).to_list(50)
    avg = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else None
    return {**pub_user(u, full=True), "reviews": reviews, "rating_avg": avg, "review_count": len(reviews)}


# ---------------------------------------------------------------- connections
class ConnectIn(BaseModel):
    to_id: str
    message: str = ""


@api_router.get("/connections")
async def list_connections(request: Request, status: str = ""):
    user = await get_user(request)
    q = {"$or": [{"from_id": user["user_id"]}, {"to_id": user["user_id"]}]}
    if status:
        q["status"] = status
    docs = await db.connections.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    out = []
    for c in docs:
        other_id = c["to_id"] if c["from_id"] == user["user_id"] else c["from_id"]
        out.append({**c, "other": await enrich_user(other_id),
                    "direction": "outgoing" if c["from_id"] == user["user_id"] else "incoming"})
    return out


@api_router.post("/connections")
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
        ]}, {"_id": 0})
    if existing:
        return {**existing, "other": pub_user(other)}
    doc = {
        "conn_id": uid("con"), "from_id": user["user_id"], "to_id": payload.to_id,
        "from_role": user.get("role"), "to_role": other.get("role"),
        "status": "pending", "message": payload.message,
        "created_at": now(), "updated_at": now(),
    }
    await db.connections.insert_one({**doc})
    await notify(payload.to_id, "connection", f"{display_name(user)} wants to connect",
                 payload.message or "Open CollaboNet to accept or decline.", "/app/overview")
    await log_activity(user["user_id"], f"Sent a connection request to {display_name(other)}.")
    return {**doc, "other": pub_user(other)}


async def upgrade_connection(conn_id: str):
    conn = await db.connections.find_one({"conn_id": conn_id}, {"_id": 0})
    if not conn:
        return None
    await db.connections.update_one({"conn_id": conn_id},
                                    {"$set": {"status": "accepted", "updated_at": now()}})
    await ensure_thread(conn["from_id"], conn["to_id"])
    return conn


@api_router.post("/connections/{conn_id}/accept")
async def accept_connection(conn_id: str, request: Request):
    user = await get_user(request)
    conn = await db.connections.find_one({"conn_id": conn_id}, {"_id": 0})
    if not conn or conn["to_id"] != user["user_id"]:
        raise HTTPException(404, "Request not found")
    await upgrade_connection(conn_id)
    other = await enrich_user(conn["from_id"])
    await notify(conn["from_id"], "connection", f"{display_name(user)} accepted your request",
                 "You can now chat and open a deal room.", "/app/messages")
    await log_activity(user["user_id"], f"Accepted the connection request from {other['display_name'] if other else 'a user'}.")
    return {"ok": True}


@api_router.post("/connections/{conn_id}/decline")
async def decline_connection(conn_id: str, request: Request):
    user = await get_user(request)
    conn = await db.connections.find_one({"conn_id": conn_id}, {"_id": 0})
    if not conn or conn["to_id"] != user["user_id"]:
        raise HTTPException(404, "Request not found")
    await db.connections.update_one({"conn_id": conn_id}, {"$set": {"status": "declined", "updated_at": now()}})
    return {"ok": True}


# ---------------------------------------------------------------- campaigns
class CampaignIn(BaseModel):
    title: str
    brief: str = ""
    deliverables: List[str] = []
    budget_min: float = 0
    budget_max: float = 0
    deadline: str = ""
    niches: List[str] = []


@api_router.get("/campaigns")
async def list_campaigns(request: Request, mine: int = 0):
    user = await get_user(request)
    q = {}
    if mine:
        q["company_id"] = user["user_id"]
    else:
        q["status"] = "open"
    docs = await db.campaigns.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [{**c, "company": await enrich_user(c["company_id"])} for c in docs]


@api_router.post("/campaigns")
async def create_campaign(payload: CampaignIn, request: Request):
    user = await get_user(request)
    await require_role(user, "company")
    doc = {
        "camp_id": uid("cmp"), "company_id": user["user_id"],
        "title": payload.title, "brief": payload.brief,
        "deliverables": [d for d in payload.deliverables if d.strip()],
        "budget_min": payload.budget_min, "budget_max": payload.budget_max,
        "deadline": payload.deadline, "niches": payload.niches,
        "status": "open", "created_at": now(),
    }
    await db.campaigns.insert_one({**doc})
    await log_activity(user["user_id"], f"Published a new campaign brief: {payload.title}.")
    creators = await db.users.find({"role": "creator", "verified": True}, {"_id": 0}).to_list(200)
    for cr in creators:
        if payload.niches and cr.get("creator", {}).get("niche") in payload.niches:
            await notify(cr["user_id"], "campaign", f"New brief matches your niche: {payload.title}",
                         f"{display_name(user)} is hiring.", "/app/explore")
    return {**doc, "company": pub_user(user)}


@api_router.post("/campaigns/{camp_id}/close")
async def close_campaign(camp_id: str, request: Request):
    user = await get_user(request)
    camp = await db.campaigns.find_one({"camp_id": camp_id}, {"_id": 0})
    if not camp or camp["company_id"] != user["user_id"]:
        raise HTTPException(404, "Campaign not found")
    await db.campaigns.update_one({"camp_id": camp_id}, {"$set": {"status": "closed"}})
    return {"ok": True}


class ApplyIn(BaseModel):
    message: str = ""


@api_router.post("/campaigns/{camp_id}/apply")
async def apply_campaign(camp_id: str, payload: ApplyIn, request: Request):
    user = await get_user(request)
    await require_role(user, "creator")
    camp = await db.campaigns.find_one({"camp_id": camp_id}, {"_id": 0})
    if not camp:
        raise HTTPException(404, "Campaign not found")
    existing = await db.applications.find_one(
        {"camp_id": camp_id, "creator_id": user["user_id"], "status": "pending"}, {"_id": 0})
    if existing:
        raise HTTPException(400, "You already applied to this campaign")
    doc = {
        "app_id": uid("app"), "camp_id": camp_id, "campaign_title": camp["title"],
        "creator_id": user["user_id"], "company_id": camp["company_id"],
        "type": "application", "status": "pending", "message": payload.message,
        "created_at": now(),
    }
    await db.applications.insert_one({**doc})
    await notify(camp["company_id"], "application", f"{display_name(user)} applied to {camp['title']}",
                 payload.message or "Review the application in Campaigns.", "/app/campaigns")
    await log_activity(user["user_id"], f"Applied to campaign: {camp['title']}.")
    return doc


class InviteIn(BaseModel):
    creator_id: str
    message: str = ""


@api_router.post("/campaigns/{camp_id}/invite")
async def invite_creator(camp_id: str, payload: InviteIn, request: Request):
    user = await get_user(request)
    await require_role(user, "company")
    camp = await db.campaigns.find_one({"camp_id": camp_id}, {"_id": 0})
    if not camp or camp["company_id"] != user["user_id"]:
        raise HTTPException(404, "Campaign not found")
    doc = {
        "app_id": uid("app"), "camp_id": camp_id, "campaign_title": camp["title"],
        "creator_id": payload.creator_id, "company_id": user["user_id"],
        "type": "invitation", "status": "pending", "message": payload.message,
        "created_at": now(),
    }
    await db.applications.insert_one({**doc})
    await notify(payload.creator_id, "invitation", f"{display_name(user)} invited you to {camp['title']}",
                 payload.message or "Respond from your dashboard.", "/app/overview")
    await log_activity(user["user_id"], f"Invited a creator to campaign: {camp['title']}.")
    return doc


@api_router.get("/applications")
async def list_applications(request: Request):
    user = await get_user(request)
    if user.get("role") == "creator":
        q = {"creator_id": user["user_id"]}
    else:
        q = {"company_id": user["user_id"]}
    docs = await db.applications.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [{**a, "creator": await enrich_user(a["creator_id"]),
             "company": await enrich_user(a["company_id"])} for a in docs]


@api_router.post("/applications/{app_id}/accept")
async def accept_application(app_id: str, request: Request):
    user = await get_user(request)
    app_ = await db.applications.find_one({"app_id": app_id}, {"_id": 0})
    if not app_ or user["user_id"] not in (app_["creator_id"], app_["company_id"]):
        raise HTTPException(404, "Application not found")
    await db.applications.update_one({"app_id": app_id}, {"$set": {"status": "accepted", "updated_at": now()}})
    existing = await db.connections.find_one({
        "$or": [{"from_id": app_["creator_id"], "to_id": app_["company_id"]},
                {"from_id": app_["company_id"], "to_id": app_["creator_id"]}]}, {"_id": 0})
    if existing:
        await upgrade_connection(existing["conn_id"])
    else:
        await db.connections.insert_one({
            "conn_id": uid("con"), "from_id": app_["company_id"], "to_id": app_["creator_id"],
            "from_role": "company", "to_role": "creator", "status": "accepted",
            "message": f"Connected via campaign: {app_['campaign_title']}",
            "created_at": now(), "updated_at": now(),
        })
        await ensure_thread(app_["creator_id"], app_["company_id"])
    counterpart = app_["creator_id"] if user["user_id"] == app_["company_id"] else app_["company_id"]
    await notify(counterpart, "application", f"Application accepted — {app_['campaign_title']}",
                 "A chat thread is now open between you.", "/app/messages")
    await log_activity(user["user_id"], f"Accepted the {app_['type']} for {app_['campaign_title']}.")
    return {"ok": True}


@api_router.post("/applications/{app_id}/decline")
async def decline_application(app_id: str, request: Request):
    user = await get_user(request)
    app_ = await db.applications.find_one({"app_id": app_id}, {"_id": 0})
    if not app_ or user["user_id"] not in (app_["creator_id"], app_["company_id"]):
        raise HTTPException(404, "Application not found")
    await db.applications.update_one({"app_id": app_id}, {"$set": {"status": "declined", "updated_at": now()}})
    return {"ok": True}


# ---------------------------------------------------------------- messages
@api_router.get("/threads")
async def list_threads(request: Request):
    user = await get_user(request)
    docs = await db.threads.find({"participants": user["user_id"]}, {"_id": 0}).sort("last_at", -1).to_list(100)
    out = []
    for t in docs:
        other_id = next(p for p in t["participants"] if p != user["user_id"])
        other = await enrich_user(other_id)
        last_read = t.get("reads", {}).get(user["user_id"], "")
        unread = await db.messages.count_documents({
            "thread_id": t["thread_id"], "sender_id": {"$ne": user["user_id"]},
            "created_at": {"$gt": last_read}})
        last_sender_id = t.get("last_sender_id")
        if not last_sender_id:
            last_msg = await db.messages.find_one({"thread_id": t["thread_id"]}, sort=[("created_at", -1)])
            if last_msg:
                last_sender_id = last_msg.get("sender_id")
        out.append({**t, "other": other, "unread": unread, "last_sender_id": last_sender_id})
    return out


@api_router.get("/threads/{thread_id}")
async def get_thread(thread_id: str, request: Request):
    user = await get_user(request)
    t = await db.threads.find_one({"thread_id": thread_id}, {"_id": 0})
    if not t or user["user_id"] not in t["participants"]:
        raise HTTPException(404, "Thread not found")
    msgs = await db.messages.find({"thread_id": thread_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    current_time = now()
    await db.threads.update_one({"thread_id": thread_id},
                                {"$set": {f"reads.{user['user_id']}": current_time}})
    if "reads" not in t:
        t["reads"] = {}
    t["reads"][user["user_id"]] = current_time
    other_id = next(p for p in t["participants"] if p != user["user_id"])
    return {"thread": t, "messages": msgs, "other": await enrich_user(other_id)}


class MsgIn(BaseModel):
    text: str


@api_router.post("/threads/{thread_id}")
async def send_message(thread_id: str, payload: MsgIn, request: Request):
    user = await get_user(request)
    t = await db.threads.find_one({"thread_id": thread_id}, {"_id": 0})
    if not t or user["user_id"] not in t["participants"]:
        raise HTTPException(404, "Thread not found")
    if not payload.text.strip():
        raise HTTPException(400, "Empty message")
    msg = {"msg_id": uid("msg"), "thread_id": thread_id, "sender_id": user["user_id"],
           "text": payload.text, "created_at": now()}
    await db.messages.insert_one({**msg})
    await db.threads.update_one({"thread_id": thread_id},
                                {"$set": {
                                    "last_message": payload.text[:120],
                                    "last_at": msg["created_at"],
                                    "last_sender_id": user["user_id"]
                                }})
    other_id = next(p for p in t["participants"] if p != user["user_id"])
    await notify(other_id, "message", f"New message from {display_name(user)}",
                 payload.text[:80], "/app/messages")
    return clean(msg)


# ---------------------------------------------------------------- contracts
class ContractIn(BaseModel):
    counterpart_id: str
    title: str
    deliverables: List[str] = []
    start_date: str = ""
    end_date: str = ""
    compensation: float = 0
    agreement_text: str = ""


def enrich_contract(c: dict, me_id: str) -> dict:
    other_id = c["creator_id"] if me_id == c["company_id"] else c["company_id"]
    my_role = "company" if me_id == c["company_id"] else "creator"
    return {**c, "other_role": other_id and ("company" if my_role == "creator" else "creator"),
            "my_role": my_role}


@api_router.get("/contracts")
async def list_contracts(request: Request):
    user = await get_user(request)
    q = {"$or": [{"company_id": user["user_id"]}, {"creator_id": user["user_id"]}]}
    docs = await db.contracts.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)
    out = []
    for c in docs:
        other_id = c["creator_id"] if user["user_id"] == c["company_id"] else c["company_id"]
        out.append({**c, "other": await enrich_user(other_id),
                    "my_role": "company" if user["user_id"] == c["company_id"] else "creator"})
    return out


@api_router.get("/contracts/{deal_id}")
async def get_contract(deal_id: str, request: Request):
    user = await get_user(request)
    c = await db.contracts.find_one({"deal_id": deal_id}, {"_id": 0})
    if not c or user["user_id"] not in (c["company_id"], c["creator_id"]):
        raise HTTPException(404, "Deal not found")
    other_id = c["creator_id"] if user["user_id"] == c["company_id"] else c["company_id"]
    reviews = await db.reviews.find({"deal_id": deal_id}, {"_id": 0}).to_list(10)
    return {**c, "other": await enrich_user(other_id),
            "my_role": "company" if user["user_id"] == c["company_id"] else "creator",
            "reviews": reviews}


@api_router.post("/contracts")
async def create_contract(payload: ContractIn, request: Request):
    user = await get_user(request)
    other = await db.users.find_one({"user_id": payload.counterpart_id}, {"_id": 0})
    if not other:
        raise HTTPException(404, "Counterparty not found")
    if user.get("role") == other.get("role"):
        raise HTTPException(400, "Deals are between a company and a creator")
    conn = await db.connections.find_one({
        "$or": [
            {"from_id": user["user_id"], "to_id": payload.counterpart_id},
            {"from_id": payload.counterpart_id, "to_id": user["user_id"]},
        ], "status": "accepted"}, {"_id": 0})
    if not conn:
        raise HTTPException(403, "You need an accepted connection before opening a deal room")
    is_company = user.get("role") == "company"
    company_id = user["user_id"] if is_company else payload.counterpart_id
    creator_id = payload.counterpart_id if is_company else user["user_id"]
    agreement = payload.agreement_text.strip() or default_agreement(
        display_name(user) if is_company else display_name(other),
        display_name(other) if is_company else display_name(user),
        payload.title, payload.deliverables, payload.start_date or "TBD", payload.end_date or "TBD",
        int(payload.compensation))
    doc = {
        "deal_id": uid("deal"), "company_id": company_id, "creator_id": creator_id,
        "title": payload.title,
        "deliverables": [d for d in payload.deliverables if d.strip()],
        "start_date": payload.start_date, "end_date": payload.end_date,
        "compensation": payload.compensation, "agreement_text": agreement,
        "status": "in_review", "signatures": {
            "company": {"signed": False, "name": "", "signed_at": ""},
            "creator": {"signed": False, "name": "", "signed_at": ""}},
        "funding_status": "unfunded", "funded_at": "", "released_at": "", "stripe_session_id": "",
        "created_at": now(), "updated_at": now(),
    }
    await db.contracts.insert_one({**doc})
    await notify(payload.counterpart_id, "contract", f"Deal room opened: {payload.title}",
                 f"{display_name(user)} drafted an agreement for review.", "/app/contracts")
    await log_activity(user["user_id"], f"Opened deal room: {payload.title}.")
    return clean(doc)


class SignIn(BaseModel):
    name: str


@api_router.post("/contracts/{deal_id}/sign")
async def sign_contract(deal_id: str, payload: SignIn, request: Request):
    user = await get_user(request)
    c = await db.contracts.find_one({"deal_id": deal_id}, {"_id": 0})
    if not c or user["user_id"] not in (c["company_id"], c["creator_id"]):
        raise HTTPException(404, "Deal not found")
    role = "company" if user["user_id"] == c["company_id"] else "creator"
    if c["signatures"][role]["signed"]:
        raise HTTPException(400, "Already signed")
    sig = {f"signatures.{role}": {"signed": True, "name": payload.name, "signed_at": now()}}
    both = (c["signatures"]["company"]["signed"] or role == "company") and \
           (c["signatures"]["creator"]["signed"] or role == "creator")
    upd = {**sig, "updated_at": now()}
    if both:
        upd["status"] = "upcoming"
    await db.contracts.update_one({"deal_id": deal_id}, {"$set": upd})
    if both:
        start = c["start_date"] or day_offset(7)
        await db.events.insert_one({
            "event_id": uid("evt"), "title": f"{c['title']} — publish window",
            "date": start, "type": "campaign", "color": "#F4610A", "status": "scheduled",
            "deal_id": deal_id, "participants": [c["company_id"], c["creator_id"]],
            "created_at": now(),
        })
        for pid in (c["company_id"], c["creator_id"]):
            await notify(pid, "contract", f"Agreement signed: {c['title']}",
                         "The campaign was added to both calendars.", "/app/calendar")
            await log_activity(pid, f"E-signed the agreement for {c['title']}.")
    return {"ok": True, "status": "upcoming" if both else "in_review"}


@api_router.post("/contracts/{deal_id}/complete")
async def complete_contract(deal_id: str, request: Request):
    user = await get_user(request)
    c = await db.contracts.find_one({"deal_id": deal_id}, {"_id": 0})
    if not c or user["user_id"] not in (c["company_id"], c["creator_id"]):
        raise HTTPException(404, "Deal not found")
    upd = {"status": "completed", "updated_at": now()}
    released = c.get("funding_status") == "funded"
    if released:
        upd["funding_status"] = "released"
        upd["released_at"] = now()
    await db.contracts.update_one({"deal_id": deal_id}, {"$set": upd})
    if released:
        await db.payment_transactions.update_one(
            {"deal_id": deal_id, "payment_status": "paid"},
            {"$set": {"status": "released", "escrow_released_at": now()}})
    for pid in (c["company_id"], c["creator_id"]):
        await notify(pid, "contract", f"Campaign delivered: {c['title']}",
                     "Funds released from escrow — payout queued." if released
                     else "Leave a moderated rating for your partner.", "/app/contracts")
        await log_activity(pid, f"Marked {c['title']} as delivered." +
                           (" Funds released from escrow." if released else ""))
    return {"ok": True}


class DisputeIn(BaseModel):
    reason: str


@api_router.post("/contracts/{deal_id}/dispute")
async def dispute_contract(deal_id: str, payload: DisputeIn, request: Request):
    user = await get_user(request)
    c = await db.contracts.find_one({"deal_id": deal_id}, {"_id": 0})
    if not c or user["user_id"] not in (c["company_id"], c["creator_id"]):
        raise HTTPException(404, "Deal not found")
    await db.contracts.update_one({"deal_id": deal_id}, {"$set": {"status": "disputed", "updated_at": now()}})
    other_id = c["creator_id"] if user["user_id"] == c["company_id"] else c["company_id"]
    await notify(other_id, "dispute", f"Dispute raised on {c['title']}",
                 "CollaboNet review will mediate — no public accusations.", "/app/contracts")
    await log_activity(user["user_id"], f"Raised a dispute on {c['title']} — routed to platform review.")
    return {"ok": True}


class ReviewIn(BaseModel):
    rating: int
    comment: str = ""


@api_router.post("/contracts/{deal_id}/review")
async def review_contract(deal_id: str, payload: ReviewIn, request: Request):
    user = await get_user(request)
    c = await db.contracts.find_one({"deal_id": deal_id}, {"_id": 0})
    if not c or user["user_id"] not in (c["company_id"], c["creator_id"]):
        raise HTTPException(404, "Deal not found")
    if c["status"] != "completed":
        raise HTTPException(400, "Reviews open after the campaign is completed")
    existing = await db.reviews.find_one({"deal_id": deal_id, "reviewer_id": user["user_id"]}, {"_id": 0})
    if existing:
        raise HTTPException(400, "You already reviewed this deal")
    text = payload.comment.lower()
    flagged = any(w in text for w in BANNED_WORDS)
    reviewee_id = c["creator_id"] if user["user_id"] == c["company_id"] else c["company_id"]
    doc = {
        "review_id": uid("rev"), "deal_id": deal_id, "campaign_title": c["title"],
        "reviewer_id": user["user_id"], "reviewee_id": reviewee_id,
        "rating": max(1, min(5, payload.rating)), "comment": payload.comment,
        "status": "pending" if flagged else "approved", "moderated": True,
        "created_at": now(),
    }
    await db.reviews.insert_one({**doc})
    await notify(reviewee_id, "review", f"New rating on {c['title']}",
                 "Received a moderated rating.", "/app/contracts")
    return doc


# ---------------------------------------------------------------- calendar
class EventIn(BaseModel):
    title: str
    date: str
    type: str = "milestone"


@api_router.get("/events")
async def list_events(request: Request, month: str = ""):
    user = await get_user(request)
    q = {"participants": user["user_id"]}
    docs = await db.events.find(q, {"_id": 0}).sort("date", 1).to_list(300)
    if month:
        docs = [e for e in docs if e["date"].startswith(month)]
    return docs


@api_router.post("/events")
async def create_event(payload: EventIn, request: Request):
    user = await get_user(request)
    colors = {"campaign": "#1ED760", "meeting": "#4FC9D4", "shoot": "#7FE8CE", "milestone": "#D7F26B"}
    doc = {
        "event_id": uid("evt"), "title": payload.title, "date": payload.date,
        "type": payload.type if payload.type in colors else "milestone",
        "color": colors.get(payload.type, colors["milestone"]), "status": "scheduled",
        "deal_id": "", "participants": [user["user_id"]], "created_at": now(),
    }
    await db.events.insert_one({**doc})
    await log_activity(user["user_id"], f"Added a calendar event: {payload.title}.")
    return doc


@api_router.post("/events/{event_id}/status")
async def move_event(event_id: str, request: Request):
    user = await get_user(request)
    body = await request.json()
    status = body.get("status", "scheduled")
    e = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not e or user["user_id"] not in e.get("participants", []):
        raise HTTPException(404, "Event not found")
    await db.events.update_one({"event_id": event_id}, {"$set": {"status": status}})
    return {"ok": True}


# ---------------------------------------------------------------- notifications
@api_router.get("/notifications")
async def list_notifications(request: Request):
    user = await get_user(request)
    docs = await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"notifications": docs, "unread": sum(1 for n in docs if not n.get("read"))}


@api_router.post("/notifications/read")
async def read_notifications(request: Request):
    user = await get_user(request)
    await db.notifications.update_many({"user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------------------------------------------------------- overview
@api_router.get("/overview")
async def overview(request: Request):
    user = await get_user(request)
    uid_ = user["user_id"]
    activities = await db.activities.find({"user_id": uid_}, {"_id": 0}).sort("created_at", -1).to_list(8)
    conns = await db.connections.find(
        {"$or": [{"from_id": uid_}, {"to_id": uid_}]}, {"_id": 0}).to_list(200)
    contracts = await db.contracts.find(
        {"$or": [{"company_id": uid_}, {"creator_id": uid_}]}, {"_id": 0}).to_list(200)

    async def with_other(c):
        other_id = c["creator_id"] if uid_ == c["company_id"] else c["company_id"]
        return {**c, "other": await enrich_user(other_id)}

    if user.get("role") == "creator":
        accepted = [c for c in conns if c["status"] == "accepted"]
        active = [c for c in contracts if c["status"] in ("in_review", "upcoming", "active")]
        completed = [c for c in contracts if c["status"] == "completed"]
        earnings = sum(c.get("compensation", 0) for c in completed)
        apps = await db.applications.find(
            {"creator_id": uid_, "type": "invitation", "status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(20)
        invitations = [{**a, "company": await enrich_user(a["company_id"])} for a in apps]
        recent_collabs = [await with_other(c) for c in completed[:4]]
        if not user.get("verified"):
            next_step = "Connect your social accounts to get verified."
        elif not user.get("creator", {}).get("rates"):
            next_step = "Add your rates so sponsors know where to start."
        elif [c for c in conns if c["status"] == "pending" and c["to_id"] == uid_]:
            next_step = "You have connection requests waiting for a response."
        elif [c for c in contracts if c["status"] == "in_review" and not c["signatures"]["creator"]["signed"]]:
            next_step = "An agreement is waiting for your e-signature."
        elif active:
            next_step = "Deliver on your active deals — check the calendar."
        else:
            next_step = "Explore open campaigns and send your first application."
        return {
            "role": "creator",
            "tiles": {"connections": len(accepted), "active_deals": len(active),
                      "earnings": earnings, "collaborations": len(completed)},
            "invitations": invitations, "recent_collaborations": recent_collabs,
            "requests_in": [c for c in conns if c["status"] == "pending" and c["to_id"] == uid_],
            "activities": activities, "next_step": next_step,
        }
    else:
        accepted = [c for c in conns if c["status"] == "accepted"]
        open_briefs = await db.campaigns.count_documents({"company_id": uid_, "status": "open"})
        in_negotiation = [c for c in contracts if c["status"] in ("in_review", "upcoming", "active")]
        spend = sum(c.get("compensation", 0) for c in contracts if c["status"] == "completed")
        requests_in = [c for c in conns if c["status"] == "pending" and c["to_id"] == uid_]
        enriched_reqs = [{**c, "other": await enrich_user(c["from_id"])} for c in requests_in]
        if not user.get("verified"):
            next_step = "Complete company verification to unlock everything."
        elif requests_in:
            next_step = "Creators are waiting on your connection requests."
        elif open_briefs == 0:
            next_step = "Publish your first campaign brief."
        elif [c for c in contracts if c["status"] == "in_review" and not c["signatures"]["company"]["signed"]]:
            next_step = "Sign the pending agreement to lock in the campaign."
        else:
            next_step = "Explore creators and scale the roster."
        return {
            "role": "company",
            "tiles": {"connected_creators": len(accepted), "open_briefs": open_briefs,
                      "in_negotiation": len(in_negotiation), "total_spend": spend},
            "requests_in": enriched_reqs, "activities": activities, "next_step": next_step,
        }


# ---------------------------------------------------------------- templates
class TemplateIn(BaseModel):
    kind: str
    title: str
    body: str


@api_router.get("/templates")
async def list_templates(request: Request):
    user = await get_user(request)
    return await db.templates.find({"owner_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api_router.post("/templates")
async def create_template(payload: TemplateIn, request: Request):
    user = await get_user(request)
    doc = {"tpl_id": uid("tpl"), "owner_id": user["user_id"], "kind": payload.kind,
           "title": payload.title, "body": payload.body, "created_at": now()}
    await db.templates.insert_one({**doc})
    return doc


@api_router.delete("/templates/{tpl_id}")
async def delete_template(tpl_id: str, request: Request):
    user = await get_user(request)
    await db.templates.delete_one({"tpl_id": tpl_id, "owner_id": user["user_id"]})
    return {"ok": True}


# ---------------------------------------------------------------- payments (escrow)
class PayOriginIn(BaseModel):
    origin_url: str


async def settle_escrow(session_id: str):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx or tx.get("payment_status") != "paid":
        return
    result = await db.contracts.update_one(
        {"deal_id": tx["deal_id"], "funding_status": {"$ne": "funded"}},
        {"$set": {"funding_status": "funded", "funded_at": now(), "stripe_session_id": session_id}})
    if result.modified_count:
        c = await db.contracts.find_one({"deal_id": tx["deal_id"]}, {"_id": 0})
        for pid in (c["company_id"], c["creator_id"]):
            await notify(pid, "payment", f"Escrow funded: {c['title']}",
                         "The campaign fee is secured. Released on delivery.", "/app/contracts")
            await log_activity(pid, f"Escrow funded for {c['title']}.")
        # Payout to the creator's bank requires Stripe Connect onboarding — out of MVP scope.


@api_router.post("/payments/checkout/{deal_id}")
async def create_deal_checkout(deal_id: str, payload: PayOriginIn, request: Request):
    user = await get_user(request)
    c = await db.contracts.find_one({"deal_id": deal_id}, {"_id": 0})
    if not c or user["user_id"] != c["company_id"]:
        raise HTTPException(404, "Deal not found")
    if c.get("funding_status") == "funded":
        raise HTTPException(400, "Escrow already funded")
    if c.get("funding_status") == "released":
        raise HTTPException(400, "Funds already released")
    if float(c.get("compensation", 0)) <= 0:
        raise HTTPException(400, "Deal has no compensation to fund")
    host_url = str(request.base_url)
    sc = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"],
                        webhook_url=f"{host_url}api/webhook/stripe")
    sess_req = CheckoutSessionRequest(
        amount=float(c["compensation"]), currency="usd",
        success_url=f"{payload.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&deal_id={deal_id}",
        cancel_url=f"{payload.origin_url}/payment/cancel?deal_id={deal_id}",
        metadata={"deal_id": deal_id, "company_id": c["company_id"], "creator_id": c["creator_id"]},
    )
    session = await sc.create_checkout_session(sess_req)
    await db.payment_transactions.insert_one({
        "tx_id": uid("tx"), "session_id": session.session_id, "deal_id": deal_id,
        "title": c["title"], "company_id": c["company_id"], "creator_id": c["creator_id"],
        "amount": float(c["compensation"]), "currency": "usd",
        "status": "initiated", "payment_status": "pending",
        "created_at": now(), "updated_at": now(),
    })
    return {"checkout_url": session.url, "session_id": session.session_id}


@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Transaction not found")
    if tx.get("payment_status") != "paid":
        try:
            host_url = str(request.base_url)
            sc = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"],
                                webhook_url=f"{host_url}api/webhook/stripe")
            st = await sc.get_checkout_status(session_id)
            if st.payment_status == "paid" or st.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid", "updated_at": now()}})
                await settle_escrow(session_id)
        except Exception:
            pass
        tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    return {"session_id": tx["session_id"], "status": tx["status"], "payment_status": tx["payment_status"]}


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url)
    sc = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"],
                        webhook_url=f"{host_url}api/webhook/stripe")
    try:
        res = await sc.handle_webhook(body, sig)
    except Exception:
        raise HTTPException(400, "Invalid webhook signature")
    if res.session_id and (res.event_type == "checkout.session.completed"
                           or getattr(res, "payment_status", "") == "paid"):
        await db.payment_transactions.update_one(
            {"session_id": res.session_id, "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed", "payment_status": "paid", "updated_at": now()}})
        await settle_escrow(res.session_id)
    return {"status": "ok"}


# ---------------------------------------------------------------- AI helpers
def ai_key() -> str:
    return (os.environ.get("AI_API_KEY") or "").strip()


def ai_guard():
    if not ai_key():
        raise HTTPException(503, "AI not configured — add your OpenRouter API key in backend configuration")


@api_router.get("/ai/status")
async def ai_status():
    return {"configured": bool(ai_key()), "model": os.environ.get("AI_MODEL", "")}


async def ai_complete(system: str, user_text: str) -> str:
    ai_guard()
    base = (os.environ.get("AI_BASE_URL") or "https://openrouter.ai/api/v1").rstrip("/")
    model = os.environ.get("AI_MODEL") or "google/gemini-2.5-flash"
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{base}/chat/completions",
                         headers={"Authorization": f"Bearer {ai_key()}",
                                  "Content-Type": "application/json"},
                         json={"model": model, "messages": [
                             {"role": "system", "content": system},
                             {"role": "user", "content": user_text},
                         ]})
    if r.status_code != 200:
        raise HTTPException(502, f"AI provider error: {r.status_code}")
    data = r.json()
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise HTTPException(502, "Unexpected AI provider response")


class SummarizeIn(BaseModel):
    thread_id: str


@api_router.post("/ai/summarize")
async def ai_summarize(payload: SummarizeIn, request: Request):
    user = await get_user(request)
    t = await db.threads.find_one({"thread_id": payload.thread_id}, {"_id": 0})
    if not t or user["user_id"] not in t["participants"]:
        raise HTTPException(404, "Thread not found")
    msgs = await db.messages.find({"thread_id": payload.thread_id}, {"_id": 0}).sort("created_at", -1).to_list(40)
    if not msgs:
        raise HTTPException(400, "Nothing to summarize yet")
    transcript = "\n".join(f"{m['sender_id']}: {m['text']}" for m in reversed(msgs))
    summary = await ai_complete(
        "You summarize chat threads between a sponsor and a content creator on a campaign marketplace. "
        "Reply with 3-5 short bullets: what was agreed, what is pending, next step. Plain text only.",
        transcript)
    return {"summary": summary}


class DraftIn(BaseModel):
    kind: str  # outreach | counteroffer
    to_id: str = ""
    context: str = ""


@api_router.post("/ai/draft")
async def ai_draft(payload: DraftIn, request: Request):
    user = await get_user(request)
    to_u = await db.users.find_one({"user_id": payload.to_id}, {"_id": 0}) if payload.to_id else None
    who = display_name(to_u) if to_u else "the other party"
    prompt = (f"Write a {payload.kind} message from {display_name(user)} ({user.get('role')}) to {who}. "
              f"Context: {payload.context or 'a campaign collaboration on CollaboNet'}. "
              f"Reply with the message text only, max 120 words, friendly and specific.")
    text = await ai_complete("You write concise outreach messages for a sponsor-creator marketplace. "
                             "No subject lines, no quotes around the message.", prompt)
    return {"draft": text}


class BenchmarkIn(BaseModel):
    creator_id: str


@api_router.post("/ai/benchmark")
async def ai_benchmark(payload: BenchmarkIn, request: Request):
    await get_user(request)
    u = await db.users.find_one({"user_id": payload.creator_id}, {"_id": 0})
    if not u or u.get("role") != "creator":
        raise HTTPException(404, "Creator not found")
    c = u.get("creator", {})
    raw = await ai_complete(
        "You benchmark creator rates for a sponsor marketplace. Reply ONLY with JSON: "
        '{"verdict": "under|fair|premium", "suggested_min": number, "suggested_max": number, "notes": "1-2 sentences"}. '
        "Suggested range is a per-post rate in USD.", 
        f"Niche: {c.get('niche')}. Platforms: {json.dumps(c.get('platforms', []))}. "
        f"Stats: {json.dumps(c.get('stats', {}))}. Current rates: {json.dumps(c.get('rates', {}))}.")
    try:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        parsed = json.loads(m.group(0))
    except Exception:
        parsed = {"verdict": "fair", "suggested_min": 0, "suggested_max": 0, "notes": raw[:200]}
    return parsed


# ---------------------------------------------------------------- seed
async def seed():
    if await db.users.count_documents({}) > 0:
        return

    def creator_doc(name, email, niche, platforms, rates, location, stats, bio, pitch):
        return build_new_user(email, name, "") | {
            "role": "creator", "verified": True, "verified_at": iso_offset(-20),
            "creator": {"niche": niche, "bio": bio, "pitch": pitch, "location": location,
                        "platforms": [{"platform": p, "handle": h, "followers": f} for p, h, f in platforms],
                        "rates": rates, "stats": stats}}

    def company_doc(name, email, rep, company, industry, employees, about, req):
        return build_new_user(email, rep, "") | {
            "role": "company", "verified": True, "verified_at": iso_offset(-30),
            "company": {"name": company, "industry": industry, "employees": employees,
                        "about": about, "company_email": email, "website": "",
                        "verification_mock": "email + onboarding call (simulated)",
                        "requirements": req}}

    creators = [
        creator_doc("Maya Chen", "maya.chen@collabonet.demo", "Tech & Gadgets",
                    [("YouTube", "@mayabuilds", 850000), ("Instagram", "@maya.chen", 120000)],
                    {"post": 800, "video": 2500, "story": 350}, "Austin, USA",
                    {"avg_views": 240000, "engagement": 4.8},
                    "Hands-on reviews of consumer tech and smart-home gear.",
                    "I turn product launches into stories people actually finish watching."),
        creator_doc("Dario Velez", "dario.velez@collabonet.demo", "Travel",
                    [("YouTube", "@darioabroad", 420000), ("Instagram", "@dario.velez", 95000)],
                    {"post": 600, "video": 1800, "story": 250}, "Lisbon, Portugal",
                    {"avg_views": 150000, "engagement": 5.6},
                    "Slow-travel films and hidden-city guides.",
                    "Cinematic travel films that put brands inside the journey."),
        creator_doc("Priya Nair", "priya.nair@collabonet.demo", "Beauty & Skincare",
                    [("Instagram", "@priyaglow", 950000), ("YouTube", "@priyanair", 210000)],
                    {"post": 1200, "video": 3000, "story": 500}, "Mumbai, India",
                    {"avg_views": 180000, "engagement": 6.2},
                    "Skincare science, ingredient breakdowns and routines.",
                    "Ingredient-first beauty content with a loyal, high-trust audience."),
        creator_doc("Jonas Weber", "jonas.weber@collabonet.demo", "Fitness",
                    [("YouTube", "@jonaslifts", 310000), ("Instagram", "@jonas.weber", 180000)],
                    {"post": 550, "video": 1400, "story": 200}, "Berlin, Germany",
                    {"avg_views": 120000, "engagement": 5.1},
                    "Strength training, running and recovery.",
                    "Evidence-based fitness with a community that shows up daily."),
        creator_doc("Sofia Ramos", "sofia.ramos@collabonet.demo", "Food & Cooking",
                    [("Instagram", "@sofiacooks", 540000), ("TikTok", "@sofiacooks", 700000)],
                    {"post": 700, "video": 1900, "story": 300}, "Mexico City, Mexico",
                    {"avg_views": 300000, "engagement": 7.0},
                    "Home cooking, street food and kitchen gadgets.",
                    "Food content that makes audiences cook, not just scroll."),
        creator_doc("Leo Tanaka", "leo.tanaka@collabonet.demo", "Gaming",
                    [("Twitch", "@leoplays", 220000), ("YouTube", "@leoplays", 190000)],
                    {"post": 400, "video": 1100, "story": 180}, "Osaka, Japan",
                    {"avg_views": 90000, "engagement": 8.3},
                    "Competitive play, reviews and live streams.",
                    "High-energy streams with the most chat-active audience on Twitch."),
    ]
    companies = [
        company_doc("Elena Brand", "elena.brand@collabonet.demo", "Elena Brand", "Nova Athletics",
                    "Sportswear", 240, "Performance footwear and apparel for everyday athletes.",
                    {"niches": ["Fitness", "Tech & Gadgets"], "budget_min": 2000, "budget_max": 25000}),
        company_doc("Marcus Feld", "marcus.feld@collabonet.demo", "Marcus Feld", "Brewhaus Coffee",
                    "Food & Beverage", 60, "Specialty coffee roasters with a cold-brew line.",
                    {"niches": ["Food & Cooking", "Lifestyle"], "budget_min": 500, "budget_max": 8000}),
        company_doc("Ava Sato", "ava.sato@collabonet.demo", "Ava Sato", "Lumen Skincare",
                    "Beauty", 120, "Dermatologist-formulated skincare, made in small batches.",
                    {"niches": ["Beauty & Skincare", "Wellness"], "budget_min": 3000, "budget_max": 40000}),
    ]
    for d in creators + companies:
        await db.users.insert_one(d)

    maya = creators[0]
    elena = companies[0]
    priya = creators[2]
    jonas = creators[3]
    sofia = creators[4]

    campaigns = [
        {"camp_id": uid("cmp"), "company_id": elena["user_id"], "title": "Zero-Drop Runner Launch",
         "brief": "Launch campaign for our new zero-drop running shoe. Authentic training-story integration, not a hard sell.",
         "deliverables": ["1 YouTube dedicated review (8+ min)", "3 Instagram reels", "Stories with link sticker"],
         "budget_min": 4000, "budget_max": 12000, "deadline": day_offset(45),
         "niches": ["Fitness", "Tech & Gadgets"], "status": "open", "created_at": iso_offset(-5)},
        {"camp_id": uid("cmp"), "company_id": companies[1]["user_id"], "title": "Cold Brew Summer Series",
         "brief": "Summer push for our canned cold brew. Real recipes, real moments — pool days, picnics, office afternoons.",
         "deliverables": ["2 TikTok videos", "1 Instagram reel", "Recipe caption collab"],
         "budget_min": 800, "budget_max": 2500, "deadline": day_offset(30),
         "niches": ["Food & Cooking", "Lifestyle"], "status": "open", "created_at": iso_offset(-3)},
        {"camp_id": uid("cmp"), "company_id": companies[2]["user_id"], "title": "Barrier Repair Campaign",
         "brief": "Educational series on skin barrier repair featuring our ceramide line. Science-forward creators preferred.",
         "deliverables": ["1 YouTube integration (3 min)", "2 Instagram posts", "1 live Q&A"],
         "budget_min": 6000, "budget_max": 15000, "deadline": day_offset(60),
         "niches": ["Beauty & Skincare", "Wellness"], "status": "open", "created_at": iso_offset(-2)},
    ]
    for c in campaigns:
        await db.campaigns.insert_one(c)

    marcus = companies[1]
    ava = companies[2]
    leo = creators[5]
    dario = creators[1]

    conns = [
        {"conn_id": uid("con"), "from_id": elena["user_id"], "to_id": maya["user_id"],
         "from_role": "company", "to_role": "creator", "status": "accepted",
         "message": "Loved the smart-home series. Want to work on our runner launch?",
         "created_at": iso_offset(-10), "updated_at": iso_offset(-9)},
        {"conn_id": uid("con"), "from_id": marcus["user_id"], "to_id": maya["user_id"],
         "from_role": "company", "to_role": "creator", "status": "accepted",
         "message": "Loved your desk setup video!", "created_at": iso_offset(-2), "updated_at": iso_offset(-2)},
        {"conn_id": uid("con"), "from_id": ava["user_id"], "to_id": maya["user_id"],
         "from_role": "company", "to_role": "creator", "status": "accepted",
         "message": "Collab on smart wellness device", "created_at": iso_offset(-1), "updated_at": iso_offset(-1)},
        {"conn_id": uid("con"), "from_id": leo["user_id"], "to_id": maya["user_id"],
         "from_role": "creator", "to_role": "creator", "status": "accepted",
         "message": "Gaming collab", "created_at": iso_offset(-3), "updated_at": iso_offset(-3)},
        {"conn_id": uid("con"), "from_id": dario["user_id"], "to_id": maya["user_id"],
         "from_role": "creator", "to_role": "creator", "status": "accepted",
         "message": "Travel tech setup", "created_at": iso_offset(-5), "updated_at": iso_offset(-5)},
        {"conn_id": uid("con"), "from_id": marcus["user_id"], "to_id": priya["user_id"],
         "from_role": "company", "to_role": "creator", "status": "pending",
         "message": "Your ingredient breakdowns are excellent — open to a coffee collab?",
         "created_at": iso_offset(-2), "updated_at": iso_offset(-2)},
    ]
    for c in conns:
        await db.connections.insert_one(c)

    # 1. Elena (Nova Athletics) - Read
    tid = thread_id_for(elena["user_id"], maya["user_id"])
    last_maya_msg = "I'll review the draft agreement and send it over shortly!"
    await db.threads.insert_one({
        "thread_id": tid, "participants": [elena["user_id"], maya["user_id"]],
        "last_message": last_maya_msg, "last_at": iso_offset(-0.02),
        "last_sender_id": maya["user_id"],
        "reads": {elena["user_id"]: iso_offset(-0.01), maya["user_id"]: iso_offset(-0.02)},
        "created_at": iso_offset(-9)})
    msgs = [
        (elena["user_id"], "Hi Maya! We're launching a zero-drop runner and your training series is exactly the tone we want.", -8),
        (maya["user_id"], "Hi Elena — I watched the product teaser, the sole design looks great. What deliverables do you have in mind?", -7),
        (elena["user_id"], "One dedicated YouTube review, three reels, and stories with a link sticker. Budget is flexible around $9.5k.", -6),
        (maya["user_id"], "That works. Send over the brief and I'll review timelines.", -5),
        (elena["user_id"], "Perfect, let's draft the deal room.", -1),
        (maya["user_id"], last_maya_msg, -0.02),
    ]
    for sender, text, off in msgs:
        await db.messages.insert_one({"msg_id": uid("msg"), "thread_id": tid, "sender_id": sender,
                                      "text": text, "created_at": iso_offset(off)})

    # 2. Marcus (Brewhaus Coffee) - UNREAD (2 msgs)
    tid_m = thread_id_for(marcus["user_id"], maya["user_id"])
    await db.threads.insert_one({
        "thread_id": tid_m, "participants": [marcus["user_id"], maya["user_id"]],
        "last_message": "Would you be open to featuring our precision cold-brew system in your next workspace makeover? Budget is flexible around $3,500.",
        "last_at": iso_offset(-0.025), "last_sender_id": marcus["user_id"],
        "reads": {marcus["user_id"]: iso_offset(-0.02), maya["user_id"]: iso_offset(-0.1)},
        "created_at": iso_offset(-2)})
    await db.messages.insert_one({"msg_id": uid("msg"), "thread_id": tid_m, "sender_id": marcus["user_id"],
                                  "text": "Hey Maya! We really love your desk setup videos and your morning routine content.", "created_at": iso_offset(-0.08)})
    await db.messages.insert_one({"msg_id": uid("msg"), "thread_id": tid_m, "sender_id": marcus["user_id"],
                                  "text": "Would you be open to featuring our precision cold-brew system in your next workspace makeover? Budget is flexible around $3,500.", "created_at": iso_offset(-0.025)})

    # 3. Ava (Lumen Skincare) - UNREAD (1 msg)
    tid_a = thread_id_for(ava["user_id"], maya["user_id"])
    await db.threads.insert_one({
        "thread_id": tid_a, "participants": [ava["user_id"], maya["user_id"]],
        "last_message": "Hi Maya! We are preparing our holiday smart-wellness lineup. Would love to send you our smart LED rejuvenation mask for an honest review.",
        "last_at": iso_offset(-0.01), "last_sender_id": ava["user_id"],
        "reads": {ava["user_id"]: iso_offset(-0.01), maya["user_id"]: iso_offset(-1)},
        "created_at": iso_offset(-1)})
    await db.messages.insert_one({"msg_id": uid("msg"), "thread_id": tid_a, "sender_id": ava["user_id"],
                                  "text": "Hi Maya! We are preparing our holiday smart-wellness lineup. Would love to send you our smart LED rejuvenation mask for an honest review.", "created_at": iso_offset(-0.01)})

    # 4. Leo Tanaka (Gaming) - Read
    tid_l = thread_id_for(leo["user_id"], maya["user_id"])
    await db.threads.insert_one({
        "thread_id": tid_l, "participants": [leo["user_id"], maya["user_id"]],
        "last_message": "Yes! Got the review unit yesterday, let me know if you want to test co-op.",
        "last_at": iso_offset(-1.2), "last_sender_id": maya["user_id"],
        "reads": {leo["user_id"]: iso_offset(-1.0), maya["user_id"]: iso_offset(-1.2)},
        "created_at": iso_offset(-3)})
    await db.messages.insert_one({"msg_id": uid("msg"), "thread_id": tid_l, "sender_id": maya["user_id"], "text": "Hey Leo! Loved the stream yesterday, that 1v4 clutch was unbelievable.", "created_at": iso_offset(-2)})
    await db.messages.insert_one({"msg_id": uid("msg"), "thread_id": tid_l, "sender_id": leo["user_id"], "text": "Haha thanks Maya! Are you checking out the new handheld OLED console launch?", "created_at": iso_offset(-1.8)})
    await db.messages.insert_one({"msg_id": uid("msg"), "thread_id": tid_l, "sender_id": maya["user_id"], "text": "Yes! Got the review unit yesterday, let me know if you want to test co-op.", "created_at": iso_offset(-1.2)})

    # 5. Dario Velez (Travel) - Read
    tid_d = thread_id_for(dario["user_id"], maya["user_id"])
    await db.threads.insert_one({
        "thread_id": tid_d, "participants": [dario["user_id"], maya["user_id"]],
        "last_message": "Awesome, just ordered one. Appreciate the tip!",
        "last_at": iso_offset(-3.5), "last_sender_id": dario["user_id"],
        "reads": {dario["user_id"]: iso_offset(-3.5), maya["user_id"]: iso_offset(-3.2)},
        "created_at": iso_offset(-5)})
    await db.messages.insert_one({"msg_id": uid("msg"), "thread_id": tid_d, "sender_id": dario["user_id"], "text": "Hey Maya, what portable power bank do you recommend for heavy camera gear on flights?", "created_at": iso_offset(-4)})
    await db.messages.insert_one({"msg_id": uid("msg"), "thread_id": tid_d, "sender_id": maya["user_id"], "text": "Definitely the Anker Prime 27k mAh with 140W fast charge. It charges both laptop and camera quickly.", "created_at": iso_offset(-3.8)})
    await db.messages.insert_one({"msg_id": uid("msg"), "thread_id": tid_d, "sender_id": dario["user_id"], "text": "Awesome, just ordered one. Appreciate the tip!", "created_at": iso_offset(-3.5)})

    deal1 = {
        "deal_id": uid("deal"), "company_id": elena["user_id"], "creator_id": maya["user_id"],
        "title": "Launch Week Sprint",
        "deliverables": ["1 YouTube dedicated review (8+ min)", "3 Instagram reels", "Stories with link sticker"],
        "start_date": day_offset(7), "end_date": day_offset(21), "compensation": 9500,
        "agreement_text": "", "status": "in_review",
        "funding_status": "unfunded", "funded_at": "", "released_at": "", "stripe_session_id": "",
        "signatures": {"company": {"signed": False, "name": "", "signed_at": ""},
                       "creator": {"signed": False, "name": "", "signed_at": ""}},
        "created_at": iso_offset(-1), "updated_at": iso_offset(-1),
    }
    deal1["agreement_text"] = default_agreement(
        "Nova Athletics", "Maya Chen", "Launch Week Sprint", deal1["deliverables"],
        deal1["start_date"], deal1["end_date"], 9500)
    await db.contracts.insert_one(deal1)

    deal2 = {
        "deal_id": uid("deal"), "company_id": elena["user_id"], "creator_id": maya["user_id"],
        "title": "Marathon Expo Booth",
        "deliverables": ["2 YouTube vlogs", "Event-day stories"],
        "start_date": day_offset(-60), "end_date": day_offset(-46), "compensation": 6000,
        "agreement_text": "Signed at the expo booth — scope, timeline and fee agreed in writing.",
        "status": "completed", "funding_status": "released",
        "funded_at": iso_offset(-62), "released_at": iso_offset(-45),
        "stripe_session_id": "cs_test_seed_expo",
        "signatures": {"company": {"signed": True, "name": "Elena Brand", "signed_at": iso_offset(-62)},
                       "creator": {"signed": True, "name": "Maya Chen", "signed_at": iso_offset(-61)}},
        "created_at": iso_offset(-63), "updated_at": iso_offset(-45),
    }
    await db.contracts.insert_one(deal2)
    await db.reviews.insert_one({
        "review_id": uid("rev"), "deal_id": deal2["deal_id"], "campaign_title": "Marathon Expo Booth",
        "reviewer_id": elena["user_id"], "reviewee_id": maya["user_id"], "rating": 5,
        "comment": "Delivered early, great on-camera energy, audience loved the product.",
        "status": "approved", "moderated": True, "created_at": iso_offset(-44)})
    await db.reviews.insert_one({
        "review_id": uid("rev"), "deal_id": deal2["deal_id"], "campaign_title": "Marathon Expo Booth",
        "reviewer_id": maya["user_id"], "reviewee_id": elena["user_id"], "rating": 5,
        "comment": "Clear briefs, fast feedback, paid on time.",
        "status": "approved", "moderated": True, "created_at": iso_offset(-44)})

    await db.applications.insert_one({
        "app_id": uid("app"), "camp_id": campaigns[0]["camp_id"], "campaign_title": campaigns[0]["title"],
        "creator_id": jonas["user_id"], "company_id": elena["user_id"],
        "type": "invitation", "status": "pending",
        "message": "Your strength series would fit the runner launch perfectly.",
        "created_at": iso_offset(-1)})
    await db.applications.insert_one({
        "app_id": uid("app"), "camp_id": campaigns[2]["camp_id"], "campaign_title": campaigns[2]["title"],
        "creator_id": sofia["user_id"], "company_id": companies[2]["user_id"],
        "type": "application", "status": "pending",
        "message": "I did a ceramide routine video last month — it's my best performer.",
        "created_at": iso_offset(-1)})

    events = [
        {"event_id": uid("evt"), "title": "Brand audition call — Lumen", "date": day_offset(3),
         "type": "meeting", "color": "#4FC9D4", "status": "scheduled", "deal_id": "",
         "participants": [maya["user_id"]], "created_at": iso_offset(-4)},
        {"event_id": uid("evt"), "title": "Launch Week Sprint — publish window", "date": day_offset(7),
         "type": "campaign", "color": "#1ED760", "status": "scheduled", "deal_id": deal1["deal_id"],
         "participants": [elena["user_id"], maya["user_id"]], "created_at": iso_offset(-1)},
        {"event_id": uid("evt"), "title": "Q3 content planning", "date": day_offset(14),
         "type": "milestone", "color": "#D7F26B", "status": "scheduled", "deal_id": "",
         "participants": [elena["user_id"]], "created_at": iso_offset(-6)},
    ]
    for e in events:
        await db.events.insert_one(e)

    activities = [
        (elena["user_id"], "Opened the deal room: Launch Week Sprint.", -1),
        (maya["user_id"], "Received a sponsor invitation for Zero-Drop Runner Launch.", -1),
        (elena["user_id"], "Accepted Maya Chen's connection and opened chat.", -9),
        (maya["user_id"], "Completed a collaboration: Marathon Expo Booth (rated 5/5).", -44),
    ]
    for uid_, text, off in activities:
        await db.activities.insert_one({"act_id": uid("act"), "user_id": uid_, "text": text, "created_at": iso_offset(off)})

    logger.info("Seed data created")


@app.on_event("startup")
async def startup():
    try:
        await seed()
        # Idempotent escrow-field backfill for contracts created before payments existed.
        await db.contracts.update_many(
            {"funding_status": {"$exists": False}, "status": "completed"},
            {"$set": {"funding_status": "released", "released_at": now()}})
        await db.contracts.update_many(
            {"funding_status": {"$exists": False}},
            {"$set": {"funding_status": "unfunded"}})
    except Exception as e:
        logger.error(f"Startup migration failed: {e}")


@api_router.get("/")
async def root():
    return {"message": "CollaboNet API running"}


@api_router.get("/download/source")
async def download_source():
    root = ROOT_DIR.parent
    exclude_dirs = {"node_modules", "build", "dist", "__pycache__", ".git", ".cache", ".vscode"}
    zip_path = Path("/tmp/collabonet-source.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for folder, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for f in files:
                if f.endswith((".pyc", ".log")) or f in ("collabonet-code.zip", "collabonet-source.zip"):
                    continue
                fp = Path(folder) / f
                zf.write(fp, fp.relative_to(root))
    return FileResponse(zip_path, media_type="application/zip", filename="collabonet-code.zip")


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
