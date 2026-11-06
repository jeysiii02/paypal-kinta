# KINTA — Phase 1 Complete

## What Phase 1 delivers

- Next.js App Router + TypeScript project scaffold
- Prisma ORM + SQLite database
- Complete schema for all 16 required models
- Migration ready (`prisma migrate`)
- Seeded **University Tech Summit** demo scenario
- `.env.example` with AI + PayPal placeholders (PayPal unused until Dev 2)
- Prisma client singleton (`src/lib/prisma.ts`)
- Money helpers in centavos (`src/lib/money.ts`)

## Proposed backend structure (full project)

```
paypal-kinta/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   └── api/                 # REST routes (Phase 2+)
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── money.ts
│   │   ├── errors.ts            # Phase 2
│   │   └── validators/          # Zod schemas (Phase 2+)
│   └── services/                # Business logic (Phase 2+)
│       ├── projects.ts
│       ├── suppliers.ts
│       ├── commitments.ts
│       ├── expenses.ts
│       ├── disruptions.ts
│       ├── pdf.ts
│       ├── dependency.ts
│       ├── finance.ts
│       ├── recovery.ts
│       ├── activity.ts
│       └── ai/
├── tests/
├── docs/
│   └── API.md                   # Phase 8
├── uploads/                     # PDF storage
├── .env.example
├── README.md
└── HANDOVER.md                  # Phase 8
```

## Database models

| Model | Purpose |
|---|---|
| User | Organizer account |
| Project | Event / business project |
| Supplier | Project-scoped supplier |
| Commitment | Supplier commitment + payment/cancel terms |
| CommitmentDependency | Commitment → commitment / date / location / venue access |
| Expense | Recorded project expenses |
| CustomerPayment | PayPal-ready payment records (Dev 2) |
| Refund | PayPal-ready refunds (Dev 2) |
| Disruption | Disruption reports |
| Document | Uploaded PDFs + extracted text |
| EventAnalysis | Zod-validated AI analysis output |
| RecoveryPlan | AI-generated 3-strategy plan payload |
| Scenario | Strategy instance + deterministic financials |
| RecoveryAction | Action workflow (no PayPal execution) |
| ActivityLog | Audit trail |
| WebhookEvent | PayPal webhook inbox (Dev 2) |

**Money:** all amounts are integer minor units (PHP centavos).

## Seed summary — University Tech Summit

- Event: Dec 15, 2026 · Quezon City · ₱60,000 · 100 attendees
- Suppliers: Venue Alpha ₱15k, Catering Beta ₱8k, Photography Gamma ₱5k, Equipment Delta ₱4k
- Dependencies: catering→location+date, photography→date, equipment→venue access
- Disruption: fictional Venue Alpha cancellation notice + agreement excerpt
- Customer payments: 3 × ₱500 with status `CREATED` and **null** PayPal IDs

## Commands

```bash
npm install
npx prisma migrate dev --name init
npx prisma db seed
npx prisma studio   # optional GUI
```

## Out of scope for Phase 1

API routes, AI services, PDF extraction, financial simulator, recovery actions — those start in Phase 2+.
