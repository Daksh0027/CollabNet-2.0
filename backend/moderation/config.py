"""Central configuration for the moderation pipeline.

Every threshold, weight and platform rule lives here so new platforms,
obfuscation patterns or regional formats can be added without touching the
detection engines.
"""
import os
from typing import Dict, List

def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, "") or default)
    except ValueError:
        return default

def _float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, "") or default)
    except ValueError:
        return default

# ------------------------------------------------------------------ decisions
RISK_BLOCK_THRESHOLD = _int("MOD_BLOCK_THRESHOLD", 90)      # >= block, never overridden by AI
AI_MIN_RISK = _int("MOD_AI_MIN_RISK", 30)                   # >= send to AI classification
AI_CONFIRM_THRESHOLD = _float("MOD_AI_CONFIRM_THRESHOLD", 0.7)
FAIL_CLOSED = os.environ.get("MOD_FAIL_CLOSED", "1").strip() not in ("0", "false", "False")

# ------------------------------------------------------------------ ai limits
AI_TIMEOUT_SECONDS = _float("MOD_AI_TIMEOUT", 8.0)
AI_RETRIES = _int("MOD_AI_RETRIES", 1)
AI_RATE_LIMIT_PER_MIN = _int("MOD_AI_RATE_LIMIT_PER_MIN", 20)

# --------------------------------------------------------------- input limits
MAX_MESSAGE_LENGTH = _int("MOD_MAX_MESSAGE_LENGTH", 4000)

# --------------------------------------------------------- deterministic risk
# rule_id -> base risk score
RISK_SCORES: Dict[str, int] = {
    "PHONE_VALID": 100,
    "PHONE_OBFUSCATED": 95,
    "EMAIL_VALID": 100,
    "EMAIL_OBFUSCATED": 95,
    "SOCIAL_URL": 100,
    "SOCIAL_HANDLE_EXPLICIT": 95,     # platform context + handle in one clause
    "SOCIAL_HANDLE_CONTEXTUAL": 60,   # handle near platform mention
    "REDIRECT_EXPLICIT": 90,          # "let's continue on WhatsApp"
    "SOCIAL_INDIRECT": 60,            # "find me on Instagram"
    "EXTERNAL_PHRASE": 45,            # "dm me", "contact me", "check my bio"
    "STANDALONE_USERNAME": 20,        # "my username is bhagya_123"
    "SOCIAL_MENTION": 0,              # ordinary discussion, evidence only
}

# Words that, immediately before a number, make it likely an identifier
# (order id, invoice, tracking) rather than something to contact — such numbers
# are downgraded to the AI band instead of deterministically blocked.
NUMBER_CONTEXT_SUPPRESSORS = [
    "order", "orders", "invoice", "tracking", "track", "txn", "transaction",
    "ref", "reference", "receipt", "payment id", "ticket", "case", "awb",
    "aadhaar", "aadhar", "pan", "gstin", "gst", "account number", "account no",
]

# ------------------------------------------------------------- social dictionary
# Extend by adding entries here — detectors read this dictionary, they never
# hard-code platform patterns.
SOCIAL_PLATFORMS: Dict[str, dict] = {
    "INSTAGRAM": {
        "aliases": ["instagram", "insta", "ig"],
        "hosts": ["instagram.com", "instagr.am", "ig.me"],
    },
    "FACEBOOK": {
        "aliases": ["facebook", "face book", "fb"],
        "hosts": ["facebook.com", "fb.com", "fb.me", "m.facebook.com"],
    },
    "MESSENGER": {
        "aliases": ["messenger"],
        "hosts": ["m.me", "messenger.com"],
    },
    "SNAPCHAT": {
        "aliases": ["snapchat", "snap chat", "snap"],
        "hosts": ["snapchat.com"],
    },
    "TELEGRAM": {
        "aliases": ["telegram", "tele gram"],
        "hosts": ["t.me", "telegram.me", "telegram.dog", "tx.me", "telegram.link"],
    },
    "WHATSAPP": {
        "aliases": ["whatsapp", "whats app", "whatsap", "whatsup", "wa"],
        "hosts": ["wa.me", "wa.link", "api.whatsapp.com", "chat.whatsapp.com", "whatsapp.com"],
    },
    "DISCORD": {
        "aliases": ["discord"],
        "hosts": ["discord.gg", "discord.com", "discordapp.com", "discord.me", "dsc.gg"],
    },
    "TWITTER": {
        "aliases": ["twitter", "blue bird app", "bluebird app"],
        "hosts": ["twitter.com", "x.com", "t.co"],
    },
    "LINKEDIN": {
        "aliases": ["linkedin", "linked in"],
        "hosts": ["linkedin.com", "lnkd.in"],
    },
    "TIKTOK": {
        "aliases": ["tiktok", "tik tok"],
        "hosts": ["tiktok.com"],
    },
    "THREADS": {
        "aliases": ["threads"],
        "hosts": ["threads.net", "threads.com"],
    },
    "LINKTREE": {
        "aliases": ["linktree", "link tree"],
        "hosts": ["linktr.ee"],
    },
    "YOUTUBE": {
        "aliases": ["youtube", "you tube", "yt"],
        "hosts": [],  # YouTube channel links are core to this marketplace; not prohibited
    },
    "PINTEREST": {
        "aliases": ["pinterest"],
        "hosts": ["pinterest.com", "pin.it"],
    },
    "REDDIT": {
        "aliases": ["reddit"],
        "hosts": ["reddit.com"],
    },
}

# URL shorteners / redirectors — blocked as profile-link evasion.
URL_SHORTENER_HOSTS: List[str] = [
    "bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "rebrand.ly",
    "shorturl.at", "rb.gy", "ow.ly", "buff.ly", "bit.do", "goo.gl", "s.id",
]

# Hosts additionally prohibited via env (comma separated), e.g. a regional app.
EXTRA_PROHIBITED_HOSTS = [
    h.strip().lower() for h in os.environ.get("MOD_EXTRA_PROHIBITED_HOSTS", "").split(",") if h.strip()
]
# Hosts explicitly allowed (never blocked) via env.
ALLOWED_HOSTS = [
    h.strip().lower() for h in os.environ.get("MOD_ALLOWED_HOSTS", "").split(",") if h.strip()
]

def prohibited_hosts() -> set:
    hosts = set(URL_SHORTENER_HOSTS) | set(EXTRA_PROHIBITED_HOSTS)
    for cfg in SOCIAL_PLATFORMS.values():
        hosts.update(cfg["hosts"])
    return hosts - set(ALLOWED_HOSTS)

# ---------------------------------------------------------- keyword dictionary
# (regex pattern, rule_id) — evaluated case-insensitively on normalized text.
REDIRECT_PATTERNS = [
    r"(?:let'?s|let us|we should|we can|i suggest we|shall we|time to|wanna|want to|move to|switch to|take this|continue this|continue (?:our|the) (?:chat|talk|conversation)|talk|chat|connect|discuss|catch up|reach me|find me|message me|text me|hit me up|ping me)\b.{0,40}?\b(whatsapp|telegram|snapchat|discord|insta(?:gram)?|messenger|signal|line|wechat|hike|the blue ?bird app|bluebird|twitter|imessage)\b",
    r"\b(?:whatsapp|telegram|snapchat|discord|insta(?:gram)?|messenger|signal|wechat)\b.{0,40}?\b(?:instead|better|rather|not here|outside this (?:app|platform)|off (?:this )?platform|on (?:the )?(?:other|that) app)\b",
    r"\bmove (?:this )?(?:chat|talk|conversation|discussion)\b.{0,30}\b(?:outside|off|elsewhere|another app|different app)\b",
    r"\b(?:connect|talk|chat|speak|continue)\b.{0,20}\boutside (?:this|the) (?:platform|app(?:lication)?)\b",
    r"\b(?:meet|catch)\s*(?:me|us)\b.{0,30}\b(?:on|at|over)\b.{0,20}\b(whatsapp|telegram|snapchat|discord|insta(?:gram)?|messenger|the blue ?bird app|twitter)\b",
    r"\b(?:move|switch)\b.{0,20}\b(?:to another (?:app|platform)|off (?:this )?platform|outside)\b",
]

EXTERNAL_PHRASES = [
    r"\bdm\s*(?:me|you)\b",
    r"\bmessage me (?:privately|personal(?:ly)?|direct(?:ly)?)\b",
    r"\b(?:contact|call|text|ping|buzz|ring|reach)\s*(?:me|us)\b(?:\s+(?:on|at|via|through|over)\b.{0,20}\b(?:whatsapp|telegram|phone|cell|mobile|number))?",
    r"\b(?:my|the) number is\b",
    r"\bi(?:'| a)?ll (?:share|give|send|text|whatsapp)(?: you)? my number\b",
    r"\bshare (?:my|the) number\b",
    r"\blet'?s connect\b",
    r"\b(?:add|follow)\s*(?:me|us)\b",
    r"\bsend (?:me|us) (?:a )?(?:request|invite|dm|msg)\b",
    r"\b(?:check|see|look at) my bio\b",
    r"\b(?:in|on) my bio\b",
    r"\b(?:search|google|find) (?:my )?(?:profile|username|handle|id)\b",
    r"\bsearch for\b.{0,40}\bon\b.{0,20}\b(instagram|facebook|snapchat|telegram|whatsapp|discord|twitter|linkedin|tiktok)\b",
    r"\bmy (?:social )?handles?\b",
    r"\bfind me on\b",
    r"\bhit me up\b",
    r"\bhmu\b",
    # handoffs that dodge explicit platform names — send to AI
    r"\bsame as (?:here|this)\b",
    r"\bsame profile (?:picture|pic|photo)\b",
    r"\b(?:username|handle|id) is the same\b",
]

# Words that mark *ordinary discussion* of platforms so bare mentions stay safe.
SOCIAL_MENTION_HINTS = [
    r"\bi (?:use|love|like|hate|prefer)\b",
    r"\b(?:is|are) my (?:favorite|favourite)\b",
    r"\bfavorite app\b",
    r"\breels?\b",
    r"\bstories\b",
    r"\bfollowers?\b",
    r"\bmarketing\b",
    r"\balgorithm\b",
    r"\bpost(?:s|ed|ing)?\b",
    r"\bcontent\b",
    r"\bgaming\b",
    r"\bcreators?\b",
]
