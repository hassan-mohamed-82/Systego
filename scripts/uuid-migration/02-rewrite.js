require("dotenv").config();
// scripts/uuid-migration/02-rewrite.js
// For every collection in idCollections + refOnlyCollections, creates a
// "<collection>_new" version:
//   - idCollections: _id is replaced with the new UUID, AND any ref fields
//     in refFieldsMap are rewritten.
//   - refOnlyCollections: _id is left UNCHANGED (stays ObjectId), only the
//     ref fields in refFieldsMap are rewritten.
//
// Handles plain fields, array-of-id fields, and dot-notation nested
// subdocument fields (e.g. "items.product_id").
//
// Does NOT touch the original collections. Safe to re-run.

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const { idCollections, refOnlyCollections, refFieldsMap } = require("./config");

const uri = process.env.MongoDB_URI;

if (!uri) {
  console.error("MIGRATION_MONGO_URI is not set in .env");
  process.exit(1);
}

const idMap = JSON.parse(fs.readFileSync(path.join(__dirname, "id-map.json"), "utf-8"));

function mapId(refCollection, rawId) {
  if (rawId === null || rawId === undefined) return rawId;
  const key = rawId.toString();
  const mapped = idMap[refCollection]?.[key];
  return mapped !== undefined ? mapped : rawId; // leave untouched if not found
}

function applyRefRewrites(doc, refs) {
  for (const [fieldPath, refCollection] of Object.entries(refs)) {
    if (fieldPath.includes(".")) {
      const [arrayField, subField] = fieldPath.split(".");
      if (Array.isArray(doc[arrayField])) {
        doc[arrayField] = doc[arrayField].map((sub) => {
          if (sub && sub[subField] !== undefined && sub[subField] !== null) {
            return { ...sub, [subField]: mapId(refCollection, sub[subField]) };
          }
          return sub;
        });
      }
      continue;
    }

    const value = doc[fieldPath];
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      doc[fieldPath] = value.map((v) => mapId(refCollection, v));
    } else {
      doc[fieldPath] = mapId(refCollection, value);
    }
  }
  return doc;
}

(async () => {
  const client = await MongoClient.connect(uri);
  const db = client.db();

  const allCollections = [...idCollections, ...refOnlyCollections];

  for (const collName of allCollections) {
    const newCollName = `${collName}_new`;
    const isIdCollection = idCollections.includes(collName);

    const existing = await db.listCollections({ name: newCollName }).toArray();
    if (existing.length) {
      await db.collection(newCollName).drop();
    }

    const docs = await db.collection(collName).find({}).toArray();
    const refs = refFieldsMap[collName] || {};

    const newDocs = docs.map((doc) => {
      const newDoc = { ...doc };

      if (isIdCollection && typeof newDoc._id !== "string") {
        const mapped = idMap[collName]?.[newDoc._id.toString()];
        if (mapped) newDoc._id = mapped;
      }
      // refOnlyCollections: _id is left completely untouched

      return applyRefRewrites(newDoc, refs);
    });

    if (newDocs.length) {
      await db.collection(newCollName).insertMany(newDocs, { ordered: false });
    }

    console.log(`${collName}: inserted ${newDocs.length} into ${newCollName} (${isIdCollection ? "_id converted" : "_id unchanged, refs only"})`);
  }

  console.log("\nRewrite complete. Run 03-verify.js next.");
  await client.close();
})().catch((err) => {
  console.error("Error rewriting collections:", err);
  process.exit(1);
});