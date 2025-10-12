"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveBase64Image = saveBase64Image;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
async function saveBase64Image(base64, userId, req, folder) {
    // ✅ شيل البريفكس لو موجود
    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    let ext = "png";
    let data = base64;
    if (matches && matches.length === 3) {
        ext = matches[1].split("/")[1];
        data = matches[2];
    }
    const buffer = Buffer.from(data, "base64");
    const fileName = `${userId}.${ext}`;
    const uploadsDir = path_1.default.join(__dirname, "../..", "uploads", folder);
    try {
        await promises_1.default.mkdir(uploadsDir, { recursive: true });
        await promises_1.default.writeFile(path_1.default.join(uploadsDir, fileName), buffer);
    }
    catch (err) {
        console.error("Failed to save image:", err);
        throw err;
    }
    // ✅ استخدم البروتوكول الصحيح (https) أو الهيدر الحقيقي لو السيرفر خلف Proxy
    const protocol = req.get("x-forwarded-proto") || "https";
    // ✅ ارجع رابط الصورة النهائي
    return `${protocol}://${req.get("host")}/uploads/${folder}/${fileName}`;
}
