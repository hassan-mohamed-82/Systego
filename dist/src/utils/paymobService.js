"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymobService = void 0;
const axios_1 = __importDefault(require("axios"));
const BASE_URL = "https://accept.paymob.com/api";
class PaymobService {
    static async getAuthToken(apiKey) {
        const { data } = await axios_1.default.post(`${BASE_URL}/auth/tokens`, {
            api_key: apiKey,
        });
        return data.token;
    }
    static async createOrder(authToken, amountCents, merchantOrderId) {
        const { data } = await axios_1.default.post(`${BASE_URL}/ecommerce/orders`, {
            auth_token: authToken,
            delivery_needed: false,
            amount_cents: amountCents,
            currency: "EGP",
            merchant_order_id: merchantOrderId,
            items: [],
        });
        return data.id;
    }
    static async generatePaymentKey(authToken, amountCents, orderId, integrationId, billingData) {
        const { data } = await axios_1.default.post(`${BASE_URL}/acceptance/payment_keys`, {
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
    static getIframeUrl(iframeId, token) {
        return `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${token}`;
    }
    static async getOrderTransactions(authToken, paymobOrderId) {
        const { data } = await axios_1.default.get(`${BASE_URL}/ecommerce/orders/${paymobOrderId}`, {
            params: { auth_token: authToken },
        });
        return data.transactions || [];
    }
    static getLatestTransactionStatus(transactions) {
        if (!transactions || transactions.length === 0) {
            return { success: false, message: "No transactions found" };
        }
        const latestTx = transactions[0];
        return {
            success: latestTx.success,
            transactionId: latestTx.id,
            isPending: latestTx.pending === true,
            isVoided: latestTx.is_voided === true,
            isRefunded: latestTx.is_refunded === true,
            error: latestTx.error,
        };
    }
}
exports.PaymobService = PaymobService;
