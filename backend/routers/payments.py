from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from core.config import STRIPE_API_KEY
from core.database import db
from core.dependencies import get_user
from core.security import now, uid
from emergentintegrations.payments.stripe.checkout import (
    CheckoutSessionRequest,
    StripeCheckout,
)
from services.escrow_service import complete_payment_and_settle

router = APIRouter(tags=["payments"])


class PayOriginIn(BaseModel):
    origin_url: str
    escrow_percent: float = Field(default=100, ge=10, le=100)
    escrow_amount: Optional[float] = Field(default=None, gt=0)


@router.post("/payments/checkout/{deal_id}")
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
    total_compensation = round(float(c["compensation"]), 2)
    minimum_escrow = round(total_compensation * 0.1, 2)
    escrow_amount = round(
        payload.escrow_amount
        if payload.escrow_amount is not None
        else total_compensation * payload.escrow_percent / 100,
        2,
    )
    if escrow_amount < minimum_escrow:
        raise HTTPException(400, "Escrow amount must be at least 10% of the deal")
    if escrow_amount > total_compensation:
        raise HTTPException(400, "Escrow amount cannot exceed the deal compensation")
    escrow_percent = round(escrow_amount / total_compensation * 100, 2)
    host_url = str(request.base_url)
    sc = StripeCheckout(
        api_key=STRIPE_API_KEY,
        webhook_url=f"{host_url}api/webhook/stripe",
    )
    sess_req = CheckoutSessionRequest(
        amount=escrow_amount,
        currency="usd",
        success_url=f"{payload.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&deal_id={deal_id}",
        cancel_url=f"{payload.origin_url}/payment/cancel?deal_id={deal_id}",
        metadata={"deal_id": deal_id, "company_id": c["company_id"], "creator_id": c["creator_id"]},
    )
    session = await sc.create_checkout_session(sess_req)
    await db.payment_transactions.insert_one({
        "tx_id": uid("tx"),
        "session_id": session.session_id,
        "deal_id": deal_id,
        "title": c["title"],
        "company_id": c["company_id"],
        "creator_id": c["creator_id"],
        "amount": escrow_amount,
        "currency": "usd",
        "escrow_percent": escrow_percent,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": now(),
        "updated_at": now(),
    })
    return {"checkout_url": session.url, "session_id": session.session_id}


@router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Transaction not found")
    if tx.get("payment_status") != "paid":
        try:
            host_url = str(request.base_url)
            sc = StripeCheckout(
                api_key=STRIPE_API_KEY,
                webhook_url=f"{host_url}api/webhook/stripe",
            )
            st = await sc.get_checkout_status(session_id)
            if st.payment_status == "paid" or st.status == "complete":
                await complete_payment_and_settle(session_id)
        except Exception:
            pass
        tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    return {"session_id": tx["session_id"], "status": tx["status"], "payment_status": tx["payment_status"]}


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url)
    sc = StripeCheckout(
        api_key=STRIPE_API_KEY,
        webhook_url=f"{host_url}api/webhook/stripe",
    )
    try:
        res = await sc.handle_webhook(body, sig)
    except Exception:
        raise HTTPException(400, "Invalid webhook signature")
    if res.session_id and (
        res.event_type == "checkout.session.completed"
        or getattr(res, "payment_status", "") == "paid"
    ):
        await complete_payment_and_settle(res.session_id)
    return {"status": "ok"}
