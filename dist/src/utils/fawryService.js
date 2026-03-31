"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FawryService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const FAWRY_STAGING_URL = "https://atfawry.fawrystaging.com";
const FAWRY_PRODUCTION_URL = "https://atfawry.com";
class FawryService {
    static generateSignature(merchantCode, merchantRefNum, customerProfileId, returnUrl, items, secureKey) {
        let itemsString = "";
        items.forEach(item => {
            const formattedPrice = Number(item.price).toFixed(2);
            itemsString += `${item.itemId}${item.quantity}${formattedPrice}`;
        });
        const stringToHash = `${merchantCode}${merchantRefNum}${customerProfileId}${returnUrl}${itemsString}${secureKey}`;
        return crypto_1.default.createHash("sha256").update(stringToHash).digest("hex");
    }
    static async createChargeRequest(data) {
        const baseUrl = data.isSandbox ? FAWRY_STAGING_URL : FAWRY_PRODUCTION_URL;
        const endpoint = `${baseUrl}/ECommerceWeb/Fawry/payments/charge`;
        const signature = this.generateSignature(data.merchantCode, data.merchantRefNum, data.customerProfileId, data.returnUrl, data.items, data.secureKey);
        const payload = {
            merchantCode: data.merchantCode,
            merchantRefNum: data.merchantRefNum,
            customerProfileId: data.customerProfileId || "guest",
            customerName: data.customerName,
            customerMobile: data.customerMobile || "01000000000",
            customerEmail: data.customerEmail || "guest@systego.com",
            amount: Number(data.amount).toFixed(2),
            currencyCode: "EGP",
            language: "ar-eg",
            chargeItems: data.items.map(item => ({
                itemId: item.itemId,
                description: item.description,
                price: Number(item.price).toFixed(2),
                quantity: item.quantity
            })),
            signature: signature,
            returnUrl: data.returnUrl,
            authCaptureModeEnum: "PAY_NOW"
        };
        const response = await axios_1.default.post(endpoint, payload);
        return response.data;
    }
}
exports.FawryService = FawryService;
