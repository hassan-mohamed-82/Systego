"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QZ_PRIVATE_KEY = exports.QZ_CERT = void 0;
// src/utils/Qztray.ts
require("dotenv/config");
const rawCert = process.env.QZ_CERT;
const rawPrivateKey = process.env.QZ_PRIVATE_KEY;
if (!rawCert || !rawPrivateKey) {
    throw new Error('QZ_CERT or QZ_PRIVATE_KEY is not set in environment variables');
}
// لو في .env كاتبين \n كنص، رجّعها newlines حقيقية
exports.QZ_CERT = rawCert.replace(/\\n/g, '\n');
exports.QZ_PRIVATE_KEY = rawPrivateKey.replace(/\\n/g, '\n');
