"""Central risk scoring and decision engine.

Deterministic evidence maps to base scores (config.RISK_SCORES). The final
score is the top signal plus half the weight of the remaining signals, so
several weak signals can escalate but a single strong one still dominates.
A deterministic score >= RISK_BLOCK_THRESHOLD blocks outright and can never be
overridden by the AI.
"""
from typing import List, Optional, Tuple

from moderation.config import (
    AI_MIN_RISK, RISK_BLOCK_THRESHOLD, RISK_SCORES,
)
from moderation.types import Category, Match, Status

# Priority when several categories tie — concrete contact info ranks first.
CATEGORY_PRIORITY = [
    Category.PHONE_NUMBER,
    Category.EMAIL_ADDRESS,
    Category.SOCIAL_MEDIA_URL,
    Category.SOCIAL_MEDIA_HANDLE,
    Category.OBFUSCATED_CONTACT_INFORMATION,
    Category.EXTERNAL_COMMUNICATION,
    Category.CONTACT_INFORMATION_REQUEST,
    Category.OTHER,
    Category.NONE,
]

OBFUSCATION_RULES = {"PHONE_OBFUSCATED", "EMAIL_OBFUSCATED"}


def aggregate_risk(matches: List[Match], platform_mention: bool) -> Tuple[int, Category, Match]:
    if not matches:
        return 0, Category.NONE, None
    top = max(matches, key=lambda m: (m.base_risk, -CATEGORY_PRIORITY.index(m.category)))
    others = sum(m.base_risk for m in matches) - top.base_risk
    risk = min(100, top.base_risk + int(0.5 * others))

    # A bare platform mention next to generic phrases is the classic
    # "move to Instagram" pattern — treat as indirect reference.
    if platform_mention and any(m.rule_id == "EXTERNAL_PHRASE" for m in matches):
        risk = max(risk, RISK_SCORES["SOCIAL_INDIRECT"])

    category = top.category
    if top.rule_id in OBFUSCATION_RULES and category not in (
        Category.PHONE_NUMBER, Category.EMAIL_ADDRESS,
    ):
        category = Category.OBFUSCATED_CONTACT_INFORMATION
    return risk, category, top


def decide(risk: int, category: Category, top: Optional[Match]) -> Tuple[bool, Status, Optional[str]]:
    """Deterministic-only decision. Returns (allowed, status, reason)."""
    if risk >= RISK_BLOCK_THRESHOLD and top is not None:
        return False, Status.BLOCKED, block_reason(category)
    return True, Status.APPROVED, None


def block_reason(category: Category) -> str:
    return {
        Category.PHONE_NUMBER: "Sharing phone numbers is not allowed.",
        Category.EMAIL_ADDRESS: "Sharing email addresses is not allowed.",
        Category.SOCIAL_MEDIA_HANDLE: "Sharing social media handles or profile links is not allowed.",
        Category.SOCIAL_MEDIA_URL: "Sharing social media handles or profile links is not allowed.",
        Category.EXTERNAL_COMMUNICATION: "Please keep your conversations on this platform.",
        Category.CONTACT_INFORMATION_REQUEST: "Asking for other users' contact information is not allowed.",
        Category.OBFUSCATED_CONTACT_INFORMATION: "Sharing contact details in a disguised form is not allowed.",
        Category.OTHER: "Sharing personal contact information is not allowed on this platform.",
    }.get(category, "Sharing personal contact information or external communication details isn't allowed on this platform.")


def needs_ai(risk: int) -> bool:
    return AI_MIN_RISK <= risk < RISK_BLOCK_THRESHOLD
