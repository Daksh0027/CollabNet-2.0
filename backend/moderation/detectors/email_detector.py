"""Layer 2b — email address detection (standard + obfuscated forms)."""
import re
from typing import List

from moderation.config import RISK_SCORES
from moderation.types import Category, Match

# Standard + spaced-symbol forms, tolerant of spaces around @ and .
EMAIL_RE = re.compile(
    r"\b[a-z0-9][a-z0-9._%+\-]{1,48}"
    r"\s*@\s*"
    r"[a-z0-9\-]{2,40}(?:\s*\.\s*[a-z0-9\-]{2,40})*"
    r"\s*\.\s*[a-z]{2,10}\b"
)
# Compact (no-whitespace) form for obfuscated/de-spaced variants.
EMAIL_COMPACT_RE = re.compile(
    r"\b[a-z0-9][a-z0-9._%+\-]{1,48}@[a-z0-9\-]{2,40}(?:\.[a-z0-9\-]{2,40})+\b"
)
# "example gmail com" — only counts with explicit email context in the sentence.
FREEMAIL_NO_SYMBOL_RE = re.compile(
    r"\b[a-z0-9][a-z0-9._%+\-]{2,40}\s+"
    r"(gmail|googlemail|yahoo|yahoo\.co\.in|outlook|hotmail|live|icloud|rediff|proton)\s+"
    r"(?:dot\s+)?(com|co\.in|in|net|org|co\.uk)\b"
)
EMAIL_CONTEXT_WORDS = re.compile(
    r"\b(email|e-?mail|mail|id|contact|reach|drop|send|ping|mailing|address)\b", re.IGNORECASE
)


def detect_emails(variants: dict, scan_text: str) -> List[Match]:
    matches: List[Match] = []
    seen = set()

    def add(m, obfuscated: bool, compact: bool):
        text = m.group(0)
        key = re.sub(r"\s+", "", text).lower()
        if key in seen:
            return
        seen.add(key)
        matches.append(Match(
            detector="email", category=Category.EMAIL_ADDRESS,
            matched_text=text[:60], start=m.start(), end=m.end(),
            base_risk=RISK_SCORES["EMAIL_OBFUSCATED"] if (obfuscated or compact) else RISK_SCORES["EMAIL_VALID"],
            rule_id="EMAIL_OBFUSCATED" if (obfuscated or compact) else "EMAIL_VALID",
            obfuscated=obfuscated or compact,
        ))

    for name, text in variants.items():
        compact_variant = name in ("compact", "compact_symbolized")
        pattern = EMAIL_COMPACT_RE if compact_variant else EMAIL_RE
        for m in pattern.finditer(text):
            # ignore pure "at the rate" artifacts without a real domain shape
            if compact_variant:
                add(m, obfuscated=False, compact=True)
            else:
                add(m, obfuscated=True, compact=False)

    # symbolized variant already turned " at "/"[at]" into @; the spaced form
    # above covers "example @ gmail . com". Now the context-dependent form.
    clean = variants.get("clean", "")
    for sentence in re.split(r"[.!?\n]", clean):
        for m in FREEMAIL_NO_SYMBOL_RE.finditer(sentence):
            if EMAIL_CONTEXT_WORDS.search(sentence):
                add(m, obfuscated=True, compact=False)

    return matches
