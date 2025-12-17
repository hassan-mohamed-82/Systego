"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
exports.uploadExcelFile = uploadExcelFile;
// utils/uploadFile.ts
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// للـ Disk Storage (حفظ على السيرفر)
function uploadFile(folderName = "uploads") {
    const storage = multer_1.default.diskStorage({
        destination: function (req, file, cb) {
            if (!fs_1.default.existsSync(folderName)) {
                fs_1.default.mkdirSync(folderName, { recursive: true });
            }
            cb(null, folderName);
        },
        filename: function (req, file, cb) {
            const uniqueName = Date.now() + path_1.default.extname(file.originalname);
            cb(null, uniqueName);
        },
    });
    return (0, multer_1.default)({ storage });
}
// للـ Memory Storage (للـ Excel - بنقرأه من الـ Buffer)
function uploadExcelFile() {
    const storage = multer_1.default.memoryStorage();
    return (0, multer_1.default)({
        storage: storage,
        fileFilter: (req, file, cb) => {
            const allowedMimes = [
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
            ];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
            }
        },
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB
        },
    });
}
