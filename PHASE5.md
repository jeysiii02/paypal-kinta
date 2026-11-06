# Phase 5 — AI recovery planning

- `generateRecoveryPlans()` → CANCEL / RELOCATE / RESCHEDULE
- Zod-validated payload; Gemini or heuristic
- Persists `RecoveryPlan` + 3 `Scenario` rows with initial financials
- `POST /api/disruptions/:id/recovery-plans`
