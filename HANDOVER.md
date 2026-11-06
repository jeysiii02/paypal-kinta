# KINTA — Developer 1 → Developer 2 Handover

**Date:** 2026-11-06  
**Repo:** https://github.com/jeysiii02/paypal-kinta  
**Scope complete:** Phases 1–8 (backend & AI). Frontend + PayPal = Developer 2.

---

## 1. What has been completed

1. Next.js App Router + TypeScript backend
2. Prisma schema (16 models) + SQLite migrations
3. Seeded **University Tech Summit** demo
4. Project / supplier / commitment / expense APIs
5. Disruption reporting + PDF/text extraction
6. `analyzeBusinessEvent()` (Gemini or heuristic)
7. `identifyAffectedCommitments()` dependency engine
8. `generateRecoveryPlans()` (Cancel / Relocate / Reschedule)
9. `calculateScenarioFinancials()` deterministic simulator
10. Recovery action workflow APIs (approve/reject/complete/fail — **no PayPal execution**)
11. Activity logging across mutations
12. API documentation (`docs/API.md`)
13. `.env.example`, README, phase notes, verify scripts

**Not implemented (your scope):** Dashboard UI, React Flow, charts, PayPal Orders/Capture/Refunds/Webhooks, final frontend integration.

---

## 2. How to run the backend

```bash
git clone https://github.com/jeysiii02/paypal-kinta.git
cd paypal-kinta
npm install
cp .env.example .env   # Windows: copy .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

App: http://localhost:3000  
APIs: http://localhost:3000/api/...  
API docs: [`docs/API.md`](docs/API.md)

---

## 3. AI provider configuration

```env
AI_PROVIDER="gemini"          # or "heuristic"
AI_API_KEY=""                 # required for gemini
AI_MODEL="gemini-2.0-flash"
```

- **gemini** — real Google Generative AI calls; fails clearly if key missing (no fake success).
- **heuristic** — offline deterministic extraction/planning for local demo without a key.

AI never decides legal refund entitlement and never invents guaranteed recoveries.

---

## 4. Migrations & seed

```bash
npx prisma migrate dev
npx prisma db seed
npx tsx scripts/verify-seed.ts
```

Demo project: **University Tech Summit** (Dec 15, 2026 · Quezon City · ₱60,000 · 100 attendees).

---

## 5. API endpoints

Full contract: **[`docs/API.md`](docs/API.md)** — treat as frozen for frontend wiring.

Quick groups:

| Area | Prefix |
|---|---|
| Users / projects | `/api/users`, `/api/projects` |
| Suppliers / commitments / expenses | nested + resource routes |
| Disruptions / documents / analyze | `/api/disruptions/...` |
| Dependencies | `/api/.../dependencies/analyze` |
| Recovery plans / scenarios | `/api/recovery-plans`, `/api/scenarios/:id/calculate` |
| Recovery actions | `/api/recovery-actions/:id/{approve,reject,complete,fail}` |
| Activity | `/api/projects/:id/activity` |

Envelope: `{ success: true, data }` / `{ success: false, error }`.

---

## 6. Database model relationships (summary)

```
User 1─* Project
Project 1─* Supplier 1─* Commitment
Commitment *─* Commitment (via CommitmentDependency)
Project 1─* Expense, CustomerPayment, Disruption, Document, RecoveryPlan, Scenario, RecoveryAction, ActivityLog
Disruption 1─1 EventAnalysis
Disruption 1─* RecoveryPlan 1─* Scenario 1─* RecoveryAction
CustomerPayment 1─* Refund
WebhookEvent (standalone inbox for PayPal)
```

Money: integer **centavos** everywhere.

---

## 7. How Developer 2 should integrate the frontend

1. Use `GET /api/users` + `GET /api/projects` to bootstrap demo identity/project.
2. Build dashboard against frozen JSON contracts in `docs/API.md`.
3. Disruption flow: create disruption → upload notice/agreement → `POST .../analyze` → `POST .../dependencies/analyze` → `POST .../recovery-plans`.
4. Scenario UI: show 3 strategies; allow editing assumptions → `POST /api/scenarios/:id/calculate`.
5. Actions: create → await approval → `POST .../approve` (app record only).
6. For `requiresPaypal: true` + `CUSTOMER_REFUND` / payment capture: wire PayPal Sandbox **after** approval.
7. Do not expect Developer 1 to rewrite APIs after handover.

Suggested React Flow nodes: Project → Commitments → Dependencies → Disruption impact classifications.

---

## 8. PayPal-reserved database fields

| Model | Reserved fields |
|---|---|
| `CustomerPayment` | `paypalOrderId`, `paypalCaptureId`, `status`, `capturedAt` |
| `Refund` | `paypalRefundId`, `amount`, `reason`, `status` |
| `WebhookEvent` | `paypalEventId`, `eventType`, `processingStatus`, `payloadJson`, `receivedAt`, `processedAt` |
| `RecoveryAction` | `requiresPaypal` |

Env placeholders: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_BASE_URL`, `PAYPAL_WEBHOOK_ID`.

Seeded payments are **`CREATED` with null PayPal IDs** — not real Sandbox captures.

Financial engine only counts customer payments as collected when status is `CAPTURED` / `REFUNDED` / `PARTIALLY_REFUNDED`.

---

## 9. Known limitations

- No authentication/authorization (demo APIs are open locally).
- Homepage is still Next.js starter (UI is Dev 2).
- Without `AI_API_KEY`, use `AI_PROVIDER=heuristic`.
- Heuristic recovery cost figures are planning placeholders marked for confirmation.
- Approval does not move money.
- PDF extraction supports PDF + plain text only.
- SQLite file DB — fine for hackathon; swap provider later if needed.

---

## 10. Verification commands

```bash
npx tsx tests/dependency-engine.test.ts
npx tsx tests/finance-engine.test.ts
npm run dev
npx tsx scripts/verify-phase2.ts
npx tsx scripts/verify-phase3.ts
npx tsx scripts/verify-phase4.ts
npx tsx scripts/verify-phase5-8.ts
```

---

## 11. Developer 1 exit

Coding responsibility for backend ends at this handover. Questions about contracts should be answered by `docs/API.md` + this guide — not by requesting new Dev 1 feature work.
