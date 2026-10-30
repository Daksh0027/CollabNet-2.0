from dataclasses import dataclass
import os
from typing import Any, Dict, Optional

import stripe


@dataclass
class CheckoutSessionRequest:
    amount: float
    currency: str
    success_url: str
    cancel_url: str
    metadata: Optional[Dict[str, str]] = None


@dataclass
class CheckoutStatusResponse:
    session_id: str
    status: str
    payment_status: str


@dataclass
class CheckoutWebhookResponse:
    session_id: str
    event_type: str
    payment_status: str = ""


class StripeCheckout:
    def __init__(self, api_key: str, webhook_url: str = ""):
        self.api_key = api_key
        self.webhook_url = webhook_url
        stripe.api_key = api_key

    async def create_checkout_session(self, request: CheckoutSessionRequest) -> Any:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": request.currency,
                    "product_data": {"name": "CollaboNet collaboration escrow"},
                    "unit_amount": round(request.amount * 100),
                },
                "quantity": 1,
            }],
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata=request.metadata or {},
        )
        return session

    async def get_checkout_status(self, session_id: str) -> CheckoutStatusResponse:
        session = stripe.checkout.Session.retrieve(session_id)
        return CheckoutStatusResponse(
            session_id=session.id,
            status=session.status or "",
            payment_status=session.payment_status or "",
        )

    async def handle_webhook(self, body: bytes, signature: str) -> CheckoutWebhookResponse:
        event = stripe.Webhook.construct_event(
            payload=body,
            sig_header=signature,
            secret=os.environ["STRIPE_WEBHOOK_SECRET"],
        )
        session = event.data.object
        return CheckoutWebhookResponse(
            session_id=session.id,
            event_type=event.type,
            payment_status=getattr(session, "payment_status", "") or "",
        )
