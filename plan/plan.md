# CollaboNet — Sponsor ↔ Creator Marketplace MVP

## What it is
A two-sided platform where companies (sponsors) and content creators register, get verified, connect, and run campaigns together end-to-end — from first contact to signed agreement to completed, reviewed campaign. Built from the Notion page's written UX flow and its hand-drawn wireframes.

## Who it's for
- **Companies / Sponsors** — marketing teams looking to find, vet, and hire creators for campaigns and events.
- **Creators / Influencers** — people monetizing content who want legitimate sponsors and a place to showcase their stats and rates.

## Core features and experience
1. **Landing page** — explains the platform; Log in / Sign up entry points.
2. **Sign up with Google** — one-click Google sign-in; first-time users pick their account type: *Company / Sponsor* or *Creator / Influencer*.
3. **Verification (mocked, per the Notion page)** — creators "connect" YouTube/Instagram via a simulated OAuth step that marks them verified; companies complete a company-mail + employee-details form and a mock onboarding-call step. No real social APIs in this version.
4. **App shell (from the wireframes)** — after login both roles get a sidebar workspace with: Overview, Explore, Notifications, Messages, Campaigns & Events, Contracts, Calendar, and Account. Role determines what each section shows.
5. **Company workspace**
   - Profile: company details and campaign requirements.
   - Explore / Influencer Connect: browse and search creators by niche, platform, and follower range; send connection requests.
   - Campaigns: publish briefs with deliverables, timing, and budget.
   - Contracts: "Deal rooms" as in the wireframe — one place per collaboration with its deliverables, dates, compensation, status (Upcoming / In review), and an "open deal agreement" action.
   - Calendar: kanban-style board of scheduled campaigns plus a month-grid view with color-coded events and "+ New event".
   - Template library: reusable briefs, outreach messages, and agreement templates.
   - Messages: three-pane chat — conversation list, thread, and a counterparty profile card (company, member since, event context) as drawn in the wireframes.
6. **Creator workspace**
   - Overview dashboard (per the dashboard wireframe): metric tiles — connections, deals, earnings, collaborations — plus sponsor invitations, recent collaborations, a "next step" prompt, and a recent-activity feed.
   - Explore feed: discover open campaigns and opportunities.
   - Profile: banner, photo, niche, platforms, pricing, stats, bio, sponsor pitch, with Analytics and Activity sections.
   - Messages, Deal-room contracts, and Calendar as above, creator-side.
7. **Shared connection-to-campaign journey** — either side initiates a connection request, the other accepts/declines; accepted matches unlock chat; scope, deliverables, pricing, and dates are agreed in a written agreement; both sides e-sign; the campaign lands on the calendar; both dashboards track progress until delivery is confirmed and a moderated rating/review is left. Disputes route through a review flow, not public accusations.
8. **AI helpers (code complete, switched on once a key is added)** — chat thread summaries, an outreach/counter-offer draft generator, and creator rate benchmarking. Implemented against the Gemini model via the OpenRouter API named on the Notion page, reading an API key from backend configuration; until the key is added, AI buttons appear disabled with an "AI not configured" state and everything else works normally.
9. **Visual direction (from the wireframes)** — dark UI with orange accents; the hand-drawn sketch style of the wireframes is treated as early-stage drafting, not final styling.

## Phase 1: what gets built now
- The full flow above as a working web app: Google sign-in, sidebar app shell, both role-based workspaces, mocked verification, creator discovery + connection requests, campaign feed and briefs, three-pane chat with the AI helpers wired in, Deal-room agreements with e-sign, the kanban + month-grid calendar, dashboards, and moderated ratings.
- Deliberately out of scope for this phase: React Native mobile app, real YouTube/Instagram API access, payments/money movement, and the 6-persona enterprise RBAC (head / branch manager / rep / talent manager / auditor) — the page's two-role written flow is used instead. One note: the Notion page lists Node/Express as backend; the app is built on this platform's equivalent server setup with the same single-backend, single-MongoDB architecture.
- Sample seed data: a handful of demo creators and companies so search, feeds, and chats can be explored immediately.
- Note: two of the seven Notion images (one screen wireframe and the "Original UX Flow Diagram" image) could not be opened — Notion's image server refused them. The five opened wireframes are reflected above; if the flow diagram contains something the written flow doesn't, it's an easy addition after build.