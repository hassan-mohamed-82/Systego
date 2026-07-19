require("dotenv").config();
// scripts/uuid-migration/04-swap.js
// Renames each original collection to "<name>_old_backup" and promotes the
// "<name>_new" collection to take its place, for both idCollections and
// refOnlyCollections.
//
// IMPORTANT: Stop your Express/API server before running this.
// Only run after 03-verify.js reports OK for every collection.
// Skips any collection that has 0 documents on both sides (never existed).

const { MongoClient } = require("mongodb");
const { idCollections, refOnlyCollections } = require("./config");

const uri = process.env.MongoDB_URI;

if (!uri) {
  console.error("MIGRATION_MONGO_URI is not set in .env");
  process.exit(1);
}

(async () => {
  const client = await MongoClient.connect(uri);
  const db = client.db();

  const allCollections = [...idCollections, ...refOnlyCollections];

  for (const collName of allCollections) {
    const backupName = `${collName}_old_backup`;
    const newName = `${collName}_new`;

    const sourceExists = (await db.listCollections({ name: collName }).toArray()).length > 0;
    const newExists = (await db.listCollections({ name: newName }).toArray()).length > 0;

    if (!sourceExists && !newExists) {
      console.log(`${collName}: skipped (empty/never existed on either side)`);
      continue;
    }

    if (!newExists) {
      console.log(`${collName}: skipped (no ${newName} to swap in — likely 0 documents)`);
      continue;
    }

    const existingBackup = await db.listCollections({ name: backupName }).toArray();
    if (existingBackup.length) {
      console.log(`${collName}: already fully swapped previously (${backupName} exists) — skipping entirely. If a stray ${newName} exists it's a harmless leftover duplicate you can drop manually.`);
      continue;
    }

    if (sourceExists) {
      await db.collection(collName).rename(backupName);
    }

    await db.collection(newName).rename(collName);
    console.log(`${collName}: swapped (old data now in ${backupName})`);
  }

  console.log("\nSwap complete. Restart your app and smoke-test before dropping *_old_backup collections.");
  await client.close();
})().catch((err) => {
  console.error("Error swapping collections:", err);
  process.exit(1);
});