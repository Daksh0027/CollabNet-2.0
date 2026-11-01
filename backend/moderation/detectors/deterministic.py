"""Layer 2 orchestrator — runs every deterministic detector over the
normalized variants and merges the results."""
from typing import List, Tuple

from moderation.detectors.email_detector import detect_emails
from moderation.detectors.keyword_detector import detect_keywords, has_platform_mention
from moderation.detectors.phone_detector import detect_phone_numbers
from moderation.detectors.social_handle_detector import detect_social_handles
from moderation.detectors.url_detector import detect_urls
from moderation.types import Match


def run_deterministic(normalized) -> Tuple[List[Match], dict]:
    variants = normalized.all_variants()
    scan_text = normalized.clean

    matches: List[Match] = []
    matches += detect_phone_numbers(variants, scan_text)
    matches += detect_emails(variants, scan_text)
    matches += detect_social_handles(variants)
    matches += detect_urls(variants)
    matches += detect_keywords(normalized.symbolized)

    evidence = {
        "platform_mention": has_platform_mention(normalized.symbolized),
        "match_count": len(matches),
    }
    return matches, evidence
