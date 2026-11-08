from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, Request
from core.config import SESSION_COOKIE
from core.database import db
from core.security import pub_user


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


async def enrich_user(user_id: str) -> Optional[dict]:
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return pub_user(u) if u else None


async def enrich_users(user_ids: List[str]) -> dict:
    if not user_ids:
        return {}
    unique_ids = list(set(uid for uid in user_ids if uid))
    users = await db.users.find({"user_id": {"$in": unique_ids}}, {"_id": 0}).to_list(len(unique_ids) or 1)
    return {u["user_id"]: pub_user(u) for u in users}


def require_role(user: dict, role: str):
    if user.get("role") != role:
        raise HTTPException(403, f"This action requires a {role} account")
