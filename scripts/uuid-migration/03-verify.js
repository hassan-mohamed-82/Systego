require("dotenv").config();
// scripts/uuid-migration/03-verify.js
// Compares document counts between each original collection and its "_new"
// counterpart, for both idCollections and refOnlyCollections.
// Every existing collection must show OK before you run 04-swap.js.

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
  let allOk = true;

  for (const collName of allCollections) {
    const oldCount = await db.collection(collName).countDocuments();
    const newCount = await db.collection(`${collName}_new`).countDocuments();
    const ok = oldCount === newCount;
    if (!ok) allOk = false;
    console.log(`${collName}: old=${oldCount} new=${newCount} ${ok ? "OK" : "MISMATCH!"}`);
  }

  await client.close();

  if (!allOk) {
    console.error("\nMISMATCH FOUND. Stopping — 04-swap.js will NOT run.");
    process.exit(1);
  }

  console.log("\nAll collections verified OK. Safe to run 04-swap.js.");
})().catch((err) => {
  console.error("Error verifying collections:", err);
  process.exit(1);
});