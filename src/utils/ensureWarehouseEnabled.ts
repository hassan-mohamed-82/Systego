import { WarehouseModel } from "../models/schema/admin/Warehouse";

/**
 * Legacy branches were created before the `enabled` flag was added to the
 * Warehouse schema. Mongoose defaults only apply to new documents, so those
 * old branches have no `enabled` field at all.
 *
 * Any query that filters `{ enabled: true }` will not match documents where
 * the field is missing, which is why old branches disappear from branch
 * filters while newly created branches show up normally.
 *
 * This backfill marks those legacy branches as enabled without touching any
 * branch that was explicitly disabled (`enabled: false`).
 */
export async function ensureWarehouseEnabled(): Promise<number> {
  const result = await WarehouseModel.updateMany(
    {
      $or: [{ enabled: { $exists: false } }, { enabled: null }],
    },
    { $set: { enabled: true } },
  );

  return result.modifiedCount || 0;
}
