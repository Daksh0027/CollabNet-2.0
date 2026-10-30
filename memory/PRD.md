# PRD — CollaboNet (Sponsor ↔ Creator Marketplace MVP)

## Original problem statement
"Read the details from this Notion page and create an MVP" — the Notion page specified a two-sided platform where companies (sponsors) and content creators register, get verified, connect, and run campaigns together end-to-end: first contact → connection → chat → written agreement → e-sign → calendar → delivery → moderated review. Mocked verification was explicitly permitted; Node/Express was named as backend (built on the platform's FastAPI + MongoDB single-backend equivalent per approved plan).

## User personas
- **Company / Sponsor** (marketing teams): discover and vet creators, publish briefs, open deal rooms, track spend.
- **Creator / Influencer**: showcase stats and rates, get discovered, apply to campaigns, track earnings.

## Architecture
- React (CRA + craco, Tailwind, shadcn/ui, react-query, react-router v7, sonner) — frontend on :3000
- FastAPI + Motor (MongoDB) — backend on :8001, all routes under /api
- Auth: Emergent-managed Google OAuth (session_id → /api/auth/session → httpOnly session cookie, 7-day sessions in Mongo)
- Seeded demo dataset (6 creators, 3 companies, 3 campaigns, thread, contracts, events, reviews) + POST /api/auth/demo for instant exploration

## Core requirements (static)
1. Landing page with Google sign-up + demo entry points
2. Role selection (Company / Creator) on first login
3. Mocked verification: creator social-connect (simulated OAuth), company mail+employees form + simulated onboarding call
4. Sidebar app shell: Overview, Explore, Notifications, Messages, Campaigns & Events, Contracts, Calendar, Account
5. Creator search (niche / platform / follower range / text) with profiles and reviews
6. Connections: either side initiates; accept/decline; accepted unlocks chat
7. Campaign briefs: publish (deliverables, budget, deadline, niches), apply, invite, accept/decline
8. Three-pane messages with counterparty profile card
9. Deal rooms: agreement text (auto-generated default), e-sign both sides → upcoming + auto calendar event; mark delivered; moderated reviews (banned words → pending); dispute routing
10. Calendar: kanban (scheduled/active/completed) + month grid, color-coded, + New event
11. Account: role-specific profile editing, template library CRUD, logout
12. Notifications with unread badge, mark-on-read
13. AI helpers (summarize thread, draft outreach/counter-offer, rate benchmark) — coded against OpenRouter (Gemini), disabled with clear state until AI_API_KEY is set in backend .env

## Implemented (June 2026)
- All of the above, Phase 1 scope. Out of scope (per plan): React Native app, real YouTube/Instagram APIs, payments were deferred to Phase 2 → **now added: Stripe escrow payments**.
- **Stripe escrow (Phase 2)**: company funds a deal's fee via Stripe Checkout (test mode) from the deal room; payment verified server-side (status polling, idempotent) → escrow "funded"; marking the campaign delivered auto-releases funds (contract, transaction ledger, notifications); dispute keeps funds held. Legacy contracts backfilled at startup. Payout to the creator's bank is queued (needs Stripe Connect onboarding — mocked in MVP). Claimable-sandbox provisioning is blocked for this account's country (IN), so the platform's shared sandbox test key (STRIPE_API_KEY) is used; stripe CA bundle pointed at certifi for the integration proxy. Tax mode in effect: DIY — Stripe just processes the payment, no tax help (switchable later).
- **"Spotify" theme (tweakcn registry)** applied as the color system: OKLCH token layer (green-tinted dark surfaces, Spotify-green primary), Poppins body font (Unbounded display + JetBrains Mono accents retained), theme-aligned calendar event colors; sidebar tokens added to Tailwind config. Shell made responsive (sidebar hidden below lg, sticky mobile header with bell + nav menu) fixing mobile horizontal overflow.
- **Dark/light switcher**: full light palette from the theme wired as `:root` with the dark palette under `.dark`; ThemeProvider (localStorage-persisted, no-flash inline script in index.html, dark default); toggle on the landing header, desktop sidebar ("Appearance" row) and mobile top bar; toasts, status pills and destructive accents adapt to the active mode.
- AI intentionally unconfigured: add OpenRouter key as AI_API_KEY in /app/backend/.env (model AI_MODEL, default google/gemini-2.5-flash).

## Verification status
- Testing agent iteration 1: backend suite 4/4 + browser flows pass (auth guard, demo login, overview, filters, apply flow, disabled AI states).
- API-lifecycle checks pass: e-sign both sides → upcoming + auto event; complete → reviews; flagged review → pending; calendar create/move; template CRUD; brief publish; notifications unread/mark-read.
- Not yet verified: real Google OAuth round-trip (needs a real Google account login), AI endpoints with a live key.

## Backlog / next tasks (P0 → P2)
- P0: Activate AI helpers (add OpenRouter key), real-Google login smoke test
- P1: Real YouTube/Instagram OAuth verification, Stripe payments/escrow, admin moderation console for pending reviews
- P2: React Native app, enterprise RBAC (head/branch manager/rep/talent manager/auditor), campaign analytics charts
