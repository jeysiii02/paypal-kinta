# KINTA — Phase 2 Complete

## What Phase 2 delivers

- Shared API helpers + `AppError` error model
- Zod validators for projects, suppliers, commitments, expenses
- Service layer (business logic separate from route handlers)
- Activity logging for project / supplier / commitment / expense mutations
- REST APIs for projects, suppliers, commitments, dependencies, expenses, users, activity

## API endpoints

| Method | URL | Purpose |
|---|---|---|
| `GET` | `/api/users` | List users (demo helper) |
| `GET` | `/api/projects` | List projects (`?userId=&includeArchived=true`) |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/:id` | Project details (suppliers, commitments, expenses, payments, disruptions) |
| `PATCH` | `/api/projects/:id` | Update project |
| `POST` | `/api/projects/:id/archive` | Archive project |
| `GET` | `/api/projects/:id/suppliers` | List suppliers |
| `POST` | `/api/projects/:id/suppliers` | Create supplier |
| `GET` | `/api/suppliers/:id` | Supplier details |
| `PATCH` | `/api/suppliers/:id` | Update supplier |
| `DELETE` | `/api/suppliers/:id` | Delete supplier (blocked if commitments exist) |
| `GET` | `/api/projects/:id/commitments` | List commitments + dependencies |
| `POST` | `/api/projects/:id/commitments` | Create commitment |
| `GET` | `/api/commitments/:id` | Commitment details |
| `PATCH` | `/api/commitments/:id` | Update commitment / status |
| `GET` | `/api/commitments/:id/dependencies` | List dependencies |
| `POST` | `/api/commitments/:id/dependencies` | Add dependency |
| `DELETE` | `/api/dependencies/:id` | Remove dependency |
| `GET` | `/api/projects/:id/expenses` | List expenses |
| `POST` | `/api/projects/:id/expenses` | Create expense |
| `GET` | `/api/expenses/:id` | Expense details |
| `PATCH` | `/api/expenses/:id` | Update expense |
| `DELETE` | `/api/expenses/:id` | Delete expense |
| `GET` | `/api/projects/:id/activity` | Activity log (`?limit=&action=`) |

## Response shape

```json
{ "success": true, "data": { } }
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | CONFLICT | BAD_REQUEST | INTERNAL_ERROR",
    "message": "...",
    "details": []
  }
}
```

## Money

All amounts are **integer PHP centavos**. Example: `₱15,000.00` → `1500000`.

## Verify

```bash
npm run db:seed
npm run dev
# other terminal
npx tsx scripts/verify-phase2.ts
```

## Out of scope (later phases)

Disruption reporting, PDF extraction, AI analysis, dependency engine, recovery plans, financial simulator, recovery action workflow APIs, PayPal, frontend.
