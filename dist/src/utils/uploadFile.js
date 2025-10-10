"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
// utils/uploadFile.js
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// 🧠 دالة بتجهز multer upload object
function uploadFile(folderName = "uploads") {
    // لو المجلد مش موجود، نعمله
    if (!fs_1.default.existsSync(folderName)) {
        fs_1.default.mkdirSync(folderName, { recursive: true });
    }
    // إعداد مكان التخزين
    const storage = multer_1.default.diskStorage({
        destination: function (req, file, cb) {
            cb(null, folderName);
        },
        filename: function (req, file, cb) {
            const uniqueName = Date.now() + path_1.default.extname(file.originalname);
            cb(null, uniqueName);
        },
    });
    // نرجع كائن multer اللي ممكن نستدعيه في أي route
    return (0, multer_1.default)({ storage });
}
