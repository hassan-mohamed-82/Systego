import { WarehouseModel } from "../models/schema/admin/Warehouse";
import { getFeatures } from "./tenantService";

/**
 * How many branches this tenant is allowed (set by the owner in Super Systego).
 * 0 (or missing) means "unlimited" — used to keep legacy clients untouched.
 */
export async function getAllowedBranches(): Promise<number> {
  try {
    const features = await getFeatures();
    return typeof features?.branches === "number" ? features.branches : 0;
  } catch (error: any) {
    // Never block the tenant because Super Systego is unreachable.
    console.warn(
      `[BranchLimit] Could not read branch allowance, treating as unlimited: ${error.message}`,
    );
    return 0;
  }
}

/**
 * Ensures the tenant has at most `allowed` active branches.
 *
 * Rules:
 *  - `allowed <= 0` → unlimited, nothing is touched.
 *  - Branches are ordered oldest-first; the ones beyond the allowance are
 *    *suspended* (`enabled = false`) and taken offline rather than deleted,
 *    so stock/history is preserved.
 *  - Raising the allowance re-enables previously suspended branches.
 *
 * Returns the allowance that was applied.
 */
export async function enforceBranchLimit(): Promise<number> {
  const allowed = await getAllowedBranches();
  if (!allowed || allowed <= 0) return 0;

  try {
    const branches = await WarehouseModel.find().sort({ createdAt: 1, _id: 1 });

    for (let i = 0; i < branches.length; i++) {
      const warehouse = branches[i];
      const shouldBeEnabled = i < allowed;

      // `enabled` may be missing on legacy docs; `===` keeps this idempotent.
      if (warehouse.enabled !== shouldBeEnabled) {
        warehouse.enabled = shouldBeEnabled;
        if (!shouldBeEnabled) warehouse.Is_Online = false;
        await warehouse.save();
      }
    }
  } catch (error: any) {
    console.warn(`[BranchLimit] Failed to enforce branch limit: ${error.message}`);
  }

  return allowed;
}
