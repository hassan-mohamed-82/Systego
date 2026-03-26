import axios from "axios";

const BASE_URL = "https://accept.paymob.com/api";

type PaymobAuthResponse = {
    token: string;
};

type PaymobOrderResponse = {
    id: number;
};

type PaymobPaymentKeyResponse = {
    token: string;
};

type PaymobBillingData = Record<string, string | number | boolean | null>;

export class PaymobService {
    static async getAuthToken(apiKey: string) {
        const { data } = await axios.post<PaymobAuthResponse>(`${BASE_URL}/auth/tokens`, {
            api_key: apiKey,
        });
        return data.token;
    }

    static async createOrder(authToken: string, amountCents: number, merchantOrderId: string) {
        const { data } = await axios.post<PaymobOrderResponse>(`${BASE_URL}/ecommerce/orders`, {
            auth_token: authToken,
            delivery_needed: false,
            amount_cents: amountCents,
            currency: "EGP",
            merchant_order_id: merchantOrderId,
            items: [],
        });
        return data.id;
    }

    static async generatePaymentKey(
        authToken: string,
        amountCents: number,
        orderId: number,
        integrationId: number,
        billingData: PaymobBillingData
    ) {
        const { data } = await axios.post<PaymobPaymentKeyResponse>(`${BASE_URL}/acceptance/payment_keys`, {
            auth_token: authToken,
            amount_cents: amountCents,
            expiration: 3600,
            order_id: orderId,
            billing_data: billingData,
            currency: "EGP",
            integration_id: integrationId,
        });

        return data.token;
    }

    static getIframeUrl(iframeId: string, token: string) {
        return `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${token}`;
    }
}