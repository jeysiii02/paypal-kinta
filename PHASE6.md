# Phase 6 — Deterministic financial simulator

- `calculateScenarioFinancials()` — AI does not compute final money
- Classifies CONFIRMED / ESTIMATE / ASSUMPTION / NEEDS_SUPPLIER_CONFIRMATION
- `POST /api/scenarios/:id/calculate`
- Unit tests: `tests/finance-engine.test.ts`
