# PRD — CollaboNet Hybrid Chat Moderation (Contact-Information Prevention)

## Original problem statement
Implement a production-ready, AI + deterministic hybrid moderation system inside the existing CollaboNet chat that prevents users from sharing contact info (phones, emails, social handles/URLs, off-platform invitations) in either direction, server-side, before save/delivery, without breaking existing chat functionality.

## Architecture
- Stack: React (CRA/craco) frontend + FastAPI (single server.py) + MongoDB (motor), polling-based chat via react-query, session-cookie auth.
- Moderation lives in `backend/moderation/` package: normalization → deterministic detectors (phone/email/social-handle/url/keyword) → risk scoring → conditional AI classification (OpenAI-compatible provider, user's Gemini key via OpenAI-compat endpoint) → decision → analytics.
- Single user message submission path: `POST /api/threads/{thread_id}` — moderation gate added before save/broadcast; blocked → 422, held (fail-closed AI down/ambiguous) → 503; nothing persisted or broadcast.
- System-generated contract chat notices bypass moderation (not user input).
- Analytics: `moderation_events` collection (masked matches), admin-only endpoints + `/app/moderation` dashboard UI (stats, category distribution, events, false-positive reporting).

## Core requirements (static)
- Bidirectional, identical rules for both participants (single shared pipeline).
- Deterministic high-confidence (risk ≥ 90) can never be overridden by AI.
- AI only for ambiguous band (30–89), strict JSON schema validation, no conversation history sent, prompt-injection hardened, per-user rate limit, timeout 8s, 1 retry.
- Fail-closed: AI unconfigured/down + ambiguous → HELD (503), never delivered.
- Configurable thresholds/platform dictionary/weights in `moderation/config.py`; env overrides (MOD_*, docs/MODERATION.md).
- Original message never mutated; logs mask matched contact info.

## Implemented (2026-11-01)
- Normalization engine (NFKC, homoglyphs, zero-width, at/dot/slash substitutions, spaced-run joining, digit-words).
- Detectors: phone (phonenumbers lib, India-first, order-id suppression), email (standard/obfuscated/freemail-context), social handles (dictionary + cue + @/# + proximity window), prohibited URLs/shorteners (host-based), keyword/phrase risk.
- Risk scoring + decision engine; moderation service; AI classifier; analytics + admin endpoints; moderation dashboard UI page + admin-gated sidebar nav.
- Frontend: sending state (no duplicate submits, spinner), blocked banner + category copy near composer, text preserved on block, held-message notice.
- Tests: 110 unit + 17 API integration (blocks, bypasses, false positives, bidirectionality, fail-closed, security, admin gating); full repo suite 155 passed.
- E2E verified live with 2 demo accounts + real Gemini key (HYBRID blocks, approvals, deterministic precedence).

## Backlog / next
- P1: moderation of attachment filenames/OCR and voice-note transcripts.
- P1: per-thread AI context window (last N messages) with privacy safeguards for harder indirect cases.
- P2: false-positive feedback loop (auto-tune weights from reports).
- P2: moderation webhooks/audit export; multi-language keyword packs (Hindi transliterations).
