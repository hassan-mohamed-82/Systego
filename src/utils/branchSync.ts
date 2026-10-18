import { WarehouseModel } from "../models/schema/admin/Warehouse";

/**
 * Synchronises this tenant's branches (warehouses) with the branch definitions
 * set by the owner in Super Systego.
 *
 * Each entry is `{ name, Is_Online }`. The owner decides which branches are
 * online (and how many).
 *
 * Rules:
 *  - Only branches flagged `is_managed` are touched; warehouses the customer
 *    created by hand are left exactly as they are.
 *  - A branch in the list is created (if missing), re-enabled and its online
 *    flag applied.
 *  - A managed branch that is no longer in the list is *suspended*
 *    (`enabled = false`) rather than deleted, so stock/history is preserved.
 *
 * The function is intentionally defensive: any failure is swallowed so a
 * Super Systego/database hiccup never breaks the request that triggered it.
 */
export async function syncBranches(branchesConfig: unknown): Promise<void> {
  try {
    if (!Array.isArray(branchesConfig) || branchesConfig.length === 0) {
      // No branch configuration from Super → nothing to enforce (legacy clients).
      return;
    }

    const entries = branchesConfig
      .map((b: any) => {
        if (typeof b === "string") {
          return { name: b.trim(), Is_Online: false };
        }
        return {
          name: typeof b?.name === "string" ? b.name.trim() : "",
          Is_Online: !!b?.Is_Online,
        };
      })
      .filter((b) => b.name.length > 0);

    if (entries.length === 0) return;

    const names = entries.map((e) => e.name);

    for (const entry of entries) {
      const warehouse = await WarehouseModel.findOne({ name: entry.name });

      if (!warehouse) {
        await WarehouseModel.create({
          name: entry.name,
          ar_name: entry.name,
          address: entry.name,
          ar_address: entry.name,
          phone: "",
          is_managed: true,
          enabled: true,
          Is_Online: entry.Is_Online,
        });
      } else {
        warehouse.is_managed = true;
        warehouse.enabled = true;
        warehouse.Is_Online = entry.Is_Online;
        await warehouse.save();
      }
    }

    // Suspend managed branches that are no longer part of the plan.
    await WarehouseModel.updateMany(
      { is_managed: true, name: { $nin: names } },
      { $set: { enabled: false, Is_Online: false } },
    );

    console.log(
      `[BranchSync] Synced ${entries.length} branch(es); online: ${entries
        .filter((e) => e.Is_Online)
        .map((e) => e.name)
        .join(", ") || "none"}`,
    );
  } catch (error: any) {
    console.warn(`[BranchSync] Failed to sync branches: ${error.message}`);
  }
}
