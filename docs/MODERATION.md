# Chat Moderation — Contact-Information Prevention

Every message sent on CollaboNet passes through a hybrid (deterministic + AI)
moderation pipeline on the backend **before** it is saved or delivered. Both
participants in every conversation are subject to exactly the same rules.

## Flow

```
USER PRESSES SEND
  → frontend (loading state, no duplicate submits)     ← UX only, NOT security
  → POST /api/threads/{thread_id}
      1. authenticate sender (session)
      2. verify thread membership
      3. validate size/content
      4. NORMALIZATION      moderation/normalization.py
      5. DETERMINISTIC DETECTION    moderation/detectors/*
      6. RISK SCORING       moderation/risk_scoring.py
           ≥ 90            → BLOCK (never overridden by AI)
           30–89           → AI CLASSIFICATION (moderation/ai_classifier.py)
           < 30            → ALLOW
      7. decision           moderation/service.py
      8. BLOCKED  → HTTP 422, nothing saved, nothing broadcast
         HELD     → HTTP 503 (fail-closed: AI down/ambiguous)
         APPROVED → save → thread preview → notification → delivery
```

Polling (react-query) picks up only messages that were saved — i.e. approved
ones. There are no socket/alternate write paths into `db.messages` from user
input; the single user submission path is `POST /api/threads/{thread_id}`.
`add_contract_chat_message` writes only system-generated contract notices.

## Layers

1. **Normalization** (`normalization.py`) — NFKC folding, homoglyph mapping,
   zero-width removal, dash/quote unification, whitespace collapsing,
   word substitutions (`at`→`@`, `dot`→`.`, `slash`→`/`, `underscore`→`_`),
   spaced-run joining (`b h a g y a`→`bhagya`), digit-word folding
   (`nine eight seven…`→`987…`). The original message is never mutated;
   detectors receive several non-destructive representations.

2. **Deterministic detectors** (`detectors/`) — phones via the `phonenumbers`
   libphonenumber port (India-first, international-capable, multiple numbers,
   order-id/invoice context suppression), emails (standard, spaced-symbol,
   `at/dot`, context-dependent freemail), social handles (configurable
   platform dictionary + cue words + @/# shapes, proximity-window platform
   context), prohibited profile/communication URLs and shorteners (host-based,
   parses scheme-less and symbol-obfuscated links), and keyword/phrase
   detection that raises risk instead of blocking outright.

3. **AI classification** (`ai_classifier.py`) — called ONLY for ambiguous
   messages (risk 30–89). Uses the app's OpenAI-compatible provider
   (`AI_API_KEY`, `AI_BASE_URL` — OpenRouter by default, `AI_MODEL`).
   Strict JSON schema validated with Pydantic; invalid output = AI failure.
   No conversation history is sent. Prompt-injection hardened (message is
   untrusted data, never instructions). Timeout 8s, 1 retry, per-user
   sliding-window rate limit (20/min).

4. **Risk scoring & decision** (`risk_scoring.py`) — weights per signal type,
   top-signal + 50% of remaining signals aggregation, category priority.
   Deterministic blocks can never be downgraded by the AI.

## Fail-closed policy

If the AI provider is unconfigured, rate-limited, times out or returns
garbage **and** the message is ambiguous, the pipeline returns `HELD` (HTTP
503) — the message is not saved or delivered and the sender is told to retry.
Deterministic results (safe < 30 or block ≥ 90) never depend on the AI.
Set `MOD_FAIL_CLOSED=0` to switch to allow-and-flag instead.

## Analytics

Every decision is logged to the `moderation_events` collection with masked
matches (raw contact info is never stored). Admin-only endpoints
(allow-listed by `MODERATION_ADMIN_EMAILS`):

- `GET /api/moderation/me` — `{is_admin}` for UI gating
- `GET /api/moderation/stats` — totals, blocked/approved/held, AI usage &
  failures, avg latency, category distribution
- `GET /api/moderation/events?limit=&decision=`
- `POST /api/moderation/events/{event_id}/false-positive`

The admin dashboard UI lives at `/app/moderation` (sidebar item shown to
admins only).

## Configuration (`backend/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `AI_API_KEY` | — | AI provider key (server-side only) |
| `AI_BASE_URL` | `https://openrouter.ai/api/v1` | OpenAI-compatible endpoint |
| `AI_MODEL` | `google/gemini-2.5-flash` | classification model |
| `MODERATION_ADMIN_EMAILS` | — | comma-separated admin allow-list |
| `MOD_BLOCK_THRESHOLD` | `90` | risk ≥ → deterministic block |
| `MOD_AI_MIN_RISK` | `30` | risk ≥ → AI classification |
| `MOD_AI_CONFIRM_THRESHOLD` | `0.7` | AI confidence to confirm a block |
| `MOD_FAIL_CLOSED` | `1` | hold ambiguous when AI unavailable |
| `MOD_AI_TIMEOUT` | `8` | AI timeout seconds |
| `MOD_AI_RETRIES` | `1` | bounded retries |
| `MOD_AI_RATE_LIMIT_PER_MIN` | `20` | per-user AI calls/minute |
| `MOD_MAX_MESSAGE_LENGTH` | `4000` | hard message size cap |
| `MOD_EXTRA_PROHIBITED_HOSTS` | — | extra blocked hosts (comma-sep) |
| `MOD_ALLOWED_HOSTS` | — | hosts never blocked (comma-sep) |

## Extending

Add a platform (aliases, misspellings, hosts) to `SOCIAL_PLATFORMS` in
`moderation/config.py`, a phrase to `REDIRECT_PATTERNS`/`EXTERNAL_PHRASES`,
or a weight to `RISK_SCORES` — detectors read the dictionary; no engine
changes needed.

## Tests

- `backend/tests/test_moderation.py` — normalization, every detector,
  bypasses, false positives, AI schema validation, decision engine
  (AI mocked: confirm/deny/override/fail-closed), rate limit, analytics masking
- `backend/tests/test_moderation_api.py` — end-to-end HTTP: blocks, approvals,
  bidirectionality, fail-closed holds, auth/membership, oversized payloads,
  prompt injection, admin endpoint security

## Manual testing with two accounts

1. Open the app in two browser profiles (or one normal + one incognito).
2. Sign in as the **Creator** demo account in profile A and the **Company**
   demo account in profile B (landing page → demo buttons).
3. Open **Messages** in both, select the shared conversation.
4. In profile A send: `My number is 9876543210` → red warning
   "Sharing phone numbers is not allowed.", message NOT sent, text preserved
   for editing.
5. Send `abc at gmail dot com` → email block. `Follow me on Instagram at
   bhagya123` → social handle block. `instagram.com/username` → link block.
6. Send `I love Instagram reels` → delivered normally.
7. Send `What is your Instagram username?` → with AI key configured, the AI
   decides (request → block); without a key the message is held with a
   "briefly unavailable" notice (fail-closed).
8. Confirm profile B never receives any blocked/held message.
9. Sign in as an admin email (`MODERATION_ADMIN_EMAILS`) and open
   **Moderation** in the sidebar for live stats and events.
