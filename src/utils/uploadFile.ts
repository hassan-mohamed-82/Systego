// utils/uploadFile.js
import multer from "multer";
import path from "path";
import fs from "fs";

// 🧠 دالة بتجهز multer upload object
export async function uploadFile(folderName = "uploads") {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      // 🧠 تأكد إن الفولدر موجود، لو مش موجود اعمله
      if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName, { recursive: true });
      }

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
