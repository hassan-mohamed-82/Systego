"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signData = exports.getCert = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Qztray_1 = require("../../utils/Qztray");
// GET /api/admin/qztray/cert
const getCert = (req, res) => {
    try {
        res.type('text/plain').send(Qztray_1.QZ_CERT);
    }
    catch (err) {
        console.error('QZ cert error:', err);
        res.status(500).send('Certificate error');
    }
};
exports.getCert = getCert;
// POST /api/admin/qztray/sign
const signData = (req, res) => {
    // Support both POST body and GET query
    const data = req.body?.data || req.query?.data || req.query?.request;
    if (!data || typeof data !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid data parameter' });
    }
    try {
        const signer = crypto_1.default.createSign('SHA512');
        signer.update(data);
        signer.end();
        const signature = signer.sign(Qztray_1.QZ_PRIVATE_KEY, 'base64');
        res.type('text/plain').send(signature);
    }
    catch (err) {
        console.error('QZ sign error:', err);
        res.status(500).send('Signature error');
    }
};
exports.signData = signData;
