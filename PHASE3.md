# KINTA — Phase 3 Complete

## What Phase 3 delivers

- Disruption reporting APIs
- Document upload (PDF / plain text) with storage under `/uploads`
- PDF text extraction via `pdf-parse`
- `analyzeBusinessEvent()` AI service (Gemini) with Zod-validated output
- Offline `AI_PROVIDER=heuristic` deterministic extractor for local demo (no fabricated Gemini success)
- EventAnalysis persistence + activity logging

## AI configuration

```env
AI_PROVIDER="gemini"          # or "heuristic"
AI_API_KEY=""                 # required when provider=gemini
AI_MODEL="gemini-2.0-flash"
```

- **gemini** — calls Google Generative AI; fails clearly if `AI_API_KEY` is missing (no fake success).
- **heuristic** — offline extraction from disruption text + documents + DB dependencies. Labels `analysisMethod: "heuristic"`. Still does **not** assert legal refund entitlement.

## Analysis output (Zod)

- `incidentType`, `incidentSummary`
- `affectedSupplierIds`
- `affectedCommitmentIds` — directly impacted
- `potentiallyAffectedCommitmentIds` — dependency/logistics risk, not auto-cancelled
- `unaffectedCommitmentIds`
- `relevantDates`, `relevantAgreementConditions`, `evidenceReferences`
- `missingInformation`, `assumptions`, `confidenceLevel`
- `legalDisclaimer`, `analysisMethod`

## API endpoints

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/api/projects/:id/disruptions` | List disruptions |
| `POST` | `/api/projects/:id/disruptions` | Report disruption |
| `GET` | `/api/disruptions/:id` | Disruption + documents + analysis |
| `PATCH` | `/api/disruptions/:id` | Update disruption |
| `GET` | `/api/disruptions/:id/documents` | List documents |
| `POST` | `/api/disruptions/:id/documents` | Upload PDF/txt (`multipart`: `file`, `type`) |
| `POST` | `/api/disruptions/:id/analyze` | Run `analyzeBusinessEvent()` |
| `GET` | `/api/disruptions/:id/analysis` | Fetch stored analysis |
| `GET/POST` | `/api/projects/:id/documents` | Project-level documents |
| `GET` | `/api/documents/:id` | Document detail |

## Verify

```bash
# .env → AI_PROVIDER=heuristic  (or set AI_API_KEY for gemini)
npm run db:seed
npm run dev
npx tsx scripts/verify-phase3.ts
```

## Out of scope (later)

Dependency analysis engine (Phase 4), recovery plans (5), financial simulator (6), recovery actions (7), full API docs (8), PayPal / frontend.
