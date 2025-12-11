"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signData = exports.getCert = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Qztray_1 = require("../../utils/Qztray");
// GET /qz/cert
const getCert = (req, res) => {
    res.type('text/plain').send(Qztray_1.QZ_CERT);
};
exports.getCert = getCert;
// POST /qz/sign
const signData = (req, res) => {
    // لو POST هتيجي من body.data
    // لو GET هتيجي من query.data أو query.request
    const dataFromBody = req.body?.data;
    const dataFromQuery = (req.query.data || req.query.request);
    const data = dataFromBody || dataFromQuery;
    if (!data) {
        return res.status(400).send('Missing data');
    }
    try {
        const signer = crypto_1.default.createSign('sha512'); // متوافق مع qz.security.setSignatureAlgorithm("SHA512")
        signer.update(data);
        signer.end();
        const signature = signer.sign(Qztray_1.QZ_PRIVATE_KEY, 'base64');
        res.type('text/plain').send(signature);
    }
    catch (err) {
        console.error('QZ sign error:', err);
        res.status(500).send('sign error');
    }
};
exports.signData = signData;
