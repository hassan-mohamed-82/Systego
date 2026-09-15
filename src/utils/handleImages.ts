import path from "path";
import fs from "fs/promises";
import { Request } from "express";
import sharp from "sharp";

export async function saveBase64Image(
  base64: string,
  userId: string,
  req: Request,
  folder: string
): Promise<string> {
  // ✅ إزالة البريفكس من base64
  const matches = base64.match(/^data:(.+);base64,(.+)$/);
  let data = base64;

  if (matches && matches.length === 3) {
    data = matches[2];
  }

  const rawBuffer = Buffer.from(data, "base64");

  // تحديد أبعاد مناسبة حسب نوع الصورة (البانرات أعرض، المنتجات واللوجو أصغر)
  const isBanner = folder.toLowerCase().includes("banner");
  const maxWidth = isBanner ? 1920 : 1200;
  const maxHeight = isBanner ? 1080 : 1200;

  // ✅ ضغط وتحويل الصورة إلى WebP بجودة 80% وتصغير الحجم بنسبة 85%
  let optimizedBuffer: Buffer;
  let ext = "webp";

  try {
    optimizedBuffer = await sharp(rawBuffer)
      .rotate() // تدوير تلقائي بناءً على إعدادات الكاميرا EXIF
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
  } catch (err) {
    console.warn("⚠️ Sharp optimization fallback to raw buffer:", err);
    optimizedBuffer = rawBuffer;
    ext = matches && matches[1] ? matches[1].split("/")[1] || "png" : "png";
  }

  const fileName = `${userId}.${ext}`;

  // ✅ نخلي مجلد uploads في ROOT project
  const rootDir = path.resolve(__dirname, "../../");
  const uploadsDir = path.join(rootDir, "uploads", folder);

  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, fileName), optimizedBuffer);
  } catch (err) {
    console.error("❌ Failed to save image:", err);
    throw err;
  }

  // ✅ البروتوكول الصحيح (https أو http)
  const protocol = req.get("x-forwarded-proto") || req.protocol || "https";

  // ✅ ارجع رابط الصورة النهائي
  return `${protocol}://${req.get("host")}/uploads/${folder}/${fileName}`;
}
