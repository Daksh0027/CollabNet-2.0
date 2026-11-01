"""Moderation analytics — event logging + aggregate statistics.

Logs go to the `moderation_events` collection. Contact details are never
stored verbatim: matched content is masked, only category/platform/scores are
kept. Access to stats/events is admin-only (enforced in server.py).
"""
from datetime import datetime, timezone
from typing import Optional

from pymongo import ReturnDocument
from pymongo.errors import PyMongoError

from moderation.types import ModerationDecision, Status

COLLECTION = "moderation_events"


def mask(text: str) -> str:
    """Mask matched content so raw contact info never lands in logs."""
    if not text:
        return ""
    t = str(text)
    if len(t) <= 3:
        return "*" * len(t)
    return f"{t[:2]}{'*' * min(8, len(t) - 3)}{t[-1]}"


async def log_event(db, decision: ModerationDecision, *, message_id: str,
                    conversation_id: str, sender_id: str, recipient_id: str,
                    ai_failed: bool = False, message_length: int = 0) -> None:
    top = decision.matches[0] if decision.matches else None
    doc = {
        "event_id": f"mod_{message_id}",
        "message_id": message_id,
        "conversation_id": conversation_id,
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "category": decision.category.value,
        "platform": (top.platform if top else (decision.ai.platform if decision.ai else None)),
        "decision": decision.status.value,
        "detectionMethod": decision.detectionMethod.value,
        "riskScore": decision.riskScore,
        "confidence": decision.confidence,
        "matched_masked": [mask(m.matched_text) for m in decision.matches[:5]],
        "ai_failed": ai_failed,
        "message_length": message_length,
        "reported_false_positive": False,
        "latency_ms": decision.latency_ms,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db[COLLECTION].insert_one(doc)
    except PyMongoError:
        # analytics must never break message delivery
        pass


async def get_stats(db) -> dict:
    total = await db[COLLECTION].count_documents({})
    blocked = await db[COLLECTION].count_documents({"decision": Status.BLOCKED.value})
    approved = await db[COLLECTION].count_documents({"decision": Status.APPROVED.value})
    held = await db[COLLECTION].count_documents({"decision": Status.HELD.value})
    deterministic = await db[COLLECTION].count_documents({"detectionMethod": "DETERMINISTIC"})
    ai_classified = await db[COLLECTION].count_documents({"detectionMethod": {"$in": ["AI", "HYBRID"]}})
    ai_failures = await db[COLLECTION].count_documents({"ai_failed": True})
    false_positives = await db[COLLECTION].count_documents({"reported_false_positive": True})

    latency_pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$latency_ms"}}}]
    latency = await db[COLLECTION].aggregate(latency_pipeline).to_list(1)

    category_pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    categories = await db[COLLECTION].aggregate(category_pipeline).to_list(20)

    return {
        "totalChecked": total,
        "blocked": blocked,
        "approved": approved,
        "held": held,
        "deterministicDetections": deterministic,
        "aiClassified": ai_classified,
        "aiFailures": ai_failures,
        "falsePositiveReports": false_positives,
        "avgLatencyMs": round(latency[0]["avg"], 1) if latency and latency[0].get("avg") is not None else 0,
        "categoryDistribution": [
            {"category": c["_id"], "count": c["count"]} for c in categories if c["_id"]
        ],
    }


async def list_events(db, limit: int = 50, decision: Optional[str] = None) -> list:
    query = {"decision": decision} if decision else {}
    cursor = db[COLLECTION].find(query, {"_id": 0}).sort("created_at", -1).to_list(min(limit, 200))
    return await cursor


async def mark_false_positive(db, event_id: str) -> Optional[dict]:
    doc = await db[COLLECTION].find_one_and_update(
        {"event_id": event_id}, {"$set": {"reported_false_positive": True}},
        return_document=ReturnDocument.AFTER,
    )
    return doc
