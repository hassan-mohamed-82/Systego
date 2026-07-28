import mongoose from "mongoose";
import { ChangeLogModel } from "./ChangeLog";

const TRACKED_TABLES = [
  "Booking",
  "Brand",
  "Cashier",
  "CashierShift",
  "Category",
  "City",
  "Country",
  "Coupon",
  "Currency",
  "Customer",
  "customer_groups",
  "Discount",
  "ExpenseCategory",
  "Expense",
  "Fawry",
  "BankAccount",
  "Geidea",
  "GiftCard",
  "Notification",
  "Orders",
  "Pandel",
  "Payment",
  "PaymentMethod",
  "Paymob",
  "Position",
  "Product",
  "ProductPrice",
  "ProductPriceOption",
  "Product_Warehouse",
  "Return",
  "Role",
  "Sale",
  "ProductSale",
  "ServiceFee",
  "Taxes",
  "User",
  "Variation",
  "Option",
  "Warehouse",
];

// Scalar numeric fields that should propagate as delta ($inc) instead of absolute (set)
const INCREMENTAL_NUMERIC_FIELDS: Record<string, string[]> = {
  Category: ["product_quantity"],
  Coupon: ["amount", "quantity", "available"],
  Currency: ["amount"],
  Customer: ["total_points_earned", "amount_due"],
  BankAccount: ["balance"],
  Product: ["quantity"],
  ProductPrice: ["quantity"],
  Product_Warehouse: ["quantity"],
  Warehouse: ["number_of_products", "stock_Quantity"],
};

// Array fields handled entirely by a dedicated function (e.g. Pandel.products quantity updates).
// The generic diff logic below SKIPS these fields — they log their own change_log rows.
const EXTERNALLY_TRACKED_ARRAY_FIELDS: Record<string, string[]> = {
  Pandel: ["products"],
};

function isIncrementalField(modelName: string, field: string): boolean {
  return INCREMENTAL_NUMERIC_FIELDS[modelName]?.includes(field) ?? false;
}

function isExternallyTrackedField(modelName: string, field: string): boolean {
  return EXTERNALLY_TRACKED_ARRAY_FIELDS[modelName]?.includes(field) ?? false;
}

async function getWarehouseIdFromDoc(
  doc: any,
  modelName: string,
): Promise<any> {
  if (!doc) return null;

  if (modelName === "Warehouse") {
    return doc._id;
  }

  if (modelName === "Transfer") {
    const ids: any[] = [];
    if (doc.fromWarehouseId) ids.push(doc.fromWarehouseId);
    if (doc.toWarehouseId) ids.push(doc.toWarehouseId);
    return ids.length > 0 ? ids : null;
  }

  if (modelName === "CashierShift") {
    if (doc.cashier_id) {
      try {
        const cashier = (await mongoose
          .model("Cashier")
          .findById(doc.cashier_id)
          .lean()) as any;
        if (cashier) return cashier.warehouse_id;
      } catch (err) {
        console.error("Error resolving CashierShift warehouse_id:", err);
      }
    }
  }

  if (modelName === "ProductSale" || modelName === "Payment") {
    if (doc.sale_id) {
      try {
        const sale = (await mongoose
          .model("Sale")
          .findById(doc.sale_id)
          .lean()) as any;
        if (sale) return sale.warehouse_id;
      } catch (err) {
        console.error(`Error resolving ${modelName} warehouse_id:`, err);
      }
    }
  }

  if (modelName === "Expense") {
    if (doc.shift_id) {
      try {
        const shift = (await mongoose
          .model("CashierShift")
          .findOne({ _id: doc.shift_id })
          .lean()) as any;
        if (shift && shift.cashier_id) {
          const cashier = (await mongoose
            .model("Cashier")
            .findById(shift.cashier_id)
            .lean()) as any;
          if (cashier) return cashier.warehouse_id;
        }
      } catch (err) {
        console.error("Error resolving Expense shift warehouse_id:", err);
      }
    }
    if (doc.financial_accountId) {
      try {
        const acc = (await mongoose
          .model("BankAccount")
          .findById(doc.financial_accountId)
          .lean()) as any;
        if (acc) return acc.warehouseId;
      } catch (err) {
        console.error("Error resolving Expense bankAccount warehouse_id:", err);
      }
    }
  }

  if (doc.warehouseId) {
    if (Array.isArray(doc.warehouseId)) return doc.warehouseId;
    return doc.warehouseId;
  }
  if (doc.warehouse_id) return doc.warehouse_id;
  if (doc.WarehouseId) return doc.WarehouseId;

  return null;
}

type SyncMeta = {
  op?: "insert" | "update";
  fields?: Record<string, any>;
  originClientId?: string | null;
  sourceChangeId?: string | null;
};

// ---- array field diff (e.g. Pandel.products[].quantity) ----
function diffArrayField(
  oldArr: any[] = [],
  newArr: any[] = [],
  idKey: string,
  incrementalSubFields: string[],
) {
  const oldById = new Map((oldArr || []).map((item) => [item[idKey], item]));
  const newById = new Map((newArr || []).map((item) => [item[idKey], item]));

  const updated: {
    _id: any;
    deltas: Record<string, number>;
    set: Record<string, any>;
  }[] = [];
  const added: any[] = [];
  const removed: any[] = [];

  for (const [id, newItem] of newById) {
    const oldItem = oldById.get(id);
    if (!oldItem) {
      added.push(newItem);
      continue;
    }

    const deltas: Record<string, number> = {};
    const setFields: Record<string, any> = {};

    for (const key of Object.keys(newItem)) {
      if (key === idKey) continue;
      if (incrementalSubFields.includes(key)) {
        const delta = (newItem[key] ?? 0) - (oldItem[key] ?? 0);
        if (delta !== 0) deltas[key] = delta;
      } else if (
        JSON.stringify(newItem[key]) !== JSON.stringify(oldItem[key])
      ) {
        setFields[key] = newItem[key];
      }
    }

    if (Object.keys(deltas).length || Object.keys(setFields).length) {
      updated.push({ _id: id, deltas, set: setFields });
    }
  }

  for (const [id] of oldById) {
    if (!newById.has(id)) removed.push(id);
  }

  if (!added.length && !removed.length && !updated.length) return null;
  return { op: "arrayPatch" as const, updated, added, removed };
}

// ---- fallback diff builder for writes with NO syncMeta (admin panel, scripts, etc.) ----
function diffToFields(
  Model: any,
  modelName: string,
  oldDoc: any,
  newDoc: any,
  changedKeys: string[],
) {
  const fields: Record<string, any> = {};

  for (const key of changedKeys) {
    if (isExternallyTrackedField(modelName, key)) continue; // logged separately by dedicated function

    const path = Model.schema?.path?.(key);

    if (Array.isArray(newDoc[key]) || Array.isArray(oldDoc?.[key])) {
      // generic arrays we don't have special config for: full replace
      fields[key] = { op: "set", value: newDoc[key] };
      continue;
    }

    if (path?.instance === "Number" && isIncrementalField(modelName, key)) {
      const delta = (newDoc[key] ?? 0) - (oldDoc?.[key] ?? 0);
      if (delta !== 0) fields[key] = { op: "inc", value: delta };
    } else {
      fields[key] = { op: "set", value: newDoc[key] };
    }
  }

  return fields;
}

function buildInsertFields(modelName: string, doc: any) {
  const skip = new Set(["_id", "__v", "createdAt", "updatedAt"]);
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (skip.has(k)) continue;
    fields[k] = v;
  }
  return fields;
}

async function recordChange(p: {
  modelName: string;
  recordId: string;
  op: "insert" | "update" | "delete";
  payload: any;
  warehouseId: any;
  originClientId?: string | null;
  sourceChangeId?: string | null;
}) {
  try {
    const doc: any = {
      table_name: p.modelName,
      record_id: p.recordId,
      op: p.op,
      payload: p.payload,
      warehouseId: p.warehouseId || null,
      originClientId: p.originClientId ?? null,
    };
    if (p.sourceChangeId) doc.sourceChangeId = p.sourceChangeId; // omit entirely if absent

    await ChangeLogModel.create(doc);
  } catch (err: any) {
    if (err?.code === 11000 && p.sourceChangeId) return; // duplicate of an already-recorded push — ignore
    console.error(`syncPlugin recordChange error for ${p.modelName}:`, err);
  }
}

export const syncPlugin = (schema: mongoose.Schema) => {
  // ============ 1. doc.save() ============
  schema.pre("save", async function (this: any) {
    this.$locals.wasNew = this.isNew;
    if (!this.isNew) {
      this.$locals.oldDoc = await this.constructor.findById(this._id).lean();
      this.$locals.modifiedPaths = this.modifiedPaths().filter(
        (p: string) => !["_id", "__v", "updatedAt", "createdAt"].includes(p),
      );
    }
  });

  schema.post("save", async function (doc: any) {
    const modelName = doc.constructor.modelName;
    if (modelName === "ChangeLog" || !TRACKED_TABLES.includes(modelName))
      return;

    const warehouseId = await getWarehouseIdFromDoc(doc, modelName);
    const plain = doc.toObject ? doc.toObject() : doc;

    if (doc.$locals?.wasNew) {
      await recordChange({
        modelName,
        recordId: String(doc._id),
        op: "insert",
        payload: { fields: buildInsertFields(modelName, plain) },
        warehouseId,
      });
      return;
    }

    const modifiedPaths: string[] = doc.$locals?.modifiedPaths ?? [];
    if (modifiedPaths.length === 0) return;

    const arrayConfig = EXTERNALLY_TRACKED_ARRAY_FIELDS[modelName] ?? [];
    const scalarKeys = modifiedPaths.filter((k) => !arrayConfig.includes(k));
    const fields = diffToFields(
      (doc as any).constructor,
      modelName,
      doc.$locals?.oldDoc,
      plain,
      scalarKeys,
    );

    if (Object.keys(fields).length === 0) return;

    await recordChange({
      modelName,
      recordId: String(doc._id),
      op: "update",
      payload: { fields, updatedAt: plain.updatedAt },
      warehouseId,
    });
  });

  // ============ 2. findOneAndUpdate (used by pushChanges) ============
  schema.pre("findOneAndUpdate", async function (this: any) {
    const modelName = this.model.modelName;
    if (modelName === "ChangeLog" || !TRACKED_TABLES.includes(modelName))
      return;
    const opts = this.getOptions() ?? {};
    if (opts.syncMeta) return; // push path — no need to fetch old doc, meta already has the diff
    this._syncOldDoc = await this.model.findOne(this.getQuery()).lean();
  });

  schema.post("findOneAndUpdate", async function (doc: any) {
    if (!doc) return;
    const modelName = (this as any).model.modelName;
    if (modelName === "ChangeLog" || !TRACKED_TABLES.includes(modelName))
      return;

    try {
      const latestDoc = (await (this as any).model
        .findById((doc as any)._id)
        .lean()) as any;
      if (!latestDoc) return;

      const warehouseId = await getWarehouseIdFromDoc(latestDoc, modelName);
      const opts = (this as any).getOptions() ?? {};
      const meta: SyncMeta = opts.syncMeta ?? {};
      const originClientId = meta.originClientId ?? opts.originClientId ?? null;
      const sourceChangeId = meta.sourceChangeId ?? null;

      if (meta.op === "insert") {
        await recordChange({
          modelName,
          recordId: String(latestDoc._id),
          op: "insert",
          payload: { fields: buildInsertFields(modelName, latestDoc) },
          warehouseId,
          originClientId,
          sourceChangeId,
        });
        return;
      }

      if (meta.op === "update" && meta.fields) {
        await recordChange({
          modelName,
          recordId: String(latestDoc._id),
          op: "update",
          payload: { fields: meta.fields, updatedAt: latestDoc.updatedAt },
          warehouseId,
          originClientId,
          sourceChangeId,
        });
        return;
      }

      // Fallback: no syncMeta -> not a push call, diff old vs new ourselves
      const oldDoc = (this as any)._syncOldDoc;
      if (opts.upsert && !oldDoc) {
        await recordChange({
          modelName,
          recordId: String(latestDoc._id),
          op: "insert",
          payload: { fields: buildInsertFields(modelName, latestDoc) },
          warehouseId,
          originClientId,
          sourceChangeId,
        });
        return;
      }

      const changedKeys = Object.keys(latestDoc).filter(
        (k) =>
          !["_id", "__v", "createdAt", "updatedAt"].includes(k) &&
          JSON.stringify(latestDoc[k]) !== JSON.stringify(oldDoc?.[k]),
      );
      if (changedKeys.length === 0) return;

      const fields = diffToFields(
        (this as any).model,
        modelName,
        oldDoc,
        latestDoc,
        changedKeys,
      );
      if (Object.keys(fields).length === 0) return;

      await recordChange({
        modelName,
        recordId: String(latestDoc._id),
        op: "update",
        payload: { fields, updatedAt: latestDoc.updatedAt },
        warehouseId,
        originClientId,
        sourceChangeId,
      });
    } catch (err) {
      console.error(
        `syncPlugin findOneAndUpdate hook error for ${modelName}:`,
        err,
      );
    }
  });

  // ============ 3. updateOne (generic fallback — not used by pushChanges today) ============
  schema.pre("updateOne", async function (this: any) {
    const modelName = this.model.modelName;
    if (modelName === "ChangeLog" || !TRACKED_TABLES.includes(modelName))
      return;
    this._syncOldDoc = await this.model.findOne(this.getQuery()).lean();
  });

  schema.post("updateOne", async function () {
    const modelName = (this as any).model.modelName;
    if (modelName === "ChangeLog" || !TRACKED_TABLES.includes(modelName))
      return;
    try {
      const updatedDoc = (await (this as any).model
        .findOne((this as any).getQuery())
        .lean()) as any;
      if (!updatedDoc) return;
      const oldDoc = (this as any)._syncOldDoc;
      const warehouseId = await getWarehouseIdFromDoc(updatedDoc, modelName);

      const changedKeys = Object.keys(updatedDoc).filter(
        (k) =>
          !["_id", "__v", "createdAt", "updatedAt"].includes(k) &&
          JSON.stringify(updatedDoc[k]) !== JSON.stringify(oldDoc?.[k]),
      );
      if (changedKeys.length === 0) return;

      const fields = diffToFields(
        (this as any).model,
        modelName,
        oldDoc,
        updatedDoc,
        changedKeys,
      );
      if (Object.keys(fields).length === 0) return;

      const opts = (this as any).getOptions() ?? {};
      await recordChange({
        modelName,
        recordId: String(updatedDoc._id),
        op: "update",
        payload: { fields, updatedAt: updatedDoc.updatedAt },
        warehouseId,
        originClientId:
          opts.syncMeta?.originClientId ?? opts.originClientId ?? null,
        sourceChangeId: opts.syncMeta?.sourceChangeId ?? null,
      });
    } catch (err) {
      console.error(`syncPlugin updateOne hook error for ${modelName}:`, err);
    }
  });

  // ============ 4. updateMany (generic fallback) ============
  schema.pre("updateMany", async function (this: any) {
    const modelName = this.model.modelName;
    if (modelName === "ChangeLog" || !TRACKED_TABLES.includes(modelName))
      return;
    this._syncOldDocs = await this.model.find(this.getQuery()).lean();
  });

  schema.post("updateMany", async function () {
    const modelName = (this as any).model.modelName;
    if (modelName === "ChangeLog" || !TRACKED_TABLES.includes(modelName))
      return;
    try {
      const oldDocs: any[] = (this as any)._syncOldDocs ?? [];
      const oldById = new Map(oldDocs.map((d) => [String(d._id), d]));
      const newDocs = (await (this as any).model
        .find((this as any).getQuery())
        .lean()) as any[];

      for (const doc of newDocs) {
        const oldDoc = oldById.get(String(doc._id));
        const changedKeys = Object.keys(doc).filter(
          (k) =>
            !["_id", "__v", "createdAt", "updatedAt"].includes(k) &&
            JSON.stringify(doc[k]) !== JSON.stringify(oldDoc?.[k]),
        );
        if (changedKeys.length === 0) continue;

        const fields = diffToFields(
          (this as any).model,
          modelName,
          oldDoc,
          doc,
          changedKeys,
        );
        if (Object.keys(fields).length === 0) continue;

        const warehouseId = await getWarehouseIdFromDoc(doc, modelName);
        await recordChange({
          modelName,
          recordId: String(doc._id),
          op: "update",
          payload: { fields, updatedAt: doc.updatedAt },
          warehouseId,
        });
      }
    } catch (err) {
      console.error(`syncPlugin updateMany hook error for ${modelName}:`, err);
    }
  });

  // ============ 5. deletes: pre (query-level: deleteOne/deleteMany/findOneAndDelete — this is what findByIdAndDelete uses) ============
  schema.pre(
    ["deleteOne", "deleteMany", "findOneAndDelete"],
    async function () {
      const modelName = (this as any).model.modelName;
      if (modelName === "ChangeLog" || !TRACKED_TABLES.includes(modelName))
        return;
      try {
        (this as any)._docsToDelete = (await (this as any).model
          .find((this as any).getQuery())
          .lean()) as any[];
        const opts = (this as any).getOptions() ?? {};
        (this as any)._originClientId =
          opts.syncMeta?.originClientId ?? opts.originClientId ?? null;
        (this as any)._sourceChangeId = opts.syncMeta?.sourceChangeId ?? null;
      } catch (err) {
        console.error(
          `syncPlugin pre-delete hook error for ${modelName}:`,
          err,
        );
      }
    },
  );

  // ============ 6. deletes: post ============
  schema.post(
    ["deleteOne", "deleteMany", "findOneAndDelete"],
    async function () {
      const modelName = (this as any).model.modelName;
      if (modelName === "ChangeLog" || !TRACKED_TABLES.includes(modelName))
        return;
      const docs = (this as any)._docsToDelete;
      if (!docs?.length) return;
      const originClientId = (this as any)._originClientId ?? null;
      const sourceChangeId = (this as any)._sourceChangeId ?? null;
      for (const doc of docs) {
        const warehouseId = await getWarehouseIdFromDoc(doc, modelName);
        await recordChange({
          modelName,
          recordId: String(doc._id),
          op: "delete",
          payload: null,
          warehouseId,
          originClientId,
          sourceChangeId,
        });
      }
    },
  );

  // ============ 7. document-level doc.deleteOne() ============
  schema.pre("deleteOne", { document: true, query: false }, async function () {
    const doc: any = this;
    const modelName = doc.constructor.modelName;
    if (modelName === "ChangeLog" || !TRACKED_TABLES.includes(modelName))
      return;
    const warehouseId = await getWarehouseIdFromDoc(doc, modelName);
    await recordChange({
      modelName,
      recordId: String(doc._id),
      op: "delete",
      payload: null,
      warehouseId,
    });
  });
};
