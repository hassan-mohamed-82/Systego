# Online Orders API — Ecommerce Integration

واجهات عامة (بدون JWT) لاستقبال أوردرات الإيكومرس في Systego.

- المصادقة: هيدر `X-API-KEY` فقط.
- المفتاح: مفتاح الـ tenant الخاص بكل عميل (نفس `SUPER_SYSTEGO_API_KEY` في `.env`).
  لو حبيت تفصل مفتاح الإيكومرس عن مفتاح الـ tenant، ضيف `ECOMMERCE_API_KEY` في `.env`
  والـ API هيستخدمه تلقائيًا بدلًا من مفتاح الـ tenant.
- الأوردر بيتخزن في نفس جدول Online Orders، ويظهر في الأدمن بحالة `pending`.

Base URL: `/api/public`

---

## 1) إنشاء أوردر

```http
POST /api/public/online-orders
Content-Type: application/json
Accept: application/json
X-API-KEY: {YOUR_API_KEY}
```

Body:

```json
{
  "id": "ORD-5091",
  "customer_name": "أحمد محمود",
  "customer_phone": "01206610346",
  "total_price": 650.0,
  "currency": "EGP"
}
```

| الحقل | مطلوب | الوصف |
|---|---|---|
| `id` | ✅ | رقم الأوردر عند الإيكومرس. بيستخدم بعد كده في accept/reject. |
| `customer_name` | ✅ | اسم العميل. |
| `customer_phone` | ✅ | رقم الموبايل (10–15 رقم). |
| `total_price` | ✅ | إجمالي الأوردر، رقم أكبر من أو يساوي 0. |
| `currency` | ❌ | كود العملة بثلاث حروف، الافتراضي `EGP`. |
| `payment_method` | ❌ | ObjectId لطريقة دفع فعّالة (اختياري). لو مش موجود بيتم اختيار كاش/COD أو أول طريقة دفع فعّالة. |

Response `201`:

```json
{
  "success": true,
  "data": {
    "message": "Online order created successfully",
    "created": true,
    "order": {
      "_id": "6700...",
      "id": "ORD-5091",
      "reference": "11051234",
      "status": "pending",
      "customer_name": "أحمد محمود",
      "customer_phone": "01206610346",
      "total_price": 650,
      "currency": "EGP",
      "created_at": "2026-11-07T10:00:00.000Z",
      "updated_at": "2026-11-07T10:00:00.000Z"
    }
  }
}
```

لو نفس `id` اتبعت تاني، الـ API بيرجع نفس الأوردر بدل ما يعمل duplicate:

```json
{
  "success": true,
  "data": {
    "message": "Order already exists",
    "created": false,
    "order": { "...": "..." }
  }
}
```

---

## 2) قبول الأوردر

```http
POST /api/public/online-orders/accept?id=ORD-5091
Content-Type: application/json
Accept: application/json
X-API-KEY: {YOUR_API_KEY}
```

- `id` ممكن يكون:
  - الـ `id` اللي الإيكومرس بعته وقت الإنشاء (`ORD-5091`)، أو
  - الـ `reference` بتاع Systego، أو
  - الـ MongoDB `_id`.
- النتيجة: `pending` → `processing`.

Response `200`:

```json
{
  "success": true,
  "data": {
    "message": "Order accepted successfully",
    "changed": true,
    "order": {
      "_id": "6700...",
      "id": "ORD-5091",
      "reference": "11051234",
      "status": "processing",
      "customer_name": "أحمد محمود",
      "customer_phone": "01206610346",
      "total_price": 650,
      "currency": "EGP"
    }
  }
}
```

لو الأوردر already `processing` بيرجع `changed: false` ورسالة `Order is already accepted`.

---

## 3) رفض الأوردر

```http
POST /api/public/online-orders/reject?id=ORD-5091
Content-Type: application/json
Accept: application/json
X-API-KEY: {YOUR_API_KEY}
```

- النتيجة: `pending` → `canceled`.

Response `200`:

```json
{
  "success": true,
  "data": {
    "message": "Order rejected successfully",
    "changed": true,
    "order": {
      "_id": "6700...",
      "id": "ORD-5091",
      "reference": "11051234",
      "status": "canceled",
      "customer_name": "أحمد محمود",
      "customer_phone": "01206610346",
      "total_price": 650,
      "currency": "EGP"
    }
  }
}
```

لو الأوردر already `canceled` بيرجع `changed: false` ورسالة `Order is already rejected`.

---

## 4) حالات الأوردر

| الحالة | المعنى |
|---|---|
| `pending` | الأوردر وصل من الإيكومرس ومستني قرار. |
| `processing` | تم قبول الأوردر. |
| `canceled` | تم رفض/إلغاء الأوردر. |

> Accept مسموح من `pending` فقط. Reject مسموح من `pending` فقط.
> لو الأوردر بقى `processing` مش ممكن يترفض، ولو بقى `canceled` مش ممكن يترفض تاني.

---

## 5) الأخطاء

كل الأخطاء بنفس شكل باقي الـ API:

```json
{
  "success": false,
  "error": {
    "code": 401,
    "message": "Invalid API key",
    "details": { "code": "API_KEY_INVALID" }
  }
}
```

| الحالة | الكود | السبب |
|---|---|---|
| مفتاح ناقص | `401` | `Missing X-API-KEY header` |
| مفتاح غلط | `401` | `Invalid API key` |
| بيانات ناقصة/غلط | `400` | `id is required`, `customer_name is required`, ... |
| أوردر مش موجود | `404` | `Order not found` |
| حالة مش مسموحة | `400` | `Order cannot be accepted from status "..."` |
