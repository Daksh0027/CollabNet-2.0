import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Response
from core.config import CORS_ORIGINS, DEFAULT_ON_TIME_RATE, SESSION_COOKIE
from core.database import db


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def day_offset(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")


def iso_offset(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def display_name(u: Optional[dict]) -> str:
    if not u:
        return "Unknown"
    if u.get("role") == "company" and u.get("company", {}).get("name"):
        return u["company"]["name"]
    return u.get("name") or u.get("email", "").split("@")[0]


def pub_user(
    u: Optional[dict],
    full: bool = False,
    include_private_rates: bool = False,
) -> Optional[dict]:
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
    if u.get("role") == "creator" and u.get("creator"):
        c = u["creator"]
        base["creator"] = {
            "niche": c.get("niche", ""),
            "sub_niches": c.get("sub_niches", []),
            "bio": c.get("bio", ""),
            "pitch": c.get("pitch", ""),
            "location": c.get("location", ""),
            "content_types": c.get("content_types", []),
            "commercial_terms": c.get("commercial_terms", []),
            "platforms": c.get("platforms", []),
            "projects": c.get("projects", []),
            "stats": c.get("stats", {}),
            "connections_count": c.get("connections_count", 0),
            "completed_deals_count": c.get("completed_deals_count", 0),
            "on_time_delivery_rate": c.get("on_time_delivery_rate", DEFAULT_ON_TIME_RATE),
        }
    elif u.get("role") == "company" and u.get("company"):
        co = u["company"]
        base["company"] = {
            "name": co.get("name", ""),
            "industry": co.get("industry", ""),
            "employees": co.get("employees", 0),
            "website": co.get("website", ""),
            "about": co.get("about", ""),
            "commercial_terms": co.get("commercial_terms", []),
            "total_spend": co.get("total_spend", 0),
            "completed_campaigns_count": co.get("completed_campaigns_count", 0),
            "avg_payout_hours": co.get("avg_payout_hours", 24),
            "connections_count": co.get("connections_count", 0),
        }
    if full:
        base["email"] = u.get("email", "")
        if u.get("company"):
            base["company"] = u.get("company", {})
        if u.get("creator"):
            creator = u.get("creator", {})
            base["creator"] = creator if include_private_rates else {
                key: value for key, value in creator.items() if key != "rates"
            }
        base["created_at"] = u.get("created_at")
    return base


def build_new_user(email: str, name: str, picture: str) -> dict:
    return {
        "user_id": uid("user"),
        "email": email,
        "name": name or email.split("@")[0],
        "picture": picture,
        "role": None,
        "verified": False,
        "company": {},
        "creator": {},
        "created_at": now(),
    }


async def start_session(response: Response, user: dict, token: str):
    await db.sessions.insert_one({
        "session_id": uid("sess"),
        "user_id": user["user_id"],
        "session_token": token,
        "expires_at": iso_offset(7),
        "created_at": now(),
    })
    is_secure = not ("localhost" in CORS_ORIGINS or CORS_ORIGINS == "*")
    samesite = "none" if is_secure else "lax"
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        secure=is_secure,
        samesite=samesite,
        path="/",
        max_age=7 * 24 * 3600,
    )
