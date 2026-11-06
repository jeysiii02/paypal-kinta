# KINTA — Phase 4 Complete

## What Phase 4 delivers

- Deterministic `identifyAffectedCommitments()` dependency analysis engine
- Classifications with explanations:
  - `DIRECTLY_AFFECTED`
  - `INDIRECTLY_AFFECTED`
  - `UNCERTAIN`
  - `UNAFFECTED`
- **Never** auto-cancels connected commitments (`assumedCancelled: false`)
- APIs for disruption-scoped and project-scoped analysis
- Activity log: `DEPENDENCY_ANALYSIS_COMPLETED`
- Unit fixture mirroring University Tech Summit (venue → catering/equipment indirect, photography uncertain)

## Classification rules (summary)

| Situation | Result |
|---|---|
| Seed / named disrupted commitment | `DIRECTLY_AFFECTED` |
| Depends on seed via `VENUE_ACCESS` / `COMMITMENT` | `INDIRECTLY_AFFECTED` |
| Depends on seed via `LOCATION` / `SERVICE_ARRANGEMENT` | `INDIRECTLY_AFFECTED` (re-scope possible) |
| `EVENT_DATE` only (e.g. photography) | `UNCERTAIN` — may still work at another venue/date |
| No path to seed | `UNAFFECTED` |

## API endpoints

| Method | URL | Purpose |
|---|---|---|
| `POST` | `/api/disruptions/:id/dependencies/analyze` | Analyze using EventAnalysis seeds or `{ seedCommitmentIds }` |
| `GET` | `/api/disruptions/:id/dependencies` | Fetch last stored analysis (on EventAnalysis) |
| `POST` | `/api/projects/:id/dependencies/analyze` | Standalone `{ seedCommitmentIds: string[] }` |

## Verify

```bash
npx tsx tests/dependency-engine.test.ts
npm run dev
npx tsx scripts/verify-phase4.ts
```

## Out of scope (later)

AI recovery plans (Phase 5), financial simulator (6), recovery actions (7), full API docs (8).
