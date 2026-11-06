# KINTA PayPal Integration (Developer 2)

Base path: `/api/paypal`

## Modes

| Mode | When | Behavior |
|---|---|---|
| **mock** | `PAYPAL_MOCK=true` or missing client credentials | Local demo IDs (`MOCKORDER_*`, `MOCKCAPTURE_*`, `MOCKREFUND_*`) |
| **live** | Sandbox credentials set and mock off | Real PayPal Sandbox REST + JS SDK Buttons |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/paypal/config` | Public client config (`mode`, currency, `sdkEnabled`) |
| `POST` | `/api/paypal/orders` | Create Orders v2 order for a `CustomerPayment` |
| `GET` | `/api/paypal/orders/:orderId` | Show order details |
| `POST` | `/api/paypal/orders/:orderId/capture` | Capture order |
| `POST` | `/api/paypal/refunds` | Refund a captured payment |
| `POST` | `/api/paypal/webhooks` | Webhook inbox → `WebhookEvent` |
| `POST` | `/api/paypal/recovery-actions/:id/execute` | After approval, run PayPal for `CUSTOMER_REFUND` |

## Frontend SDK

Live Sandbox mode mounts `@paypal/react-paypal-js` Buttons on `/projects/:id/payments`:

1. `createOrder` → `POST /api/paypal/orders`
2. Buyer approves in PayPal
3. `onApprove` → `POST /api/paypal/orders/:id/capture`

Mock mode keeps a one-click create+capture path for offline demos.

## AI + PayPal coupling

| Step | Owner |
|---|---|
| Disruption analysis / recovery plans / recovery brief | AI (Gemini or heuristic) |
| Scenario money math | Deterministic finance engine |
| Capture / refund execution | PayPal after explicit approval |

Judge helper: `GET /api/system/tech`  
Verify: `npm run verify:paypal-ai`

## Env

```env
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=
PAYPAL_CURRENCY=PHP
PAYPAL_BRAND_NAME=KINTA
PAYPAL_RETURN_URL=http://localhost:3000/dashboard
PAYPAL_CANCEL_URL=http://localhost:3000/dashboard
PAYPAL_MOCK=true
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
```

For real Sandbox Buttons: set credentials, set `PAYPAL_MOCK=false`, mirror client id in `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.

## Rules

- Approval (`POST /api/recovery-actions/:id/approve`) still does **not** move money.
- PayPal execution happens only on the Dev 2 execute route when `requiresPaypal` is true.
- Financial engine only counts payments as collected when status is `CAPTURED` / `REFUNDED` / `PARTIALLY_REFUNDED`.
- Live writes send `PayPal-Request-Id` for idempotency.
