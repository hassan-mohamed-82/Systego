import bwipjs from "bwip-js";
import fs from "fs";
import path from "path";

export const generateBarcodeImage = async (
  barcodeNumber: string,
  filename: string
) => {
  const buffer = await bwipjs.toBuffer({
    bcid: "code128",       // نوع الباركود
    text: barcodeNumber,   // الرقم اللي دخله الأدمن
    scale: 3,
    height: 10,
    includetext: true,
    textxalign: "center",
  });

  const uploadPath = path.join("uploads", "barcodes");
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const filePath = path.join(uploadPath, `${filename}.png`);
  fs.writeFileSync(filePath, buffer);

  return `/${filePath}`; // يرجع لينك الصورة
};
