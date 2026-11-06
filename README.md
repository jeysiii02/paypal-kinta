# KINTA

**AI-Powered Business Impact & Recovery Intelligence**

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).

When a business event is disrupted — venue cancelled, supplier fails, schedule breaks — KINTA helps organizers understand impact, evaluate recovery options, and make financial decisions with clear evidence instead of guesswork.

| | |
|---|---|
| **Repo** | [github.com/jeysiii02/paypal-kinta](https://github.com/jeysiii02/paypal-kinta) |
| **Stack** | Next.js App Router · TypeScript · Prisma · SQLite · Zod · Gemini-ready AI |
| **Payments** | PayPal Sandbox (Developer 2) |

---

## What KINTA does

1. **Track projects & commitments** — venues, catering, photography, equipment, and their payment/cancellation terms  
2. **Report disruptions** — written description + PDF notices/agreements  
3. **Analyze with AI** — incident type, affected suppliers/commitments, missing info, confidence (no fabricated legal entitlement)  
4. **Map dependencies** — direct vs indirect vs unaffected commitments with explanations  
5. **Generate recovery strategies** — Cancel · Relocate · Reschedule  
6. **Simulate finances deterministically** — AI never does the final money math; amounts are integer centavos  
7. **Approve recovery actions** — workflow only; PayPal refunds wired by Developer 2  

---

## Team split (strict one-way handover)

| Role | Owns |
|---|---|
| **Developer 1 — Backend & AI** | Database, APIs, PDF extraction, AI analysis, dependency engine, recovery plans, financial simulator, activity logs, API docs |
| **Developer 2 — Frontend & PayPal** | Dashboard UI, React Flow, charts, PayPal Orders/Capture/Refunds/Webhooks, final integration |

Developer 1 does **not** implement frontend pages or PayPal API calls.  
Developer 2 starts after backend handover.

---

## Phase status

| Phase | Scope | Status |
|---|---|---|
| **1** | Project setup, Prisma schema, migrations, University Tech Summit seed | ✅ Done |
| **2** | Project / supplier / commitment / expense APIs | ✅ Done |
| **3** | Disruption reporting, PDF text extraction, AI event analysis | ✅ Done |
| **4** | Dependency analysis engine | ✅ Done |
| **5** | AI recovery plan generation | ✅ Done |
| **6** | Deterministic financial simulation engine | ✅ Done |
| **7** | Recovery action APIs + activity logging | ✅ Done |
| **8** | Tests, API documentation, handover guide | ✅ Done |

**Developer 1 backend is complete.** See [`HANDOVER.md`](HANDOVER.md) and [`docs/API.md`](docs/API.md).

---

## Quick start

### Requirements

- Node.js 20+
- npm 10+

### Install & run

```bash
git clone https://github.com/jeysiii02/paypal-kinta.git
cd paypal-kinta
npm install
cp .env.example .env        # Windows: copy .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)  
DB GUI (optional): `npm run db:studio`

### Useful scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Reset DB + re-seed |
| `npm run db:studio` | Prisma Studio |
| `npm run build` | Production build |
| `npm run test:unit` | Dependency + finance unit tests |
| `npm run verify:phase5-8` | Smoke test recovery plans → actions |

---

## Environment

Copy `.env.example` → `.env`:

```env
DATABASE_URL="file:./dev.db"

AI_PROVIDER="gemini"
AI_API_KEY=""
AI_MODEL="gemini-2.0-flash"

PAYPAL_CLIENT_ID=""
PAYPAL_CLIENT_SECRET=""
PAYPAL_BASE_URL="https://api-m.sandbox.paypal.com"
PAYPAL_WEBHOOK_ID=""
```

- **AI_PROVIDER** — `gemini` (requires `AI_API_KEY`) or `heuristic` (offline deterministic extraction for local demo)  
- **PAYPAL_*** — reserved for Developer 2; do not commit real credentials  

---

## Project structure

```
paypal-kinta/
├── prisma/
│   ├── schema.prisma          # All 16 models
│   ├── seed.ts                # University Tech Summit demo
│   └── migrations/
├── src/
│   ├── app/                   # Next.js App Router
│   │   └── api/               # REST APIs (Phase 2+)
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── money.ts           # Centavos helpers
│   │   └── validators/        # Zod schemas (Phase 2+)
│   └── services/              # Business logic (Phase 2+)
├── tests/
├── docs/API.md                # Frozen API contracts
├── uploads/                   # Uploaded PDFs
├── .env.example
├── HANDOVER.md                # Dev 1 → Dev 2 guide
└── PHASE*.md                  # Per-phase notes
```

---

## Database (Phase 1)

All monetary values are **integer minor units (PHP centavos)**.  
`₱15,000.00` → `1500000`

### Models

| Model | Role |
|---|---|
| `User` | Organizer |
| `Project` | Event / business project |
| `Supplier` | Project-scoped supplier |
| `Commitment` | Amounts, payment status, cancel/refund conditions |
| `CommitmentDependency` | Depends on commitment / event date / location / venue access |
| `Expense` | Recorded costs |
| `CustomerPayment` | PayPal-ready fields (`paypalOrderId`, `paypalCaptureId`) |
| `Refund` | PayPal-ready (`paypalRefundId`) |
| `Disruption` | Disruption report |
| `Document` | PDF/notice metadata + extracted text |
| `EventAnalysis` | Validated AI analysis payload |
| `RecoveryPlan` | 3-strategy AI plan JSON |
| `Scenario` | Strategy + deterministic financials |
| `RecoveryAction` | Approval workflow (no PayPal execution) |
| `ActivityLog` | Audit trail |
| `WebhookEvent` | PayPal webhook inbox (Dev 2) |

PayPal fields are **schema-ready only**. Seeded payments use status `CREATED` with **null** PayPal IDs until Developer 2 creates Sandbox transactions.

---

## Demo seed — University Tech Summit

| Field | Value |
|---|---|
| Event date | December 15, 2026 |
| Location | Quezon City |
| Budget | ₱60,000 |
| Attendees | 100 |

| Supplier | Service | Amount |
|---|---|---:|
| Venue Alpha | Venue | ₱15,000 |
| Catering Beta | Catering | ₱8,000 |
| Photography Gamma | Photography | ₱5,000 |
| Equipment Delta | Equipment rental | ₱4,000 |

**Dependencies**

- Event requires Venue Alpha  
- Catering → event date + location  
- Photography → event date  
- Equipment → venue access  

Also seeded: fictional Venue Alpha cancellation notice + agreement excerpt, and 3 customer payment placeholders (₱500 each, no PayPal captures).

Verify seed:

```bash
npx tsx scripts/verify-seed.ts
```

---

## Design rules (backend)

- Validate requests/AI outputs with **Zod**  
- Keep **AI logic** separate from **financial calculations**  
- Do **not** invent supplier quotes or guaranteed recoveries  
- Do **not** let AI decide legal refund entitlement  
- Do **not** return fake successful AI results  
- Do **not** implement PayPal execution in Developer 1 scope  

---

## Hackathon context

- Challenge: [PayPal AI Hackathon on Devpost](https://paypalaihackathon.devpost.com/)  
- Product: KINTA — disruption impact + recovery intelligence for event/business commitments  
- Payments path (Dev 2): PayPal Sandbox Orders → Capture → Refunds → Webhooks  

---

## License / notes

Demo suppliers, notices, and payments are **fictional**.  
Do not treat seeded cancellation text as real legal advice or entitlement.
