# CollabNet Deal Contracts, Payments, and Reviews MVP

## Current Status
**Phase: Phase 2 — Drafting, revisions, and acceptance** (with significant portions of Phase 3 implemented).

### Feature Progress
- [x] **Contract Drafting** (Phase 2)
- [x] **Versioning & Revisions** (Phase 2)
- [x] **Negotiation Flow** (Phase 2)
- [x] **Two-Party Acceptance** (Phase 2)
- [/] **Payment Integration** (Phase 3) - *Stripe Checkout & Webhooks implemented; release logic basic.*
- [/] **Payment Release** (Phase 3) - *Basic release implemented; conditional logic pending.*
- [/] **Disputes** (Phase 5) - *Basic dispute triggering implemented; evidence/admin flow pending.*
- [/] **Reviews** (Phase 6) - *Basic rating/commenting implemented; moderation basic.*
- [ ] **Deliverable Workspace** (Phase 4) - *Major Gap: Backend lacks submission/tracking logic.*
- [ ] **Amendments** (Phase 5) - *Gap: No specific flow for funded/active contracts.*
- [ ] **Completion & Reputation** (Phase 6) - *Gap: Closure validation and mutual review timing pending.*

---

## Product direction

Chat remains the negotiation space. The accepted contract becomes the source of truth for the collaboration. The deal workspace then turns every contractual obligation into a trackable deliverable, ties payment decisions to those deliverables, and preserves an activity record for support and disputes.

The experience should feel similar to a GitHub pull request:

- revisions are explicit and comparable;
- comments can be attached to a specific contract section or deliverable;
- acceptance is visible for both parties;
- the accepted version is immutable;
- later changes are amendments rather than silent edits.

The platform should describe funds as **payment authorized**, **held**, or **locked** unless its payment provider and legal structure support the term “escrow”.

## MVP lifecycle

```text
Negotiating
  -> Contract draft
  -> Changes requested
  -> Pending acceptance
  -> Payment pending
  -> Active
  -> Deliverables under review
  -> Completed
  -> Disputed or cancelled
  -> Closed and reviewed
```

The contract becomes active only after both parties accept the final version and any required payment hold succeeds.

## MVP scope

### 1. Contract drafting

Create a contract from an existing deal or chat thread. Prefill known information, but require the author to review it before sending.

The structured contract includes:

- parties and authorized users;
- collaboration summary, platforms, and campaign dates;
- deliverables, quantities, formats, due dates, submission method, and acceptance criteria;
- revision allowance and dependencies;
- total value, currency, advance/full-payment hold, and milestone amounts;
- payment release conditions, fees, cancellation, and refund terms;
- usage rights, licensing duration and territory, exclusivity, whitelisting, and ownership transfer;
- change process, inactivity handling, and dispute process.

Commercial terms remain private to the deal and are not exposed as public discovery filters.

### 2. Versioning and negotiation

Every sent revision receives a version number and records its author, timestamp, summary, and changed fields. Users can compare versions and comment on individual sections.

The recipient can:

- accept the current version;
- request changes against specific fields;
- decline the proposal.

When changes are requested, the author must send a new version. The old version remains available and is never overwritten.

### 3. Two-party acceptance and evidence

Both parties explicitly confirm that they reviewed and agreed to the displayed version. The UI shows each acceptance, timestamp, and exact version.

On final acceptance:

- freeze the accepted contract snapshot;
- prevent direct edits;
- create a readable activity timeline;
- provide a downloadable contract and acceptance record;
- notify both parties.

Where supported by the payment/legal provider, capture electronic signature, verified identity, and acceptance metadata. The product should present the document as an accepted agreement and transaction record, not guarantee worldwide legal enforceability.

### 4. Payment locking and release

Use a compliant payment provider and server-side webhooks. MVP payment states are:

```text
Not required
Setup pending
Authorization pending
Funds held
Partially released
Fully released
Payment failed
Refund pending
Refunded
Disputed
```

Support:

- full amount held before work begins;
- advance held with a remaining balance;
- milestone payments linked to individual deliverables;
- idempotent payment confirmation and webhook processing;
- payment receipts and a transaction ledger;
- refund and payment-failure handling;
- payment freeze while a dispute is active.

Money must not be released merely because a due date passed. Release is based on the agreed condition: approval, an explicitly configured review timeout, dispute resolution, or another contract rule.

### 5. Deliverable workspace

Generate a deal workspace from the accepted contract. Each deliverable displays its requirement, due date, responsible party, linked payment, files/links, submissions, feedback, revision count, and history.

Deliverable states:

```text
Not started
In progress
Submitted
Under review
Changes requested
Approved
Rejected
Disputed
Completed
```

Creators can submit files or links with a note. Sponsors can approve, request changes, reject with a reason, or open a dispute. Feedback is attached to the deliverable or submission rather than being buried in chat.

Define a review window, reminders, overdue handling, and whether silence can trigger auto-approval. These rules must be visible in the contract.

### 6. Amendments and scope protection

Either party can propose an amendment showing the original value, proposed value, reason, date impact, deliverable impact, rights impact, and payment impact.

Both parties must accept an amendment before it becomes active. Until then, the original contract remains the source of truth. If a chat request appears to exceed the agreed scope, show an “outside contract” warning with actions to create an amendment, discuss it, reject it, or proceed without payment protection.

### 7. Disputes and audit trail

Either party can open a dispute from a contract, deliverable, or payment. Opening a dispute freezes linked funds where supported and collects:

- contract and amendment versions;
- acceptance records;
- submissions and file/link history;
- comments and feedback;
- payment state transitions, receipts, and refunds;
- deadlines, reminders, and relevant notifications.

Provide a platform review outcome and preserve it in the timeline. Platform handling does not remove a party’s legal rights or replace courts/arbitration where applicable.

### 8. Completion and reviews

Close a deal only when all required deliverables and payments are approved, released, refunded, or otherwise resolved, and no active dispute remains. Show a completion summary and allow both parties to download the final contract, evidence, and payment record.

After closure, request independent mutual reviews. Keep reviews hidden until both are submitted or the review window expires. Support role-specific ratings for communication, professionalism, clarity, timeliness, quality, payment reliability, and requirement adherence, plus a written review, response, report, and moderation path.

## Primary UX

The deal page uses these tabs:

```text
Overview | Chat | Contract | Deliverables | Payments | Activity | Reviews
```

The persistent status banner shows the current contract version/status, amount held, deliverables approved out of total, and the next required action.

Role-specific next actions:

- **Company/sponsor:** create or revise contract, hold payment, review submission, request changes, approve, release payment, resolve dispute, review creator.
- **Creator/partner:** review or revise contract, accept, submit deliverable, respond to feedback, escalate overdue review, view payment release, open dispute, review company.

## Delivery phases

### Phase 1 — Domain model and state machine [x]

Define and validate `Deal`, `Contract`, `ContractVersion`, `ContractAmendment`, `Deliverable`, `Submission`, `PaymentIntent`, `PaymentHold`, `PaymentRelease`, `Dispute`, `Review`, and `ActivityEvent`.

Document valid transitions, permissions, idempotency rules, notification triggers, and cancellation behavior before building screens.

### Phase 2 — Drafting, revisions, and acceptance [x]

Build the contract form, draft autosave, version comparison, section comments, change requests, notifications, two-party acceptance, immutable accepted snapshot, contract download, and activity timeline.

### Phase 3 — Payment integration [/]

Integrate provider authorization, holds, milestone/full/advance payments, server-side webhook verification, idempotency, release, refunds, failure states, receipts, and dispute freezes. Keep payout onboarding clearly marked as pending or mocked if it is not supported in the MVP.

### Phase 4 — Deliverable operations [ ]

Build the contract-generated checklist, submission flow, file/link evidence, review actions, revision flow, due dates, review windows, reminders, overdue escalation, and payment linkage.

### Phase 5 — Amendments and disputes [/]

Build amendment proposals, field-level diffs, acceptance, scope warnings, dispute intake, evidence collection, payment freeze, admin review outcome, and resolution notifications.

### Phase 6 — Completion and reputation [/]

Build closure validation, completion summary, downloadable records, mutual review timing, moderation/reporting, review responses, and reputation signals.

## Out of scope after MVP

- multi-party contracts and enterprise RBAC;
- cross-border tax/withholding automation;
- legal-jurisdiction selection or automated legal advice;
- advanced e-signature integrations beyond the chosen provider;
- arbitration integrations;
- AI-generated legal clauses;
- automated content-quality assessment;
- crypto or on-chain escrow;
- React Native client;
- real social-platform verification APIs.

## Launch acceptance criteria

- No party can claim a contract is active without both acceptances and required payment setup.
- The accepted contract cannot be edited in place.
- Every payment movement is linked to a contract version, deliverable/milestone where applicable, and activity event.
- A deliverable cannot be approved without an accountable reviewer and timestamp.
- A dispute preserves evidence and prevents conflicting payment release.
- Users can understand the next action and current financial/deliverable status from the deal page.
- Completion and reviews cannot bypass unresolved required deliverables, payments, or disputes.
