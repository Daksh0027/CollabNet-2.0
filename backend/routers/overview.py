from fastapi import APIRouter, Request
from core.database import db
from core.dependencies import enrich_user, get_user

router = APIRouter(tags=["overview"])


@router.get("/overview")
async def overview(request: Request):
    user = await get_user(request)
    uid_ = user["user_id"]
    activities = await db.activities.find({"user_id": uid_}, {"_id": 0}).sort("created_at", -1).to_list(8)
    conns = await db.connections.find(
        {"$or": [{"from_id": uid_}, {"to_id": uid_}]},
        {"_id": 0},
    ).to_list(200)
    contracts = await db.contracts.find(
        {"$or": [{"company_id": uid_}, {"creator_id": uid_}]},
        {"_id": 0},
    ).to_list(200)

    async def with_other(c):
        other_id = c["creator_id"] if uid_ == c["company_id"] else c["company_id"]
        return {**c, "other": await enrich_user(other_id)}

    if user.get("role") == "creator":
        accepted = [c for c in conns if c["status"] == "accepted"]
        active = [c for c in contracts if c["status"] in ("in_review", "upcoming", "active")]
        completed = [c for c in contracts if c["status"] == "completed"]
        earnings = sum(c.get("compensation", 0) for c in completed)
        apps = await db.applications.find(
            {"creator_id": uid_, "type": "invitation", "status": "pending"},
            {"_id": 0},
        ).sort("created_at", -1).to_list(20)
        invitations = [{**a, "company": await enrich_user(a["company_id"])} for a in apps]
        recent_collabs = [await with_other(c) for c in completed[:4]]
        if not user.get("verified"):
            next_step = "Connect your social accounts to get verified."
        elif not user.get("creator", {}).get("rates"):
            next_step = "Add your rates so sponsors know where to start."
        elif any(c["status"] == "pending" and c["to_id"] == uid_ for c in conns):
            next_step = "You have connection requests waiting for a response."
        elif any(c["status"] == "in_review" and not (c.get("signatures") or {}).get("creator", {}).get("signed") for c in contracts):
            next_step = "An agreement is waiting for your e-signature."
        elif active:
            next_step = "Deliver on your active deals — check the calendar."
        else:
            next_step = "Explore open campaigns and send your first application."
        return {
            "role": "creator",
            "tiles": {
                "connections": len(accepted),
                "active_deals": len(active),
                "earnings": earnings,
                "collaborations": len(completed),
            },
            "invitations": invitations,
            "recent_collaborations": recent_collabs,
            "requests_in": [c for c in conns if c["status"] == "pending" and c["to_id"] == uid_],
            "activities": activities,
            "next_step": next_step,
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
        elif any(c["status"] == "in_review" and not (c.get("signatures") or {}).get("company", {}).get("signed") for c in contracts):
            next_step = "Sign the pending agreement to lock in the campaign."
        else:
            next_step = "Explore creators and scale the roster."
        return {
            "role": "company",
            "tiles": {
                "connected_creators": len(accepted),
                "open_briefs": open_briefs,
                "in_negotiation": len(in_negotiation),
                "total_spend": spend,
            },
            "requests_in": enriched_reqs,
            "activities": activities,
            "next_step": next_step,
        }
