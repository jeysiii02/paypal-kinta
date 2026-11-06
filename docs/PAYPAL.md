# KINTA PayPal Integration (Developer 2)

Base path: `/api/paypal`

## Modes

| Mode | When | Behavior |
|---|---|---|
| **mock** | `PAYPAL_MOCK=true` or missing client credentials | Local demo IDs (`MOCKORDER_*`, `MOCKCAPTURE_*`, `MOCKREFUND_*`) |
| **live** | Sandbox credentials set and mock off | Real PayPal Sandbox REST calls |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/paypal/config` | Public client config (`mode`, currency) |
| `POST` | `/api/paypal/orders` | Create order for a `CustomerPayment` |
| `POST` | `/api/paypal/orders/:orderId/capture` | Capture order |
| `POST` | `/api/paypal/refunds` | Refund a captured payment |
| `POST` | `/api/paypal/webhooks` | Webhook inbox → `WebhookEvent` |
| `POST` | `/api/paypal/recovery-actions/:id/execute` | After approval, run PayPal for `CUSTOMER_REFUND` |

## UI entry points

- `/projects/:id/payments` — create/capture/refund demo tickets
- Disruption workbench — approve recovery action → Execute PayPal refund

## Rules

- Approval (`POST /api/recovery-actions/:id/approve`) still does **not** move money.
- PayPal execution happens only on the Dev 2 execute route when `requiresPaypal` is true.
- Financial engine only counts payments as collected when status is `CAPTURED` / `REFUNDED` / `PARTIALLY_REFUNDED`.
