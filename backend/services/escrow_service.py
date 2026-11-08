from core.database import db
from core.security import now
from services.notification_service import notify, log_activity


async def settle_escrow(session_id: str):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx or tx.get("payment_status") != "paid":
        return
    result = await db.contracts.update_one(
        {"deal_id": tx["deal_id"], "funding_status": {"$ne": "funded"}},
        {"$set": {
            "funding_status": "funded",
            "funded_at": now(),
            "funded_amount": tx.get("amount", 0),
            "funding_percent": tx.get("escrow_percent", 100),
            "stripe_session_id": session_id,
        }},
    )
    if result.modified_count:
        c = await db.contracts.find_one({"deal_id": tx["deal_id"]}, {"_id": 0})
        if c:
            for pid in (c["company_id"], c["creator_id"]):
                await notify(
                    pid,
                    "payment",
                    f"Escrow funded: {c['title']}",
                    "The campaign fee is secured. Released on delivery.",
                    "/app/contracts",
                    origin="system",
                    actor_id=c.get("company_id", ""),
                )
                await log_activity(pid, f"Escrow funded for {c['title']}.")


async def complete_payment_and_settle(session_id: str):
    await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid", "updated_at": now()}},
    )
    await settle_escrow(session_id)
