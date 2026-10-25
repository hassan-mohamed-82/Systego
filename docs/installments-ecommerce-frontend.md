# التقسيط (Installments) — دليل فرونت الإيكومرس

النسخة دي مبنية على نفس اللي اتعمل في الـ POS، ونفس الـ endpoints بيرجع نفس الشكل
عشان الفرونت ياخد نفس السلوك. **تحصيل الأقساط بيتم من الفرع / الأدمن فقط** — مفيش
دفع أونلاين للأقساط.

---

## 1) قبل أي حاجة: إعدادات التقسيط

الأدمن بيحدد الفايدة من لوحة التحكم:

```
GET /api/admin/installments/settings
PUT /api/admin/installments/settings
```

`PUT` body:

```json
{
  "enabled": true,
  "interest_type": "percentage",   // "percentage" | "fixed"
  "interest_value": 10,            // 10% من المبلغ الممول، أو 50 جنيه لكل قسط
  "max_installments": 12,
  "min_down_payment_percent": 0
}
```

المعنى:

| الحقل | المعنى |
|---|---|
| `interest_type = "percentage"` | الفايدة = `(إجمالي الأوردر - المقدم) × interest_value / 100` |
| `interest_type = "fixed"` | الفايدة = `interest_value × عدد الأقساط` |
| `max_installments` | أقصى عدد أقساط مسموح |
| `min_down_payment_percent` | أقل مقدم مسموح كنسبة من إجمالي الأوردر |

> الفايدة بتتحسب **فقط** لو العميل اختار الدفع بالتقسيط. الدفع الكامل ما بيتأثرش.

---

## 2) الـ endpoints المتاحة للإيكومرس

### 2.1 إعدادات التقسيط (عام — قبل تسجيل الدخول)

```
GET /api/store/installments/settings
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "Installment settings fetched successfully",
    "settings": {
      "enabled": true,
      "interest_type": "percentage",
      "interest_value": 10,
      "max_installments": 12,
      "min_down_payment_percent": 0
    }
  }
}
```

استخدمها عشان تعرض/تخفي خيار "تقسيط" في الـ checkout، وتحدد أقصى عدد أقساط.

### 2.2 معاينة الخطة (قبل تأكيد الأوردر)

```
POST /api/store/installments/preview
Content-Type: application/json
```

Body:

```json
{
  "total": 5000,
  "months": 6,
  "down_payment": 500
}
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "Installment plan preview",
    "plan": {
      "order_total": 5000,
      "down_payment": 500,
      "financed_amount": 4500,
      "interest_type": "percentage",
      "interest_value": 10,
      "interest_amount": 450,
      "total_payable": 5450,
      "installments_count": 6,
      "start_date": "2026-10-25T10:00:00.000Z",
      "installments": [
        { "sequence": 1, "amount": 825, "due_date": "2026-11-25T10:00:00.000Z" },
        { "sequence": 2, "amount": 825, "due_date": "2026-12-25T10:00:00.000Z" },
        { "sequence": 3, "amount": 825, "due_date": "2027-01-25T10:00:00.000Z" },
        { "sequence": 4, "amount": 825, "due_date": "2027-02-25T10:00:00.000Z" },
        { "sequence": 5, "amount": 825, "due_date": "2027-03-25T10:00:00.000Z" },
        { "sequence": 6, "amount": 825, "due_date": "2027-04-25T10:00:00.000Z" }
      ]
    }
  }
}
```

ملاحظات:

- آخر قسط بياخد فرق التقريب، فمجموع الأقساط = `total_payable - down_payment` بالمليم.
- أول قسط بعد شهر من تاريخ الأوردر.
- أي خطأ في المدخلات (مقدم أكبر من الإجمالي، شهور > الحد، التقسيط مقفول…)
  بيرجع `400` بالشكل:

```json
{
  "success": false,
  "error": { "code": 400, "message": "Minimum down payment is 10% (500)" }
}
```

### 2.3 إنشاء الأوردر بالتقسيط

نفس الـ endpoint الحالي:

```
POST /api/store/order/checkout
```

مع إضافة الحقلين دول:

```json
{
  "orderType": "delivery",
  "shippingAddress": "<address id أو object زي ما هو>",
  "paymentMethod": "<ObjectId لطريقة دفع فعّالة>",
  "paymentType": "installment",
  "installment": {
    "months": 6,
    "down_payment": 500,
    "notes": "ملاحظات اختيارية"
  }
}
```

قواعد مهمة:

1. `paymentType` قيمته الافتراضية `"full"`. لو `"installment"` لازم `installment` موجود.
2. **لازم العميل يكون مسجّل دخول** (الأوردر بيتربط بحسابه).
3. `paymentMethod` مطلوب زي العادي، لكن **مش هيتم خصم أي مبلغ من الجيتواي**؛
   الباك بيجبر `paymentGateway = "manual"` و`paymentStatus = "unpaid"`.
   المقدم والأقساط بيتحصّلوا من الفرع.
4. `down_payment` لازم:
   - `>= min_down_payment_percent%` من إجمالي الأوردر
   - `<` إجمالي الأوردر
5. `months` عدد صحيح من `1` لـ `max_installments`.

Response (201):

```json
{
  "success": true,
  "data": {
    "message": "Order created successfully",
    "order": {
      "_id": "6700...",
      "paymentType": "installment",
      "paymentStatus": "unpaid",
      "paymentGateway": "manual",
      "installmentPlan": "6701...",
      "totalPriceAfterDiscount": 5000
    },
    "payment": null,
    "installment_plan": {
      "_id": "6701...",
      "plan_number": "INS-261025-1234",
      "source": "ecommerce",
      "order_id": "6700...",
      "order_total": 5000,
      "down_payment": 500,
      "financed_amount": 4500,
      "interest_type": "percentage",
      "interest_value": 10,
      "interest_amount": 450,
      "total_payable": 5450,
      "installments_count": 6,
      "paid_amount": 0,
      "remaining_amount": 4950,
      "status": "active",
      "installments": [
        {
          "_id": "6702...",
          "sequence": 1,
          "amount": 825,
          "due_date": "2026-11-25T10:00:00.000Z",
          "paid_amount": 0,
          "remaining_amount": 825,
          "status": "pending"
        }
      ]
    }
  }
}
```

`remaining_amount` في الخطة = `total_payable - down_payment - المدفوع من الأقساط`.
`down_payment` نفسه مش جزء من `paid_amount` (بيتسجل في الفاتورة/الأوردر).

### 2.4 أقساط العميل (بعد الأوردر)

كلها تحتاج `Authorization: Bearer <customer token>`:

```
GET /api/store/installments
```

```json
{
  "success": true,
  "data": {
    "message": "Installment plans fetched successfully",
    "count": 1,
    "total_payable": 5450,
    "paid_amount": 0,
    "remaining_amount": 4950,
    "plans": [
      {
        "_id": "6701...",
        "plan_number": "INS-261025-1234",
        "source": "ecommerce",
        "order_id": "6700...",
        "order_total": 5000,
        "down_payment": 500,
        "total_payable": 5450,
        "installments_count": 6,
        "paid_amount": 0,
        "remaining_amount": 4950,
        "status": "active",
        "customer_id": { "_id": "...", "name": "..." },
        "warehouse_id": { "_id": "...", "name": "الفرع" }
      }
    ]
  }
}
```

```
GET /api/store/installments/:id            // تفاصيل خطة + جدول الأقساط
GET /api/store/installments/order/:orderId // خطة أوردر معيّن
```

حالات القسط (`status`): `pending` / `paid` / `overdue` / `cancelled`.
حالة الخطة (`status`): `active` / `completed` / `cancelled`.

---

## 3) الشكل المطلوب في فرونت الإيكومرس (زي الـ POS)

### خطوة الدفع في الـ checkout

1. عند تحميل الـ checkout نادِ `GET /api/store/installments/settings`.
2. لو `enabled = true` اعرض خيار **"تقسيط"** جنب الكاش/الكارت.
3. لما العميل يختاره:
   - Selector لعدد الأقساط: `1..max_installments`.
   - Input للمقدم، مع `min = min_down_payment_percent% × total`.
   - Debounce ~350ms ثم نادِ `POST /api/store/installments/preview`.
   - اعرض ملخص:
     - المبلغ الممول
     - الفايدة
     - إجمالي التقسيط
     - القسط الشهري (وآخر قسط لو مختلف)
     - **المطلوب الآن (المقدم)**
   - زر "عرض جدول الأقساط" (accordion) بتواريخ الاستحقاق.
4. زر "تأكيد الأوردر" يتقفل لو:
   - التقسيط مقفول
   - عدد الأقساط غير صالح
   - المقدم أقل من الحد المسموح
   - المعاينة لسه بتحمّل أو رجعت خطأ
5. عند التأكيد ابعت `paymentType: "installment"` + `installment` مع نفس بيانات الـ checkout الحالية.

### بعد إنشاء الأوردر

- اعرض `installment_plan.plan_number` في شاشة النجاح.
- وضّح للعميل: **الأقساط بتتحصّل من الفرع/الأدمن**، ومفيش دفع أونلاين للأقساط.
- اعرض المقدم وتاريخ أول قسط.

### صفحة "أقساطي"

- قائمة الخطط من `GET /api/store/installments`.
- كل خطة: رقم الخطة، إجمالي التقسيط، المدفوع، المتبقي، الحالة.
- تفاصيل: جدول الأقساط بالتواريخ والحالات (متأخر = لون تحذيري).
- **مفيش زر دفع** في الإيكومرس (التحصيل من الفرع).

---

## 4) فروق مهمة عن الـ POS

| البند | POS | الإيكومرس |
|---|---|---|
| إنشاء الخطة | تلقائي مع `POST /api/admin/pos/sales` | تلقائي مع `POST /api/store/order/checkout` |
| دفع المقدم | بيتحصّل فوراً على حساب مالي (`financials`) | بيتحصّل لاحقاً من الفرع |
| دفع الأقساط | `PUT /api/admin/pos/installments/plans/:planId/items/:itemId/pay` | غير متاح — من الفرع/الأدمن فقط |
| عرض الأقساط | صفحة "الأقساط" في الـ POS | صفحة "أقساطي" في المتجر |

---

## 5) ملاحظات للتنفيذ

- استخدم الـ `preview` من السيرفر بدل حساب الفايدة في الفرونت — عشان الأرقام
  المعروضة تطابق اللي هيتسجل بالظبط.
- الأوردر بيترجع `paymentStatus: "unpaid"` مع خطة تقسيط؛ ما تعتبرهاش خطأ دفع.
- لو الـ API رجّع `400`، اعرض `error.message` كما هو (رسائل واضحة بالعربي/إنجليزي).
- أي تعديل في إعدادات الفايدة من الأدمن بيسري على الأوردرات الجديدة فقط،
  الخطط القديمة بتحتفظ بفايدتها وقت الإنشاء.
