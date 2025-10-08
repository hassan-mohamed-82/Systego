import path from "path";
import fs from "fs/promises";
import { Request } from "express";

export async function saveBase64Image(
  base64: string,
  userId: string,
  req: Request,
  folder: string
): Promise<string> {
  let matches = base64.match(/^data:(.+);base64,(.+)$/);

  let ext: string;
  let data: string;

  if (matches && matches.length === 3) {
    ext = matches[1].split("/")[1];
    data = matches[2]; // الجزء اللي بعد data:image/...;base64,
  } else {
    // لو الـ base64 جاي بدون data:image/...;base64,
    const tempMatches = base64.match(/^([A-Za-z0-9+/=]+)$/);
    if (!tempMatches) throw new Error("Invalid base64 format");
    ext = "png"; // ممكن تختار default extension
    data = tempMatches[1];
  }

  const buffer = Buffer.from(data, "base64");
  const fileName = `${userId}.${ext}`;
  const uploadsDir = path.join(__dirname, "../..", "uploads", folder);

  await fs.mkdir(uploadsDir, { recursive: true });

  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, buffer);

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${folder}/${fileName}`;
  return imageUrl;
}
