"""Central moderation service — the single entry point used by every message
submission pathway (HTTP today; the same function covers any socket handler
tomorrow, since it never touches the frontend).

Pipeline: authenticate/validate (caller) -> normalize -> deterministic
detection -> risk scoring -> (conditional) AI classification -> decision.
"""
import logging
import time
import uuid
from datetime import datetime, timezone

from moderation.ai_classifier import (
    AIUnavailable, ai_configured, check_rate_limit, classify_message,
)
from moderation.analytics import log_event
from moderation.detectors.deterministic import run_deterministic
from moderation.normalization import normalize
from moderation.risk_scoring import aggregate_risk, block_reason, decide, needs_ai
from moderation.types import (
    Category, DetectionMethod, Match, ModerationDecision, Status,
)

logger = logging.getLogger("moderation")


def _hint(matches) -> str:
    if not matches:
        return "none"
    return ", ".join(sorted({m.rule_id for m in matches})[:5])


async def moderate_message(db, *, message: str, sender_id: str,
                           conversation_id: str, recipient_id: str,
                           message_id: str = "") -> ModerationDecision:
    """Moderate one outgoing message. Never raises for provider issues:
    ambiguous messages under a failing AI provider come back HELD (fail-closed).
    """
    started = time.monotonic()
    decision = await _run(message, sender_id, started)
    decision.latency_ms = int((time.monotonic() - started) * 1000)

    if not message_id:
        message_id = f"unsent_{uuid.uuid4().hex[:12]}"
    try:
        await log_event(db, decision, message_id=message_id,
                        conversation_id=conversation_id, sender_id=sender_id,
                        recipient_id=recipient_id,
                        ai_failed=decision.held_reason is not None
                        and "AI" in (decision.held_reason or ""),
                        message_length=len(message or ""))
    except Exception:  # analytics must never break the pipeline
        logger.exception("moderation analytics logging failed")
    return decision


async def _run(message: str, sender_id: str, started: float) -> ModerationDecision:
    normalized = normalize(message)

    # 1. deterministic detection over all normalized representations
    matches, evidence = run_deterministic(normalized)
    risk, category, top = aggregate_risk(matches, evidence.get("platform_mention", False))

    # 2. deterministic decisions (AI can never override these)
    if risk >= 90:
        allowed, status, reason = decide(risk, category, top)
        return ModerationDecision(allowed=allowed, status=status, category=category,
                                  reason=reason, riskScore=risk, confidence=1.0,
                                  detectionMethod=DetectionMethod.DETERMINISTIC,
                                  matches=matches)
    if not needs_ai(risk):
        return ModerationDecision(allowed=True, status=Status.APPROVED,
                                  category=Category.NONE, reason=None,
                                  riskScore=risk, confidence=1.0,
                                  detectionMethod=DetectionMethod.DETERMINISTIC,
                                  matches=matches)

    # 3. ambiguous band -> AI classification (rate limited, fail-closed)
    if not check_rate_limit(sender_id):
        return _held(matches, risk, category, "AI rate limit exceeded")
    if not ai_configured():
        return _held(matches, risk, category, "AI provider not configured")

    try:
        ai = await classify_message(message, _hint(matches))
    except AIUnavailable as e:
        return _held(matches, risk, category, f"AI unavailable: {e}")

    method = DetectionMethod.HYBRID if matches else DetectionMethod.AI
    if ai.isViolation and ai.confidence >= 0.7 and ai.category != Category.NONE:
        return ModerationDecision(
            allowed=False, status=Status.BLOCKED,
            category=ai.category if ai.category != Category.OTHER else category,
            reason=ai.reason or block_reason(ai.category),
            riskScore=risk, confidence=ai.confidence,
            detectionMethod=method, matches=matches, ai=ai)

    return ModerationDecision(
        allowed=True, status=Status.APPROVED, category=Category.NONE, reason=None,
        riskScore=risk, confidence=1.0, detectionMethod=method, matches=matches, ai=ai)


def _held(matches, risk: int, category: Category, reason: str) -> ModerationDecision:
    return ModerationDecision(
        allowed=False, status=Status.HELD,
        category=category, reason=None, riskScore=risk, confidence=0.0,
        detectionMethod=DetectionMethod.DETERMINISTIC, matches=matches,
        held_reason=reason)
