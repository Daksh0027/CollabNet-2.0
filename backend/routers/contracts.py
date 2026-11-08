import hashlib
import json
import math
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from core.config import BANNED_WORDS
from core.database import db
from core.dependencies import enrich_user, get_user
from core.security import day_offset, display_name, now, uid
from services.contract_service import (
    contract_history,
    contract_snapshot,
    default_agreement,
    enrich_contract,
)
from services.chat_service import add_contract_chat_message
from services.notification_service import log_activity, notify

router = APIRouter(tags=["contracts"])


class ContractIn(BaseModel):
    counterpart_id: str
    title: str
    deliverables: List[str] = []
    start_date: str = ""
    end_date: str = ""
    compensation: float = 0
    agreement_text: str = ""


class ContractRevisionIn(BaseModel):
    title: str
    deliverables: List[str] = []
    start_date: str = ""
    end_date: str = ""
    compensation: float = 0
    agreement_text: str = ""
    change_summary: str = ""


class ContractChangeRequestIn(BaseModel):
    version: int
    comment: str


class SignIn(BaseModel):
    name: str
    strokes: Optional[List[List[dict]]] = None


class DisputeIn(BaseModel):
    reason: str


class ReviewIn(BaseModel):
    rating: int
    comment: str = ""


@router.get("/contracts")
async def list_contracts(request: Request):
    user = await get_user(request)
    q = {"$or": [{"company_id": user["user_id"]}, {"creator_id": user["user_id"]}]}
    docs = await db.contracts.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)
    out = []
    for c in docs:
        other_id = c["creator_id"] if user["user_id"] == c["company_id"] else c["company_id"]
        out.append({
            **enrich_contract(c, user["user_id"]),
            "other": await enrich_user(other_id),
            "my_role": "company" if user["user_id"] == c["company_id"] else "creator",
        })
    return out


@router.get("/contracts/{deal_id}/history")
async def contract_history_endpoint(deal_id: str, request: Request):
    user = await get_user(request)
    c = await db.contracts.find_one({"deal_id": deal_id}, {"_id": 0})
    if not c or user["user_id"] not in (c["company_id"], c["creator_id"]):
        raise HTTPException(404, "Deal not found")
    return {
        "deal_id": deal_id,
        "current_version": c.get("current_version", contract_history(c)[-1]["version"]),
        "accepted_version": c.get("accepted_version"),
        "versions": contract_history(c),
        "change_requests": c.get("change_requests", []),
    }


@router.get("/contracts/{deal_id}")
async def get_contract(deal_id: str, request: Request):
    user = await get_user(request)
    c = await db.contracts.find_one({"deal_id": deal_id}, {"_id": 0})
    if not c or user["user_id"] not in (c["company_id"], c["creator_id"]):
        raise HTTPException(404, "Deal not found")
    other_id = c["creator_id"] if user["user_id"] == c["company_id"] else c["company_id"]
    reviews = await db.reviews.find({"deal_id": deal_id}, {"_id": 0}).to_list(10)
    return {
        **enrich_contract(c, user["user_id"]),
        "other": await enrich_user(other_id),
        "my_role": "company" if user["user_id"] == c["company_id"] else "creator",
        "reviews": reviews,
    }


@router.post("/contracts")
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
        ],
        "status": "accepted",
    }, {"_id": 0})
    if not conn:
        raise HTTPException(403, "You need an accepted connection before opening a deal room")
    is_company = user.get("role") == "company"
    company_id = user["user_id"] if is_company else payload.counterpart_id
    creator_id = payload.counterpart_id if is_company else user["user_id"]
    agreement = payload.agreement_text.strip() or default_agreement(
        display_name(user) if is_company else display_name(other),
        display_name(other) if is_company else display_name(user),
        payload.title,
        payload.deliverables,
        payload.start_date or "TBD",
        payload.end_date or "TBD",
        int(payload.compensation),
    )
    doc = {
        "deal_id": uid("deal"),
        "company_id": company_id,
        "creator_id": creator_id,
        "title": payload.title,
        "deliverables": [d for d in payload.deliverables if d.strip()],
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "compensation": payload.compensation,
        "agreement_text": agreement,
        "status": "in_review",
        "signatures": {
            "company": {"signed": False, "name": "", "signed_at": ""},
            "creator": {"signed": False, "name": "", "signed_at": ""},
        },
        "funding_status": "unfunded",
        "funded_at": "",
        "released_at": "",
        "stripe_session_id": "",
        "current_version": 1,
        "accepted_version": None,
        "versions": [],
        "change_requests": [],
        "created_at": now(),
        "updated_at": now(),
    }
    doc["versions"] = [contract_snapshot(doc, 1, user["user_id"], "Original agreement")]
    await db.contracts.insert_one(doc)
    doc.pop("_id", None)
    await notify(
        payload.counterpart_id,
        "contract",
        f"Deal room opened: {payload.title}",
        f"{display_name(user)} drafted an agreement for review.",
        "/app/contracts",
        origin=user.get("role", "company"),
        actor_id=user["user_id"],
    )
    await log_activity(user["user_id"], f"Opened deal room: {payload.title}.")
    return doc


@router.post("/contracts/{deal_id}/revisions")
async def revise_contract(deal_id: str, payload: ContractRevisionIn, request: Request):
    user = await get_user(request)
    c = await db.contracts.find_one({"deal_id": deal_id}, {"_id": 0})
    if not c or user["user_id"] not in (c["company_id"], c["creator_id"]):
        raise HTTPException(404, "Deal not found")
    if c.get("status") in ("completed", "disputed"):
        raise HTTPException(400, "Completed or disputed contracts cannot be revised")
    if c.get("funding_status") in ("funded", "released"):
        raise HTTPException(400, "Funded contracts require an amendment flow and cannot be revised here")
    if not payload.title.strip():
        raise HTTPException(400, "A contract title is required")
    current_version = c.get("current_version", contract_history(c)[-1]["version"])
    revision = {
        "title": payload.title.strip(),
        "deliverables": [d.strip() for d in payload.deliverables if d.strip()],
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "compensation": payload.compensation,
        "agreement_text": payload.agreement_text.strip() or default_agreement(
            display_name(await db.users.find_one({"user_id": c["company_id"]}, {"_id": 0})),
            display_name(await db.users.find_one({"user_id": c["creator_id"]}, {"_id": 0})),
            payload.title,
            payload.deliverables,
            payload.start_date or "TBD",
            payload.end_date or "TBD",
            int(payload.compensation),
        ),
    }
    version_doc = contract_snapshot(
        {**c, **revision},
        current_version + 1,
        user["user_id"],
        payload.change_summary.strip() or "Updated contract terms",
    )
    versions = contract_history(c) + [version_doc]
    await db.contracts.update_one(
        {"deal_id": deal_id},
        {"$set": {
            **revision,
            "current_version": version_doc["version"],
            "accepted_version": None,
            "versions": versions,
            "status": "in_review",
            "signatures": {
                "company": {"signed": False, "name": "", "signed_at": ""},
                "creator": {"signed": False, "name": "", "signed_at": ""},
            },
            "updated_at": now(),
        }},
    )
    other_id = c["creator_id"] if user["user_id"] == c["company_id"] else c["company_id"]
    await notify(
        other_id,
        "contract",
        f"Contract revision {version_doc['version']} for {c['title']}",
        "Review the updated terms and request changes or sign the new version.",
        "/app/contracts",
        origin=user.get("role", "company"),
        actor_id=user["user_id"],
    )
    await add_contract_chat_message(
        c,
        user["user_id"],
        f"Contract revision v{version_doc['version']} sent for review: {version_doc['change_summary']}",
    )
    await log_activity(user["user_id"], f"Created contract revision {version_doc['version']} for {c['title']}.")
    return version_doc


@router.post("/contracts/{deal_id}/change-requests")
async def request_contract_changes(deal_id: str, payload: ContractChangeRequestIn, request: Request):
    user = await get_user(request)
    c = await db.contracts.find_one({"deal_id": deal_id}, {"_id": 0})
    if not c or user["user_id"] not in (c["company_id"], c["creator_id"]):
        raise HTTPException(404, "Deal not found")
    current_version = c.get("current_version", contract_history(c)[-1]["version"])
    if payload.version != current_version:
        raise HTTPException(409, "Change requests must target the current contract version")
    comment = payload.comment.strip()
    if not comment:
        raise HTTPException(400, "Explain the requested change")
    change = {
        "change_request_id": uid("chg"),
        "version": payload.version,
        "requester_id": user["user_id"],
        "comment": comment,
        "status": "open",
        "created_at": now(),
    }
    await db.contracts.update_one(
        {"deal_id": deal_id},
        {
            "$set": {
                "status": "in_review",
                "accepted_version": None,
                "signatures": {
                    "company": {"signed": False, "name": "", "signed_at": ""},
                    "creator": {"signed": False, "name": "", "signed_at": ""},
                },
                "updated_at": now(),
            },
            "$push": {"change_requests": change},
        },
    )
    other_id = c["creator_id"] if user["user_id"] == c["company_id"] else c["company_id"]
    await notify(
        other_id,
        "contract",
        f"Changes requested for {c['title']}",
        comment,
        "/app/contracts",
        origin=user.get("role", "company"),
        actor_id=user["user_id"],
    )
    await add_contract_chat_message(
        c,
        user["user_id"],
        f"Changes requested on contract v{payload.version}: {comment}",
    )
    await log_activity(user["user_id"], f"Requested changes to version {payload.version} of {c['title']}.")
    return change


@router.post("/contracts/{deal_id}/sign")
async def sign_contract(deal_id: str, payload: SignIn, request: Request):
    user = await get_user(request)
    c = await db.contracts.find_one({"deal_id": deal_id}, {"_id": 0})
    if not c or user["user_id"] not in (c["company_id"], c["creator_id"]):
        raise HTTPException(404, "Deal not found")
    role = "company" if user["user_id"] == c["company_id"] else "creator"
    if c["signatures"][role]["signed"]:
        raise HTTPException(400, "Already signed")
    strokes = payload.strokes or []
    point_count = sum(len(stroke) for stroke in strokes)
    if not payload.name.strip():
        raise HTTPException(400, "Signer name is required")
    if not 1 <= len(strokes) <= 100 or point_count < 2 or point_count > 5000:
        raise HTTPException(400, "A drawn signature is required")
    for stroke in strokes:
        for point in stroke:
            if not isinstance(point, dict) or not all(
                isinstance(point.get(axis), (int, float))
                and math.isfinite(point[axis])
                and 0 <= point[axis] <= (300 if axis == "x" else 180)
                for axis in ("x", "y")
            ):
                raise HTTPException(400, "Invalid signature stroke data")

    signed_at = now()
    signature_json = json.dumps(strokes, sort_keys=True, separators=(",", ":"))
    audit = {
        "signer_id": user["user_id"],
        "ip_address": request.client.host if request.client else "",
        "user_agent": request.headers.get("user-agent", "")[:500],
        "signed_at": signed_at,
        "document_hash": hashlib.sha256(
            json.dumps(contract_history(c)[-1], sort_keys=True).encode("utf-8")
        ).hexdigest(),
        "signature_hash": hashlib.sha256(signature_json.encode("utf-8")).hexdigest(),
        "verification_id": uid("verify"),
    }
    sig = {f"signatures.{role}": {
        "signed": True,
        "name": payload.name.strip(),
        "signed_at": signed_at,
        "strokes": strokes,
        "audit": audit,
        "verification_id": audit["verification_id"],
    }}
    both = (c["signatures"]["company"]["signed"] or role == "company") and \
           (c["signatures"]["creator"]["signed"] or role == "creator")
    upd = {**sig, "updated_at": now()}
    if both:
        upd["status"] = "upcoming"
        upd["accepted_version"] = c.get("current_version", contract_history(c)[-1]["version"])
    await db.contracts.update_one({"deal_id": deal_id}, {"$set": upd})
    if both:
        start = c["start_date"] or day_offset(7)
        await db.events.insert_one({
            "event_id": uid("evt"),
            "title": f"{c['title']} — publish window",
            "date": start,
            "type": "campaign",
            "color": "#F4610A",
            "status": "scheduled",
            "deal_id": deal_id,
            "participants": [c["company_id"], c["creator_id"]],
            "created_at": now(),
        })
        for pid in (c["company_id"], c["creator_id"]):
            await notify(
                pid,
                "contract",
                f"Agreement signed: {c['title']}",
                "The campaign was added to both calendars.",
                "/app/calendar",
                origin=user.get("role", "creator"),
                actor_id=user["user_id"],
            )
            await log_activity(pid, f"E-signed the agreement for {c['title']}.")
    return {"ok": True, "status": "upcoming" if both else "in_review"}


@router.post("/contracts/{deal_id}/complete")
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
            {"$set": {"status": "released", "escrow_released_at": now()}},
        )
    for pid in (c["company_id"], c["creator_id"]):
        await notify(
            pid,
            "contract",
            f"Campaign delivered: {c['title']}",
            "Funds released from escrow — payout queued." if released
            else "Leave a moderated rating for your partner.",
            "/app/contracts",
            origin="creator",
            actor_id=user["user_id"],
        )
        await log_activity(
            pid,
            f"Marked {c['title']} as delivered." +
            (" Funds released from escrow." if released else ""),
        )
    return {"ok": True}


@router.post("/contracts/{deal_id}/dispute")
async def dispute_contract(deal_id: str, payload: DisputeIn, request: Request):
    user = await get_user(request)
    c = await db.contracts.find_one({"deal_id": deal_id}, {"_id": 0})
    if not c or user["user_id"] not in (c["company_id"], c["creator_id"]):
        raise HTTPException(404, "Deal not found")
    await db.contracts.update_one({"deal_id": deal_id}, {"$set": {"status": "disputed", "updated_at": now()}})
    other_id = c["creator_id"] if user["user_id"] == c["company_id"] else c["company_id"]
    await notify(
        other_id,
        "dispute",
        f"Dispute raised on {c['title']}",
        "CollaboNet review will mediate — no public accusations.",
        "/app/contracts",
        origin=user.get("role", "creator"),
        actor_id=user["user_id"],
    )
    await log_activity(user["user_id"], f"Raised a dispute on {c['title']} — routed to platform review.")
    return {"ok": True}


@router.post("/contracts/{deal_id}/review")
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
        "review_id": uid("rev"),
        "deal_id": deal_id,
        "campaign_title": c["title"],
        "reviewer_id": user["user_id"],
        "reviewee_id": reviewee_id,
        "rating": max(1, min(5, payload.rating)),
        "comment": payload.comment,
        "status": "pending" if flagged else "approved",
        "moderated": True,
        "created_at": now(),
    }
    await db.reviews.insert_one(doc)
    doc.pop("_id", None)
    await notify(
        reviewee_id,
        "review",
        f"New rating on {c['title']}",
        "Received a moderated rating.",
        "/app/contracts",
        origin=user.get("role", "creator"),
        actor_id=user["user_id"],
    )
    return doc
