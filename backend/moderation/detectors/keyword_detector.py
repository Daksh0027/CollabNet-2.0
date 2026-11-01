"""Layer 2e — indirect contact-sharing keyword detection.

Keyword hits raise the risk score and route messages to AI classification;
they never block on their own.
"""
import re
from typing import List

from moderation.config import EXTERNAL_PHRASES, REDIRECT_PATTERNS, RISK_SCORES, SOCIAL_PLATFORMS
from moderation.types import Category, Match


def _compile(patterns) -> List[re.Pattern]:
    return [re.compile(p, re.IGNORECASE) for p in patterns]


REDIRECT_RES = _compile(REDIRECT_PATTERNS)
EXTERNAL_RES = _compile(EXTERNAL_PHRASES)
_ALIAS_RES = None


def _alias_patterns():
    global _ALIAS_RES
    if _ALIAS_RES is None:
        _ALIAS_RES = [
            re.compile(r"(?<!\w)" + r"[\s]*".join(map(re.escape, alias.split())) + r"(?!\w)", re.IGNORECASE)
            for cfg in SOCIAL_PLATFORMS.values() for alias in cfg["aliases"]
        ]
    return _ALIAS_RES


def detect_keywords(symbolized: str) -> List[Match]:
    matches: List[Match] = []

    for rex in REDIRECT_RES:
        m = rex.search(symbolized)
        if m:
            matches.append(Match(
                detector="keyword", category=Category.EXTERNAL_COMMUNICATION,
                matched_text=m.group(0)[:80], start=m.start(), end=m.end(),
                base_risk=RISK_SCORES["REDIRECT_EXPLICIT"], rule_id="REDIRECT_EXPLICIT",
            ))
            break  # one explicit-redirect signal is enough

    for rex in EXTERNAL_RES:
        m = rex.search(symbolized)
        if m:
            matches.append(Match(
                detector="keyword", category=Category.EXTERNAL_COMMUNICATION,
                matched_text=m.group(0)[:80], start=m.start(), end=m.end(),
                base_risk=RISK_SCORES["EXTERNAL_PHRASE"], rule_id="EXTERNAL_PHRASE",
            ))
            break

    # An explicit request for someone's contact info.
    req = re.search(
        r"\b(?:what(?:'?s| is)|share|give|tell|send)\b.{0,24}\b(?:your|the)\b"
        r".{0,12}\b(?:number|whatsapp|insta(?:gram)?|telegram|snap(?:chat)?|email|handle|username|id)\b",
        symbolized,
    )
    if req:
        matches.append(Match(
            detector="keyword", category=Category.CONTACT_INFORMATION_REQUEST,
            matched_text=req.group(0)[:80], start=req.start(), end=req.end(),
            base_risk=RISK_SCORES["SOCIAL_INDIRECT"], rule_id="CONTACT_REQUEST",
        ))
    return matches


def has_platform_mention(symbolized: str) -> bool:
    return any(rex.search(symbolized) for rex in _alias_patterns())
