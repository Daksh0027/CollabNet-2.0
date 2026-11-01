"""Moderation types shared across the pipeline.

Public responses only ever expose ModerationDecision.public_dict(); detector
matches and AI output are internal and never leave the server.
"""
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class Category(str, Enum):
    PHONE_NUMBER = "PHONE_NUMBER"
    EMAIL_ADDRESS = "EMAIL_ADDRESS"
    SOCIAL_MEDIA_HANDLE = "SOCIAL_MEDIA_HANDLE"
    SOCIAL_MEDIA_URL = "SOCIAL_MEDIA_URL"
    EXTERNAL_COMMUNICATION = "EXTERNAL_COMMUNICATION"
    CONTACT_INFORMATION_REQUEST = "CONTACT_INFORMATION_REQUEST"
    OBFUSCATED_CONTACT_INFORMATION = "OBFUSCATED_CONTACT_INFORMATION"
    OTHER = "OTHER"
    NONE = "NONE"


class Intent(str, Enum):
    SHARE_CONTACT_INFORMATION = "SHARE_CONTACT_INFORMATION"
    REQUEST_CONTACT_INFORMATION = "REQUEST_CONTACT_INFORMATION"
    REDIRECT_OFF_PLATFORM = "REDIRECT_OFF_PLATFORM"
    ORDINARY_DISCUSSION = "ORDINARY_DISCUSSION"
    AMBIGUOUS = "AMBIGUOUS"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class DetectionMethod(str, Enum):
    DETERMINISTIC = "DETERMINISTIC"
    AI = "AI"
    HYBRID = "HYBRID"


class Status(str, Enum):
    APPROVED = "APPROVED"
    BLOCKED = "BLOCKED"
    HELD = "HELD"  # fail-closed: AI unavailable for an ambiguous message


class Match(BaseModel):
    """One deterministic detection hit."""
    detector: str
    category: Category
    platform: Optional[str] = None
    matched_text: str
    start: int = -1
    end: int = -1
    base_risk: int
    rule_id: str = ""
    obfuscated: bool = False


class AIClassification(BaseModel):
    """Strict schema the AI provider must conform to (validated, never trusted raw)."""
    isViolation: bool
    category: Category = Category.NONE
    confidence: float = Field(default=0.0, ge=0, le=1)
    intent: Intent = Intent.AMBIGUOUS
    platform: Optional[str] = None
    reason: str = ""
    matchedContent: List[str] = Field(default_factory=list)
    severity: Severity = Severity.LOW


class ModerationDecision(BaseModel):
    allowed: bool
    status: Status
    category: Category
    reason: Optional[str] = None
    riskScore: int = 0
    confidence: float = 1.0
    detectionMethod: DetectionMethod = DetectionMethod.DETERMINISTIC
    # internal detail — stripped from public responses
    matches: List[Match] = Field(default_factory=list)
    ai: Optional[AIClassification] = None
    held_reason: Optional[str] = None
    latency_ms: int = 0

    def public_dict(self) -> dict:
        """Client-facing payload. No patterns, prompts, matches or AI internals."""
        return {
            "allowed": self.allowed,
            "status": self.status.value,
            "category": self.category.value,
            "reason": self.reason,
            "riskScore": self.riskScore if self.status != Status.APPROVED else 0,
            "confidence": self.confidence if self.status != Status.APPROVED else 1.0,
            "detectionMethod": self.detectionMethod.value,
            **({"heldReason": self.held_reason} if self.held_reason else {}),
        }
