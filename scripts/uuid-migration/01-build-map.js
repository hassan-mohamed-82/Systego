require("dotenv").config();
// scripts/uuid-migration/01-build-map.js
// Reads only the collections in idCollections, generates a new UUID for
// every document's _id, and writes the mapping to id-map.json.
// Does NOT modify any data. Safe to run multiple times.

const { MongoClient } = require("mongodb");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");
const { idCollections } = require("./config");

const uri = process.env.MongoDB_URI;

if (!uri) {
  console.error("MIGRATION_MONGO_URI is not set in .env");
  process.exit(1);
}

(async () => {
  const client = await MongoClient.connect(uri);
  const db = client.db();

  const idMap = {};

  for (const collName of idCollections) {
    idMap[collName] = {};
    const cursor = db.collection(collName).find({}, { projection: { _id: 1 } });
    let count = 0;

    for await (const doc of cursor) {
      if (typeof doc._id === "string") continue; // already migrated
      idMap[collName][doc._id.toString()] = randomUUID();
      count++;
    }

    console.log(`${collName}: mapped ${count} ids`);
  }

  const outPath = path.join(__dirname, "id-map.json");
  fs.writeFileSync(outPath, JSON.stringify(idMap, null, 2));
  console.log(`\nid-map.json written to ${outPath}`);

  await client.close();
})().catch((err) => {
  console.error("Error building id map:", err);
  process.exit(1);
});