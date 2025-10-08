"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveBase64Image = saveBase64Image;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
async function saveBase64Image(base64, userId, req, folder) {
    let matches = base64.match(/^data:(.+);base64,(.+)$/);
    let ext;
    let data;
    if (matches && matches.length === 3) {
        ext = matches[1].split("/")[1];
        data = matches[2]; // الجزء اللي بعد data:image/...;base64,
    }
    else {
        // لو الـ base64 جاي بدون data:image/...;base64,
        const tempMatches = base64.match(/^([A-Za-z0-9+/=]+)$/);
        if (!tempMatches)
            throw new Error("Invalid base64 format");
        ext = "png"; // ممكن تختار default extension
        data = tempMatches[1];
    }
    const buffer = Buffer.from(data, "base64");
    const fileName = `${userId}.${ext}`;
    const uploadsDir = path_1.default.join(__dirname, "../..", "uploads", folder);
    await promises_1.default.mkdir(uploadsDir, { recursive: true });
    const filePath = path_1.default.join(uploadsDir, fileName);
    await promises_1.default.writeFile(filePath, buffer);
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${folder}/${fileName}`;
    return imageUrl;
}
