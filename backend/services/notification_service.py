from core.database import db
from core.security import uid, now


async def notify(
    user_id: str,
    type_: str,
    title: str,
    body: str = "",
    link: str = "",
    origin: str = "",
    actor_id: str = "",
) -> dict:
    resolved_origin = origin
    if not resolved_origin and actor_id:
        actor = await db.users.find_one({"user_id": actor_id}, {"_id": 0, "role": 1})
        if actor and actor.get("role"):
            resolved_origin = actor["role"]
    if not resolved_origin:
        if type_ in ("campaign", "invitation", "payment"):
            resolved_origin = "company"
        elif type_ in ("application", "review"):
            resolved_origin = "creator"
        else:
            resolved_origin = "system"

    doc = {
        "notif_id": uid("ntf"),
        "user_id": user_id,
        "type": type_,
        "title": title,
        "body": body,
        "link": link,
        "read": False,
        "origin": resolved_origin,
        "actor_id": actor_id,
        "created_at": now(),
    }
    await db.notifications.insert_one(doc)
    return doc


async def log_activity(user_id: str, text: str):
    await db.activities.insert_one({
        "act_id": uid("act"),
        "user_id": user_id,
        "text": text,
        "created_at": now(),
    })
