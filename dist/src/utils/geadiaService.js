"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGeideaPayment = void 0;
const BadRequest_1 = require("../Errors/BadRequest");
const axios_1 = __importDefault(require("axios"));
const GEIDEA_API_BASE_URL = process.env.GEIDEA_API_BASE_URL || "https://api.geidea.net";
const GEIDEA_CALLBACK_URL = process.env.GEIDEA_CALLBACK_URL || "https://bcknd.systego.net/api/store/order/webhook/geidea";
const GEIDEA_RETURN_URL = process.env.GEIDEA_RETURN_URL || "https://your-frontend.com/payment/success";
const initializeGeideaPayment = async ({ localOrderId, amount, geideaConfig, customer, address, }) => {
    const credentials = Buffer.from(`${geideaConfig.publicKey}:${geideaConfig.apiPassword}`).toString("base64");
    const authHeader = `Basic ${credentials}`;
    const response = await axios_1.default.post(`${GEIDEA_API_BASE_URL}/pgw/api/v1/direct/session`, {
        amount: amount,
        currency: "EGP",
        merchantReferenceId: localOrderId,
        callbackUrl: GEIDEA_CALLBACK_URL,
        returnUrl: GEIDEA_RETURN_URL,
        customerEmail: customer?.email || "no-reply@example.com",
        billingAddress: {
            street: address?.street || "NA",
            city: address?.city?.name || "NA",
            country: "EGY",
        },
    }, {
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
        },
    });
    const data = response.data;
    if (!data?.session?.id) {
        throw new BadRequest_1.BadRequest("Failed to create Geidea session");
    }
    return {
        geideaSessionId: data.session.id,
        iframeUrl: `https://pay.geidea.net/hosted?sessionId=${data.session.id}`,
    };
};
exports.initializeGeideaPayment = initializeGeideaPayment;
