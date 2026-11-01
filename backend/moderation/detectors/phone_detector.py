"""Layer 2a — phone number detection (libphonenumber port: `phonenumbers`)."""
import re
from typing import List, Tuple

import phonenumbers
from phonenumbers import NumberParseException

from moderation.config import NUMBER_CONTEXT_SUPPRESSORS, RISK_SCORES
from moderation.types import Category, Match

# Candidate digit runs (allows +, separators like - . ( ) and internal spaces).
CANDIDATE_RE = re.compile(r"\+?\d[\d\s().\-]{6,16}\d")
COMPACT_DIGITS_RE = re.compile(r"\+?\d{8,13}")

# Indian mobiles start with 6-9; generic international fallback below.
PRIMARY_REGION = "IN"

_identifier_hint = re.compile(
    r"\b(" + "|".join(NUMBER_CONTEXT_SUPPRESSORS) + r")\b[^\n]{0,20}$",
    re.IGNORECASE,
)

# Punctuation sometimes used to separate digits ("9&8&7&6...").
_UNPACK_RE = re.compile(r"[&*_#|\\/~^'\";:,]+")


def _unpacked(text: str) -> str:
    return _UNPACK_RE.sub("", text)


def _digits(s: str) -> str:
    return re.sub(r"\D", "", s)


def _identifier_context_before(text: str, start: int) -> bool:
    window = text[max(0, start - 60):start]
    return bool(_identifier_hint.search(window))


def _try_parse(raw: str) -> Tuple[bool, bool, str]:
    """Return (valid, possible, e164-ish normalized)."""
    results = []
    for attempt in _parse_attempts(raw):
        try:
            parsed = phonenumbers.parse(attempt, PRIMARY_REGION)
        except NumberParseException:
            continue
        if not phonenumbers.is_possible_number(parsed):
            continue
        valid = phonenumbers.is_valid_number(parsed)
        results.append((valid, True, phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)))
        if valid:
            return True, True, results[-1][2]
    if results:
        return results[0]
    return False, False, ""


def _parse_attempts(raw: str) -> List[str]:
    raw = raw.strip()
    attempts = []
    if raw.startswith("+"):
        attempts.append(raw)
    else:
        d = _digits(raw)
        # bare 10-digit Indian mobile, 0-prefixed, 0091/+91-less 91 prefixed
        if d.startswith("91") and len(d) == 12:
            attempts.append("+91" + d[2:])
        attempts.append(d)
        attempts.append("+91" + d)
        if not d.startswith("0") and len(d) != 10:
            attempts.append("+" + d)
    return attempts


def _valid_lenient(d: str) -> bool:
    """Structural plausibility for 10-digit Indian numbers when parsing fails."""
    return len(d) == 10 and d[0] in "6789" and len(set(d)) > 2


def detect_phone_numbers(variants: dict, scan_text: str) -> List[Match]:
    """Detect phone numbers across all normalized variants.

    scan_text: the human-readable variant (clean) used for context checks.
    """
    matches: List[Match] = []
    seen_norms = set()

    for variant_name, text in variants.items():
        obfuscated = variant_name in ("compact", "de_spaced", "digit_words", "compact_symbolized")
        if variant_name == "clean":
            # also scan a punctuation-unpacked copy of the clean text
            unpacked = _unpacked(text)
            if unpacked != text:
                matches += _scan_text(unpacked, scan_text, compact_mode=False,
                                      obfuscated=True, seen_norms=seen_norms)
        matches += _scan_text(text, scan_text, compact_mode=("compact" in variant_name),
                              obfuscated=obfuscated, seen_norms=seen_norms)
    return matches


def _scan_text(text: str, scan_text: str, *, compact_mode: bool, obfuscated: bool,
               seen_norms: set) -> List[Match]:
    out: List[Match] = []
    pattern = COMPACT_DIGITS_RE if compact_mode else CANDIDATE_RE
    for cand_match in pattern.finditer(text):
        raw = cand_match.group(0)
        d = _digits(raw)
        if len(d) < 8 or len(d) > 13:
            continue
        valid, possible, e164 = _try_parse(raw)
        plausible = valid or _valid_lenient(d)
        if not plausible:
            continue
        norm_key = (e164 or d)
        if norm_key in seen_norms:
            continue
        suppressed = _identifier_context_before(scan_text, cand_match.start())
        if valid:
            # Verified phone number: identifier context downgrades to the AI
            # band instead of a deterministic block (e.g. order ids).
            rule = "PHONE_VALID" if not suppressed else "PHONE_CONTEXTUAL_ORDER_ID"
            base = RISK_SCORES["PHONE_VALID"] if not suppressed else RISK_SCORES["SOCIAL_INDIRECT"]
        elif suppressed:
            continue  # implausible number with identifier context -> ignore
        else:
            rule = "PHONE_OBFUSCATED" if obfuscated else "PHONE_VALID"
            base = RISK_SCORES["PHONE_OBFUSCATED"] if obfuscated or len(d) != 10 else RISK_SCORES["PHONE_VALID"]
            if not obfuscated and len(d) == 10 and _valid_lenient(d):
                rule, base = "PHONE_VALID", RISK_SCORES["PHONE_VALID"]
        seen_norms.add(norm_key)
        out.append(Match(
            detector="phone", category=Category.PHONE_NUMBER,
            matched_text=raw.strip()[:40], start=cand_match.start(), end=cand_match.end(),
            base_risk=base, rule_id=rule, obfuscated=obfuscated,
        ))
    return out
