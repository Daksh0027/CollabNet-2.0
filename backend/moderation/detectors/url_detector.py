"""Layer 2d — prohibited social profile / communication URL detection."""
import re
from typing import List, Optional

from moderation.config import prohibited_hosts, SOCIAL_PLATFORMS, URL_SHORTENER_HOSTS
from moderation.types import Category, Match

# URL-ish token: scheme/www optional, captures host + path.
URL_RE = re.compile(
    r"(?:(?:https?|ftp)://|(?<![\w.])www\.)[^\s<>\"']+"
    r"|(?<![\w.@])(?:[a-z0-9][a-z0-9\-]{0,40}\.)+[a-z]{2,10}(?:/[^\s<>\"']*)?",
    re.IGNORECASE,
)
HOST_RE = re.compile(r"^(?:[a-z]+://)?(?:www\.)?([^:/?#\s]+)", re.IGNORECASE)
# "instagram dot com slash username" survives symbolization as "instagram.com/username".


def _host_of(url: str) -> Optional[str]:
    m = HOST_RE.match(url.strip().lstrip("/"))
    if not m:
        return None
    host = m.group(1).lower()
    return host if "." in host else None


def _platform_for_host(host: str) -> Optional[str]:
    for platform, cfg in SOCIAL_PLATFORMS.items():
        if host in cfg["hosts"]:
            return platform
    return "SHORTENER" if host in URL_SHORTENER_HOSTS else None


def detect_urls(variants: dict) -> List[Match]:
    matches: List[Match] = []
    blocked = prohibited_hosts()
    seen = set()

    for name, text in variants.items():
        if name == "digit_words":
            continue
        for m in URL_RE.finditer(text):
            host = _host_of(m.group(0))
            if not host or host in seen:
                continue
            # host suffix match catches subdomains like vm.tiktok.com
            prohibited = any(host == h or host.endswith("." + h) for h in blocked)
            if not prohibited:
                continue
            seen.add(host)
            matches.append(Match(
                detector="url", category=Category.SOCIAL_MEDIA_URL,
                platform=_platform_for_host(host), matched_text=m.group(0)[:80],
                start=m.start(), end=m.end(),
                base_risk=100, rule_id="SOCIAL_URL",
            ))
    return matches
