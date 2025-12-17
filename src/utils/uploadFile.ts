// utils/uploadFile.ts
import multer from "multer";
import path from "path";
import fs from "fs";

// للـ Disk Storage (حفظ على السيرفر)
export function uploadFile(folderName = "uploads") {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
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

  return multer({ storage });
}

// للـ Memory Storage (للـ Excel - بنقرأه من الـ Buffer)
export function uploadExcelFile() {
  const storage = multer.memoryStorage();

  return multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
      }
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });
}
