# KINTA API Reference (Developer 1 — frozen contracts)

Base URL (local): `http://localhost:3000`

All monetary amounts are **integer PHP centavos** (`₱1.00` → `100`).

## Response envelope

**Success**
```json
{ "success": true, "data": {} }
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | CONFLICT | BAD_REQUEST | INTERNAL_ERROR",
    "message": "Human-readable message",
    "details": []
  }
}
```

---

## Users

### `GET /api/users`
List users (demo helper; no auth in Dev 1).

---

## Projects

### `GET /api/projects`
Query: `userId?`, `includeArchived=true?`

### `POST /api/projects`
```json
{
  "userId": "cuid",
  "name": "string",
  "description": "string?",
  "eventDate": "2026-12-15T09:00:00+08:00",
  "location": "Quezon City",
  "budget": 6000000,
  "expectedAttendees": 100,
  "status": "DRAFT|ACTIVE|..."
}
```

### `GET /api/projects/:id`
Full project details (suppliers, commitments, expenses, payments, disruptions, counts).

### `PATCH /api/projects/:id`
Partial update of project fields.

### `POST /api/projects/:id/archive`
Sets status `ARCHIVED`.

---

## Suppliers

### `GET /api/projects/:id/suppliers`
### `POST /api/projects/:id/suppliers`
```json
{
  "name": "Venue Alpha",
  "contactPerson": "Maria Santos",
  "email": "bookings@venuealpha.demo",
  "phone": "+63-917-100-0001",
  "category": "VENUE|CATERING|PHOTOGRAPHY|EQUIPMENT|TRANSPORT|ENTERTAINMENT|OTHER",
  "notes": "string?"
}
```

### `GET /api/suppliers/:id`
### `PATCH /api/suppliers/:id`
### `DELETE /api/suppliers/:id`
Blocked if commitments exist.

---

## Commitments & dependencies

### `GET /api/projects/:id/commitments`
### `POST /api/projects/:id/commitments`
```json
{
  "supplierId": "cuid",
  "title": "Main auditorium booking",
  "description": "string?",
  "agreedAmount": 1500000,
  "amountPaid": 750000,
  "paymentStatus": "UNPAID|PARTIAL|PAID|REFUNDED|PARTIALLY_REFUNDED",
  "serviceDate": "ISO?",
  "cancellationConditions": "string?",
  "refundConditions": "string?",
  "status": "DRAFT|CONFIRMED|AT_RISK|CANCELLED|FULFILLED|RENEGOTIATED"
}
```

### `GET /api/commitments/:id`
### `PATCH /api/commitments/:id`

### `GET /api/commitments/:id/dependencies`
### `POST /api/commitments/:id/dependencies`
```json
{
  "dependencyType": "COMMITMENT|EVENT_DATE|LOCATION|VENUE_ACCESS|SERVICE_ARRANGEMENT",
  "description": "string",
  "dependsOnCommitmentId": "cuid?"
}
```
`dependsOnCommitmentId` required when `dependencyType=COMMITMENT`.

### `DELETE /api/dependencies/:id`

---

## Expenses

### `GET /api/projects/:id/expenses`
### `POST /api/projects/:id/expenses`
```json
{
  "description": "Deposit paid",
  "amount": 750000,
  "category": "SUPPLIER_PAYMENT|ADDITIONAL_COST|PENALTY|REFUND_OUT|OTHER",
  "commitmentId": "cuid?",
  "incurredAt": "ISO?",
  "notes": "string?"
}
```

### `GET /api/expenses/:id`
### `PATCH /api/expenses/:id`
### `DELETE /api/expenses/:id`

---

## Disruptions & documents

### `GET /api/projects/:id/disruptions`
### `POST /api/projects/:id/disruptions`
```json
{
  "title": "Venue cancellation",
  "description": "Written description...",
  "reportedAt": "ISO?"
}
```

### `GET /api/disruptions/:id`
### `PATCH /api/disruptions/:id`

### `GET /api/disruptions/:id/documents`
### `POST /api/disruptions/:id/documents` (multipart)
- `file`: PDF or `.txt`
- `type`: `NOTICE|AGREEMENT|OTHER`

### `GET|POST /api/projects/:id/documents`
Project-level upload; optional form field `disruptionId`.

### `GET /api/documents/:id`

### `POST /api/disruptions/:id/analyze`
Runs `analyzeBusinessEvent()` (Gemini or heuristic). Persists `EventAnalysis`.

### `GET /api/disruptions/:id/analysis`

**Analysis fields:** incidentType, incidentSummary, affectedSupplierIds, affectedCommitmentIds, potentiallyAffectedCommitmentIds, unaffectedCommitmentIds, relevantDates, relevantAgreementConditions, evidenceReferences, missingInformation, assumptions, confidenceLevel, legalDisclaimer, analysisMethod.

AI does **not** determine legal refund entitlement.

---

## Dependency analysis

### `POST /api/disruptions/:id/dependencies/analyze`
Body optional: `{ "seedCommitmentIds": ["cuid"] }`  
If omitted, uses `EventAnalysis.affectedCommitmentIds`.

### `GET /api/disruptions/:id/dependencies`
Stored dependency analysis from EventAnalysis JSON.

### `POST /api/projects/:id/dependencies/analyze`
```json
{ "seedCommitmentIds": ["cuid"] }
```

**Classifications:** `DIRECTLY_AFFECTED` | `INDIRECTLY_AFFECTED` | `UNCERTAIN` | `UNAFFECTED`  
Each item includes `explanation` and `assumedCancelled: false`.

---

## Recovery plans & scenarios

### `POST /api/disruptions/:id/recovery-plans`
Requires prior event analysis. Optional body:
```json
{ "userAssumptions": ["string"] }
```
Creates `RecoveryPlan` + 3 `Scenario` rows (CANCEL, RELOCATE, RESCHEDULE) with initial deterministic financials.

### `GET /api/projects/:id/recovery-plans`
### `GET /api/recovery-plans/:id`

### `GET /api/scenarios/:id`
### `POST /api/scenarios/:id/calculate`
Body (all optional centavos):
```json
{
  "estimatedAdditionalCosts": 0,
  "estimatedRecoverableExpenses": 0,
  "estimatedNonrecoverableExpenses": 0,
  "potentialCustomerRefunds": 0,
  "notes": ["string"]
}
```
Uses `calculateScenarioFinancials()` — AI does not compute final money.

---

## Recovery actions

Statuses: `DRAFT|NEEDS_CONFIRMATION|AWAITING_APPROVAL|APPROVED|PROCESSING|COMPLETED|FAILED|REJECTED`

### `GET /api/projects/:id/recovery-actions`
Query: `status?`, `scenarioId?`

### `POST /api/projects/:id/recovery-actions`
```json
{
  "scenarioId": "cuid?",
  "type": "CANCEL_COMMITMENT|RENEGOTIATE|RELOCATE|RESCHEDULE|REQUEST_REFUND|CUSTOMER_REFUND|ADDITIONAL_BOOKING|OTHER",
  "title": "string",
  "description": "string?",
  "commitmentId": "cuid?",
  "amount": 0,
  "requiresPaypal": false,
  "status": "DRAFT"
}
```

### `GET /api/recovery-actions/:id`
### `PATCH /api/recovery-actions/:id`
### `POST /api/recovery-actions/:id/approve` — **record only; no PayPal**
### `POST /api/recovery-actions/:id/reject` — `{ "reason": "..." }`
### `POST /api/recovery-actions/:id/complete`
### `POST /api/recovery-actions/:id/fail` — `{ "reason": "..." }`

---

## Activity log

### `GET /api/projects/:id/activity`
Query: `limit?` (1–500), `action?` (ActivityAction enum)

---

## PayPal-reserved fields (no Dev 1 API execution)

| Model | Fields |
|---|---|
| `CustomerPayment` | `paypalOrderId`, `paypalCaptureId`, `status`, `capturedAt` |
| `Refund` | `paypalRefundId`, `status` |
| `WebhookEvent` | `paypalEventId`, `eventType`, `processingStatus`, `payloadJson` |
| `RecoveryAction` | `requiresPaypal` flag for Dev 2 wiring |

Seeded customer payments use `status=CREATED` with **null** PayPal IDs.
