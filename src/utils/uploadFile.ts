// utils/uploadFile.js
import multer from "multer";
import path from "path";
import fs from "fs";

// 🧠 دالة بتجهز multer upload object
export function uploadFile(folderName = "uploads") {
  // لو المجلد مش موجود، نعمله
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName, { recursive: true });
  }

  // إعداد مكان التخزين
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, folderName);
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + path.extname(file.originalname);
      cb(null, uniqueName);
    },
  });

  // نرجع كائن multer اللي ممكن نستدعيه في أي route
  return multer({ storage });
}
