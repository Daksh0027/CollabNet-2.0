# Solana Contract Payment Flow Plan

This plan adds a Solana-based payment track alongside the existing contract
workflow. It does not replace or modify `plan.md`.

## Confirmed decisions

- Network: Solana devnet first.
- Asset: native SOL.
- Amount model: keep the contract value in USD, convert it to SOL at funding
  time, and lock the resulting lamport amount for that escrow.
- Custody: a Solana program-controlled PDA, not a user-controlled wallet.
- Release authority: backend-authorized release after the existing contract
  completion rules succeed.
- Contract records: contract text, versions, signatures, disputes, and
  activity remain in MongoDB.
- Initial scope: full-payment escrow for one contract; milestones, partial
  releases, refunds, and mainnet are later phases.

## Safety and non-goals

- Never place private keys, seed phrases, or authority material in the
  repository, frontend bundle, Docker image, logs, or database documents.
- Use a dedicated devnet authority wallet with a small faucet-funded balance.
- Do not allow the frontend to declare a payment funded. Funding is accepted
  only after the backend verifies the finalized transaction and the escrow PDA
  state.
- Do not release funds from a client-only action, a due date, or an unverified
  transaction.
- Keep Stripe code and data migration available until the Solana flow has
  passed end-to-end testing and a deliberate migration decision is made.
- Treat the program as financial software: add focused tests, document
  invariants, and obtain an independent security review before mainnet use.
- Clearly label devnet SOL as test funds and do not represent the devnet flow
  as production custody or legal escrow.

## Target lifecycle

```text
Contract draft
  -> Both parties sign accepted version
  -> Funding requested
  -> Company wallet signs PDA deposit
  -> Backend verifies finalized deposit
  -> Funds locked / contract active
  -> Existing completion or dispute flow
  -> Backend-authorized PDA release or refund
  -> Transaction recorded and contract closed
```

The backend remains the source of truth for application status, while the
Solana program remains the source of truth for the on-chain balance and
transfer authority.

## Phase 0 — Architecture and threat model

1. Define the escrow account fields:
   - contract/deal identifier hash;
   - company depositor;
   - creator recipient;
   - lamport amount;
   - deposited, released, refunded, and disputed flags;
   - backend release authority;
   - program version.
2. Define PDA seeds and ensure they cannot collide across contracts.
3. Define allowed transitions and invariants:
   - only the expected company can fund;
   - funding is one-time and exact;
   - release can happen once;
   - release cannot happen while disputed;
   - only the configured authority can release or refund;
   - recipient and amount cannot be changed after funding.
4. Document SOL volatility, transaction finality, insufficient-balance,
   wallet-rejection, RPC outage, and transaction-replay behavior.
5. Decide the conversion source and record the USD-to-SOL rate, timestamp, SOL
   amount, and lamports in the payment transaction. The first implementation
   may use a server-side quoted rate, but the quote must expire and be visible
   before signing.

## Phase 1 — Solana program

1. Create an Anchor program in a dedicated top-level `solana/` directory.
2. Implement instructions for:
   - initialize escrow;
   - deposit exact lamports from the company;
   - release to the creator;
   - refund to the company;
   - optionally mark a dispute/freeze if the program needs an explicit state.
3. Use checked arithmetic and reject zero, mismatched, or already-settled
   amounts.
4. Add Anchor tests covering authorization, PDA derivation, exact funding,
   duplicate operations, dispute freezes, release, refund, and malformed
   accounts.
5. Deploy to devnet from a non-production authority and record the program
   ID through environment configuration rather than hard-coding secrets.

## Phase 2 — Backend integration

1. Replace the Stripe-specific payment abstraction with a provider-neutral
   payment record while preserving legacy Stripe fields during migration.
2. Add Solana configuration:
   - RPC URL;
   - cluster;
   - program ID;
   - backend authority public key;
   - server-side authority signer supplied through a secure runtime secret.
3. Add payment fields for:
   - provider and network;
   - escrow PDA;
   - quoted USD/SOL rate;
   - lamports and SOL amount;
   - funding transaction signature;
   - release/refund transaction signature;
   - verification timestamps and state.
4. Add authenticated endpoints to:
   - create a funding quote and escrow PDA;
   - return the unsigned funding transaction or instruction;
   - verify a submitted signature after finalization;
   - read on-chain escrow status;
   - request release after completion;
   - issue a controlled refund where permitted.
5. Make verification and release idempotent. Repeated requests must return the
   existing transaction/state rather than submit duplicate transfers.
6. Require the current contract version and matching parties/amount when
   creating or verifying an escrow.
7. Add explicit failure responses for expired quotes, wrong wallet,
   insufficient balance, stale contract versions, missing accounts, and RPC
   failures. Do not silently fall back to “funded”.
8. Keep completion/dispute transitions synchronized with payment state:
   disputed contracts freeze release; completion can request release but cannot
   claim success until the chain transaction is finalized and verified.

## Phase 3 — Frontend wallet and deal-room UX

1. Add Solana wallet-adapter dependencies and support a small devnet wallet
   connection flow.
2. Show the quote before signing:
   - contract USD value;
   - SOL amount;
   - quote timestamp and expiry;
   - network warning;
   - recipient/escrow PDA;
   - expected transaction fee.
3. Replace the Stripe checkout action with:
   - connect wallet;
   - review quote;
   - sign funding transaction;
   - wait for confirmation;
   - refresh backend verification.
4. Show distinct states for wallet disconnected, awaiting signature,
   confirming, verification failed, funded, release pending, released,
   disputed, and refund pending.
5. Link funding, release, and refund signatures to Solana Explorer using the
   configured cluster.
6. Keep the creator flow non-custodial: the creator sees the verified locked
   amount and receives funds to the creator wallet recorded for that contract.
7. Do not request or store seed phrases or private keys in the application.

## Phase 4 — Identity, migration, and operational controls

1. Add verified company and creator wallet addresses to the contract flow.
2. Require an explicit wallet-address confirmation before funding and before
   accepting a creator payout address.
3. Define what happens when a user changes wallets, loses access, or submits a
   wallet belonging to another party.
4. Add an admin/operator view for stuck transactions and reconciliation
   without allowing arbitrary balance edits.
5. Write a migration strategy for existing Stripe contracts:
   - existing Stripe transactions remain readable;
   - no automatic conversion of funded contracts;
   - new Solana funding is opt-in during rollout;
   - migration is enabled only after reconciliation.
6. Add monitoring for RPC errors, confirmation latency, verification failures,
   authority balance, and mismatches between MongoDB and chain state.

## Phase 5 — Validation gates

### Automated tests

- Program unit and integration tests on local validator.
- Backend tests for quote creation, authorization, idempotency, verification,
  release, refund, dispute freeze, and RPC failure handling.
- Frontend tests for wallet states, quote display, rejected signatures, and
  verified funding.
- End-to-end devnet test using disposable wallets and test SOL.
- Reconciliation test that compares MongoDB state with the escrow account.

### Manual security review

- Review PDA seeds and account constraints.
- Review signer and authority checks.
- Review lamport arithmetic and rent handling.
- Review replay/idempotency behavior.
- Review backend secret storage and logs.
- Review wallet address binding and contract-version binding.
- Confirm no private key reaches browser code, API responses, logs, or source
  control.

### Release gates

The implementation must not move to mainnet until:

1. Devnet end-to-end tests pass repeatedly.
2. Program and backend security reviews have no unresolved high-severity
   findings.
3. Chain/database reconciliation is documented and tested.
4. Recovery, refund, dispute, and RPC-outage procedures are documented.
5. Legal/compliance review approves the intended custody and payment wording.
6. Mainnet deployment uses a separately generated authority and a controlled
   operational process.

## Suggested implementation order

1. Add the threat model and provider-neutral payment schema.
2. Build and test the Anchor program locally.
3. Deploy the program to devnet.
4. Add backend quote, transaction, verification, and release endpoints.
5. Add wallet funding UX behind a devnet feature flag.
6. Run backend, frontend, program, and end-to-end tests.
7. Add reconciliation and operational tooling.
8. Review the devnet results and decide whether to retain Stripe as a
   fallback, remove it, or support both providers.
