# E-commerce Order Integration

Systego forwards every new storefront order to the external e-commerce platform.
The platform then controls the order status from its side through two public
endpoints, and the new status is persisted in Systego and visible in the admin
panel.

> There is **no inbound order-creation endpoint**. Systego is the only creator of
> these orders; the external platform only updates their status.

## Configuration

```env
# This tenant's key, issued by Super Systego Back. The external platform must
# send it as `x-api-key` when it calls accept/reject. Each tenant has its own
# key and its own backend/database, so only this key is accepted here.
SUPER_SYSTEGO_API_KEY=sk_...

# Outbound only: the key the external platform expects on its webhook.
# Leave empty to send SUPER_SYSTEGO_API_KEY.
ECOMMERCE_WEBHOOK_API_KEY=

# External platform webhook (has a default in code).
ECOMMERCE_WEBHOOK_URL=https://bcknd.smartego.org/api/webhooks/custom/order
```

If no inbound key is available at all, accept/reject fail closed with `503`.
`X_API_KEY` (the Plesk key) is **not** used.

`x-api-key` validation is local (constant-time comparison); it does not call
Super Systego on every callback. A key from another tenant does not unlock this
backend and cannot read its orders.

---

## 1) Outbound: Systego → external platform

When a customer creates an order from the storefront
(`POST /api/store/order/checkout`), Systego sends it to the external platform:

```
POST $ECOMMERCE_WEBHOOK_URL   (default: https://bcknd.smartego.org/api/webhooks/custom/order)
Content-Type: application/json
X-API-KEY: $ECOMMERCE_WEBHOOK_API_KEY  (falls back to SUPER_SYSTEGO_API_KEY)
```

Body:

```json
{
  "id": "11088739",
  "customer_name": "أحمد محمود",
  "customer_phone": "01206610346",
  "total_price": 650,
  "currency": "EGP"
}
```

- `id` is the Systego order `reference`. It is the value the platform should
  send back as `?id=` in accept/reject.
- If the platform's response contains its own order id (`id`, `_id`, `order_id`
  or `orderId`), Systego stores it in `externalOrderId`, and the platform can
  use **its own id** in `?id=` instead of the reference.
- Fire-and-forget: a slow or unreachable platform never delays or fails the
  customer's checkout. Failures are logged as `[externalOrderSync] ...`.
- `currency` defaults to `EGP`.

---

## 2) Accept an order

```
POST|GET https://<systego-backend-domain>/api/public/orders/accept?id=11088739
X-API-KEY: <SUPER_SYSTEGO_API_KEY>
```

Status becomes `processing`.

### Identifier

Accepted in a query string (`?id=...`), a JSON body (`{ "id": "..." }`) or a
route param. Aliases: `id`, `order_id`, `orderId`, `reference`.

Lookup order: `externalOrderId` → `reference` → Mongo `_id`.

So `?id=` works with:
- the value Systego sent outbound (`reference`, e.g. `11088739`), or
- the platform's own order id, if it returned one in its webhook response.

### Behaviour

- Changes **only** the status: `processing` + a `statusHistory` entry.
- Does not touch stock, payment, or shipping.
- Idempotent: if the order is already `processing`, returns `200` with
  `changed: false`.
- The new status is visible in the admin panel like any other order status.

### Response `200`

```json
{
  "success": true,
  "data": {
    "message": "Order accepted successfully",
    "changed": true,
    "previous_status": "pending",
    "order": {
      "order_id": "11088739",
      "reference": "11088739",
      "external_order_id": null,
      "status": "processing",
      "status_description": "Order accepted by the e-commerce platform"
    }
  }
}
```

---

## 3) Reject an order

```
POST|GET https://<systego-backend-domain>/api/public/orders/reject?id=11088739
X-API-KEY: <SUPER_SYSTEGO_API_KEY>
```

Same rules as accept, but the status becomes `canceled`.

---

## Endpoint summary

| Method      | Path                                         | Purpose                     |
| ----------- | -------------------------------------------- | --------------------------- |
| `POST`      | `https://bcknd.smartego.org/api/webhooks/custom/order` | Systego → platform (outbound) |
| `POST\|GET` | `/api/public/orders/accept?id=11088739`      | Platform → Systego: accept  |
| `POST\|GET` | `/api/public/orders/reject?id=11088739`      | Platform → Systego: reject  |

---

## Error responses

| Code  | Meaning                                                                    |
| ----- | -------------------------------------------------------------------------- |
| `400` | Missing/invalid `id`.                                                      |
| `401` | Missing or wrong `x-api-key`.                                              |
| `404` | Order not found (accept/reject).                                           |
| `503` | No inbound key (`SUPER_SYSTEGO_API_KEY`) is configured on the server.      |

All errors use the standard shape:

```json
{
  "success": false,
  "error": {
    "code": 401,
    "message": "Invalid or missing x-api-key"
  }
}
```

---

## cURL examples

```bash
# Accept
curl -X POST "https://<systego-backend-domain>/api/public/orders/accept?id=11088739" \
  -H "Accept: application/json" \
  -H "X-API-KEY: $SUPER_SYSTEGO_API_KEY"

# Reject
curl -X POST "https://<systego-backend-domain>/api/public/orders/reject?id=11088739" \
  -H "Accept: application/json" \
  -H "X-API-KEY: $SUPER_SYSTEGO_API_KEY"
```
