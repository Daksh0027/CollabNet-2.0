from typing import List, Optional
import uuid
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel
import httpx
from core.config import AUTH_EXCHANGE_URL, SESSION_COOKIE
from core.database import db
from core.dependencies import get_user, require_role
from core.security import build_new_user, display_name, now, pub_user, start_session
from services.notification_service import log_activity, notify

router = APIRouter(tags=["auth"])


class SessionIn(BaseModel):
    session_id: str


class RoleIn(BaseModel):
    role: str


class DemoIn(BaseModel):
    role: str
    email: Optional[str] = None


class SocialVerifyIn(BaseModel):
    platforms: List[dict]


class CompanyVerifyIn(BaseModel):
    company_name: str
    industry: str = ""
    website: str = ""
    employees: int = 0
    about: str = ""
    company_email: str = ""


@router.post("/auth/session")
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
        await notify(
            user["user_id"],
            "system",
            "Welcome to CollaboNet",
            "Pick your account type to get started.",
            "/onboarding",
            origin="system",
        )
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
    return pub_user(user, full=True, include_private_rates=True)


@router.post("/auth/demo")
async def auth_demo(payload: DemoIn, response: Response):
    if payload.role not in ("creator", "company"):
        raise HTTPException(400, "role must be creator or company")
    query = {"role": payload.role}
    if payload.email:
        query["email"] = payload.email.lower().strip()
    else:
        query["email"] = {"$regex": "@collabonet\\.demo$|@demo$"}
    user = await db.users.find_one(query, {"_id": 0})
    if not user:
        user = await db.users.find_one({"role": payload.role}, {"_id": 0})
    if not user:
        raise HTTPException(404, "No demo account seeded")
    await start_session(response, user, f"demo_{uuid.uuid4().hex}")
    return pub_user(user, full=True, include_private_rates=True)


@router.post("/auth/role")
async def auth_role(payload: RoleIn, request: Request):
    user = await get_user(request)
    if payload.role not in ("creator", "company"):
        raise HTTPException(400, "Invalid role")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"role": payload.role}})
    role_label = "creator" if payload.role == "creator" else "company / sponsor"
    await log_activity(user["user_id"], f"Joined CollaboNet as a {role_label}.")
    return {"ok": True, "role": payload.role}


@router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_user(request)
    return pub_user(user, full=True, include_private_rates=True)


@router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        await db.sessions.delete_one({"session_token": token})
    response.delete_cookie(key=SESSION_COOKIE, path="/")
    return {"ok": True}


@router.post("/verify/social")
async def verify_social(payload: SocialVerifyIn, request: Request):
    user = await get_user(request)
    require_role(user, "creator")
    platforms = [p for p in payload.platforms if p.get("platform") and p.get("handle")]
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "verified": True,
            "creator.platforms": platforms,
            "creator.verification_mock": "simulated-oauth",
            "verified_at": now(),
        }},
    )
    await notify(
        user["user_id"],
        "verification",
        "Accounts connected",
        "Your social accounts were verified (simulated).",
        "/app/account",
        origin="system",
    )
    await log_activity(user["user_id"], f"Connected {len(platforms)} social account(s) — profile verified.")
    return {"ok": True, "verified": True}


@router.post("/verify/company")
async def verify_company(payload: CompanyVerifyIn, request: Request):
    user = await get_user(request)
    require_role(user, "company")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "verified": True,
            "company": {
                "name": payload.company_name,
                "industry": payload.industry,
                "website": payload.website,
                "employees": payload.employees,
                "about": payload.about,
                "company_email": payload.company_email,
                "verification_mock": "email + onboarding call (simulated)",
            },
            "verified_at": now(),
        }},
    )
    await notify(
        user["user_id"],
        "verification",
        "Company verified",
        "Company details confirmed. Your onboarding call slot is booked (simulated).",
        "/app/account",
        origin="system",
    )
    await log_activity(user["user_id"], "Completed company verification and booked the onboarding call.")
    return {"ok": True, "verified": True}
