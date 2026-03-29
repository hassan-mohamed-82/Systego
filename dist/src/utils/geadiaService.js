"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGeideaPayment = void 0;
const BadRequest_1 = require("../Errors/BadRequest");
const axios_1 = __importDefault(require("axios"));
const initializeGeideaPayment = async ({ localOrderId, amount, geideaConfig, customer, address, }) => {
    const credentials = Buffer.from(`${geideaConfig.publicKey}:${geideaConfig.apiPassword}`).toString("base64");
    const authHeader = `Basic ${credentials}`;
    const response = await axios_1.default.post("https://api.geidea.net/pgw/api/v1/direct/session", {
        amount: amount,
        currency: "EGP",
        merchantReferenceId: localOrderId,
        callbackUrl: "https://bcknd.systego.net/api/store/order/webhook/geidea",
        returnUrl: "https://your-frontend.com/payment/success",
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
