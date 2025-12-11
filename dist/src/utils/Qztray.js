"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QZ_PRIVATE_KEY = exports.QZ_CERT = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const keysDir = path_1.default.join(__dirname, '../../keys');
// اقرأ الشهادة (public cert) كـ string
exports.QZ_CERT = fs_1.default.readFileSync(path_1.default.join(keysDir, 'qz-cert.pem'), 'utf8');
// اقرأ الـ private key كـ string
exports.QZ_PRIVATE_KEY = fs_1.default.readFileSync(path_1.default.join(keysDir, 'qz-private-key.pem'), 'utf8');
