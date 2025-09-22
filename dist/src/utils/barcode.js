"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBarcodeImage = void 0;
exports.generateEAN13Barcode = generateEAN13Barcode;
const bwip_js_1 = __importDefault(require("bwip-js"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const generateBarcodeImage = async (barcodeNumber, filename) => {
    const buffer = await bwip_js_1.default.toBuffer({
        bcid: "code128", // نوع الباركود
        text: barcodeNumber, // الرقم اللي دخله الأدمن
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
    });
    const uploadPath = path_1.default.join("uploads", "barcodes");
    if (!fs_1.default.existsSync(uploadPath)) {
        fs_1.default.mkdirSync(uploadPath, { recursive: true });
    }
    const filePath = path_1.default.join(uploadPath, `${filename}.png`);
    fs_1.default.writeFileSync(filePath, buffer);
    return `/${filePath}`; // يرجع لينك الصورة
};
exports.generateBarcodeImage = generateBarcodeImage;
function generateEAN13Barcode() {
    const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(base[i]);
        sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return base + checkDigit;
}
