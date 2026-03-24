"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymobService = void 0;
// services/payment/paymobService.ts
class PaymobService {
    static async generatePaymentLink(amountCents, orderId, config, customerData) {
        const BASE_URL = "https://accept.paymob.com/api";
        try {
            // 1. Authentication
            const authRes = await fetch(`${BASE_URL}/auth/tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: config.api_key }),
            });
            const authData = await authRes.json();
            if (!authData.token)
                throw new Error("Paymob Auth Failed: Invalid API Key");
            // 2. Order Registration
            const orderRes = await fetch(`${BASE_URL}/ecommerce/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    auth_token: authData.token,
                    delivery_needed: "false",
                    amount_cents: amountCents,
                    currency: "EGP",
                    merchant_order_id: orderId,
                }),
            });
            const orderData = await orderRes.json();
            // 3. Payment Key Generation
            const paymentKeyRes = await fetch(`${BASE_URL}/acceptance/payment_keys`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    auth_token: authData.token,
                    amount_cents: amountCents,
                    expiration: 3600,
                    order_id: orderData.id,
                    currency: "EGP",
                    integration_id: config.integration_id,
                    billing_data: {
                        first_name: customerData.firstName || "Customer",
                        last_name: customerData.lastName || "Name",
                        email: customerData.email || "test@test.com",
                        phone_number: customerData.phone || "01000000000",
                        apartment: "NA", floor: "NA", street: "NA", building: "NA",
                        shipping_method: "NA", postal_code: "NA", city: "NA", country: "EG", state: "NA",
                    }
                }),
            });
            const paymentKeyData = await paymentKeyRes.json();
            // 4. إرجاع اللينك
            return `https://accept.paymob.com/api/acceptance/iframes/${config.iframe_id}?payment_token=${paymentKeyData.token}`;
        }
        catch (error) {
            console.error("Paymob Error:", error);
            throw new Error("فشل في التواصل مع بوابة الدفع، تأكد من صحة بيانات بوابه الدفع في لوحة التحكم");
        }
    }
}
exports.PaymobService = PaymobService;
