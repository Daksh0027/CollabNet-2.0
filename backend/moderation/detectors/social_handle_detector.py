"""Layer 2c — social media handle detection (contextual, dictionary-driven).

Handles are found with cue words and @/# shapes; platform context is decided
with a proximity window around each candidate instead of naive sentence
splitting, which corrupts dotted handles like "bhagya.official".
"""
import re
from typing import List, Optional

from moderation.config import RISK_SCORES, SOCIAL_PLATFORMS
from moderation.types import Category, Match

# A platform mention this close to a candidate handle makes it explicit.
PLATFORM_WINDOW = 100

HANDLE_AFTER_CUE_RE = re.compile(
    r"(?:\b(?:is|are|it'?s|id|handle|username|user|profile|add|at)\b\s*[:=]?\s*|[:@]\s*)"
    r"@?([a-z0-9][a-z0-9._]{2,29})(?![a-z0-9])",
    re.IGNORECASE,
)
# Words that commonly follow cue words but are never handles.
HANDLE_STOPLIST = {
    "me", "you", "us", "it", "here", "this", "that", "the", "my", "your",
    "his", "her", "their", "our", "them", "and", "or", "not", "on", "in",
    "at", "is", "are", "was", "were", "there", "then", "too", "also",
}
# Direct @handle — instagram-style: letters/digits/._ and not a bare word.
AT_HANDLE_RE = re.compile(r"(?<![\w.])@([a-z0-9][a-z0-9._]{2,29})(?![\w.])", re.IGNORECASE)
# Discord discriminator: name#1234
DISCORD_TAG_RE = re.compile(r"(?<![\w.#])([a-z0-9._]{2,32})#(\d{4})(?!\d)", re.IGNORECASE)
# "my username is X" without any platform cue
STANDALONE_USERNAME_RE = re.compile(
    r"\b(?:my|the)\s+(?:user ?name|handle|id|snap|insta(?:gram)?\s*id)\s+(?:is|:)\s*@?([a-z0-9][a-z0-9._]{2,29})(?![a-z0-9])",
    re.IGNORECASE,
)

_ALIAS_CACHE = None


def platform_alias_patterns() -> list:
    """(platform, compiled alias regex) built from the central dictionary."""
    global _ALIAS_CACHE
    if _ALIAS_CACHE is None:
        _ALIAS_CACHE = [
            (platform, re.compile(r"(?<!\w)" + r"[\s]*".join(map(re.escape, alias.split())) + r"(?!\w)", re.IGNORECASE))
            for platform, cfg in SOCIAL_PLATFORMS.items()
            for alias in cfg["aliases"]
        ]
    return _ALIAS_CACHE


def _find_platforms(text: str) -> List[tuple]:
    found = []
    for platform, pattern in platform_alias_patterns():
        m = pattern.search(text)
        if m:
            found.append((platform, m.start(), m.end()))
    return found


def _nearest_platform(platforms: List[tuple], pos: int, end: int = -1) -> Optional[str]:
    best, best_dist = None, 10**9
    for platform, s, e in platforms:
        dist = abs(s - pos) if end < 0 else min(abs(s - pos), abs(e - end))
        if dist < best_dist:
            best, best_dist = platform, dist
    return best if best_dist <= PLATFORM_WINDOW else None


def _clean_handle(h: str) -> Optional[str]:
    h = h.strip().strip(".").strip("_")
    if len(h) < 3 or len(h) > 32:
        return None
    if not re.search(r"[a-z]", h, re.IGNORECASE):
        return None  # pure numbers are never handles (prices, ids, phones)
    # glue words captured after cue words ("is your", ": the")
    if h.lower() in HANDLE_STOPLIST:
        return None
    # the handle is the platform name itself ("my favorite app is WhatsApp")
    for cfg in SOCIAL_PLATFORMS.values():
        if h.lower() in cfg["aliases"]:
            return None
    return h


def detect_social_handles(variants: dict) -> List[Match]:
    matches: List[Match] = []
    seen = set()

    # Scan every unique normalized representation (handles can be spaced out
    # or symbol-glued); skip texts that appear more than once across variants.
    scanned_texts = set()
    for variant_name, text in variants.items():
        if variant_name == "digit_words" or not text or text in scanned_texts:
            continue
        scanned_texts.add(text)
        obfuscated = variant_name != "clean"
        platforms = _find_platforms(text)
        discord_anywhere = any(p == "DISCORD" for p, _, _ in platforms)

        # Discord tag — structurally unique.
        for m in DISCORD_TAG_RE.finditer(text):
            near = _nearest_platform(platforms, m.start(), m.end())
            explicit = discord_anywhere or near is not None
            _add(matches, seen, m.group(0), "DISCORD" if near or discord_anywhere else None,
                 "SOCIAL_HANDLE_EXPLICIT" if explicit else "SOCIAL_HANDLE_CONTEXTUAL",
                 RISK_SCORES["SOCIAL_HANDLE_EXPLICIT"] if explicit else RISK_SCORES["SOCIAL_HANDLE_CONTEXTUAL"],
                 obfuscated)

        # Cue word / colon + handle.
        for m in HANDLE_AFTER_CUE_RE.finditer(text):
            handle = _clean_handle(m.group(1))
            if not handle or not re.search(r"[\d._]", handle):
                continue  # "whatsapp is down" — plain words are not handles
            near = _nearest_platform(platforms, m.start(), m.end())
            if near:
                _add(matches, seen, handle, near, "SOCIAL_HANDLE_EXPLICIT",
                     RISK_SCORES["SOCIAL_HANDLE_EXPLICIT"], obfuscated)
            elif re.match(r"[:@]", m.group(0)):
                # ": bhagya123" or "@ bhagya123" with no platform anywhere
                _add(matches, seen, handle, None, "SOCIAL_HANDLE_EXPLICIT",
                     RISK_SCORES["SOCIAL_HANDLE_EXPLICIT"], obfuscated)
            else:
                _add(matches, seen, handle, None, "SOCIAL_HANDLE_CONTEXTUAL",
                     RISK_SCORES["SOCIAL_HANDLE_CONTEXTUAL"], obfuscated)

        # Bare @handle — handle-shaped names are strong evidence even without
        # a platform mention; plain words after @ are only weak evidence.
        for m in AT_HANDLE_RE.finditer(text):
            handle = _clean_handle(m.group(1))
            if not handle:
                continue
            handle_like = bool(re.search(r"[\d._]", handle))
            near = _nearest_platform(platforms, m.start(), m.end())
            if near:
                _add(matches, seen, handle, near, "SOCIAL_HANDLE_EXPLICIT",
                     RISK_SCORES["SOCIAL_HANDLE_EXPLICIT"], obfuscated)
            elif handle_like:
                _add(matches, seen, handle, None, "SOCIAL_HANDLE_EXPLICIT",
                     RISK_SCORES["SOCIAL_HANDLE_EXPLICIT"], obfuscated)
            else:
                _add(matches, seen, handle, None, "SOCIAL_HANDLE_CONTEXTUAL",
                     RISK_SCORES["SOCIAL_HANDLE_CONTEXTUAL"], obfuscated)

        # "my username is X" — standalone, low evidence unless handle-like.
        for m in STANDALONE_USERNAME_RE.finditer(text):
            handle = _clean_handle(m.group(1))
            if handle:
                handle_like = bool(re.search(r"[\d._]", handle))
                _add(matches, seen, handle, None, "STANDALONE_USERNAME",
                     RISK_SCORES["STANDALONE_USERNAME"] + (10 if handle_like else 0), obfuscated)

    return matches


def _add(matches: List[Match], seen: set, handle: str, platform: Optional[str],
         rule: str, base: int, obfuscated: bool):
    key = (platform, handle.lower(), rule)
    if key in seen:
        return
    seen.add(key)
    matches.append(Match(
        detector="social_handle", category=Category.SOCIAL_MEDIA_HANDLE,
        platform=platform, matched_text=handle, start=-1, end=-1,
        base_risk=base, rule_id=rule, obfuscated=obfuscated,
    ))
