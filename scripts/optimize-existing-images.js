const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const UPLOADS_DIR = path.resolve(__dirname, "../uploads");

async function getFiles(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    })
  );
  return files.flat();
}

async function optimizeImages() {
  console.log("🔍 Scanning uploads folder:", UPLOADS_DIR);

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log("⚠️ Uploads directory does not exist.");
    return;
  }

  const allFiles = await getFiles(UPLOADS_DIR);
  const imageExtensions = [".png", ".jpg", ".jpeg", ".webp"];
  const imageFiles = allFiles.filter((f) =>
    imageExtensions.includes(path.extname(f).toLowerCase())
  );

  console.log(`📸 Found ${imageFiles.length} images to check.`);

  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;
  let optimizedCount = 0;

  for (const file of imageFiles) {
    const ext = path.extname(file).toLowerCase();
    const stat = await fs.promises.stat(file);
    const originalSize = stat.size;
    totalOriginalBytes += originalSize;

    // Skip very small images (under 50KB)
    if (originalSize < 50 * 1024) {
      totalOptimizedBytes += originalSize;
      continue;
    }

    const tempFile = `${file}.tmp`;

    try {
      let pipeline = sharp(file).rotate().resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      });

      if (ext === ".jpg" || ext === ".jpeg") {
        pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
      } else if (ext === ".png") {
        pipeline = pipeline.png({ quality: 80, compressionLevel: 9 });
      } else if (ext === ".webp") {
        pipeline = pipeline.webp({ quality: 80 });
      }

      await pipeline.toFile(tempFile);

      const newStat = await fs.promises.stat(tempFile);

      if (newStat.size < originalSize) {
        // Replace original with optimized version
        await fs.promises.unlink(file);
        await fs.promises.rename(tempFile, file);
        totalOptimizedBytes += newStat.size;
        optimizedCount++;
        const savedPercent = (
          ((originalSize - newStat.size) / originalSize) *
          100
        ).toFixed(1);
        console.log(
          `✅ [${optimizedCount}] ${path.relative(UPLOADS_DIR, file)}: ${(
            originalSize / 1024
          ).toFixed(1)}KB ➔ ${(newStat.size / 1024).toFixed(
            1
          )}KB (-${savedPercent}%)`
        );
      } else {
        // If not smaller, discard temp file
        await fs.promises.unlink(tempFile);
        totalOptimizedBytes += originalSize;
      }
    } catch (err) {
      console.warn(`⚠️ Could not optimize ${file}:`, err.message);
      if (fs.existsSync(tempFile)) {
        await fs.promises.unlink(tempFile).catch(() => {});
      }
      totalOptimizedBytes += originalSize;
    }
  }

  const savedBytes = totalOriginalBytes - totalOptimizedBytes;
  const savedMB = (savedBytes / (1024 * 1024)).toFixed(2);
  const totalMBBefore = (totalOriginalBytes / (1024 * 1024)).toFixed(2);
  const totalMBAfter = (totalOptimizedBytes / (1024 * 1024)).toFixed(2);

  console.log("\n==========================================");
  console.log(`🎉 Optimization Complete!`);
  console.log(`📊 Images processed: ${optimizedCount} / ${imageFiles.length}`);
  console.log(`📦 Original size: ${totalMBBefore} MB`);
  console.log(`🚀 New size: ${totalMBAfter} MB`);
  console.log(`💾 Total space saved: ${savedMB} MB`);
  console.log("==========================================");
}

optimizeImages().catch((err) => {
  console.error("❌ Optimization error:", err);
});
