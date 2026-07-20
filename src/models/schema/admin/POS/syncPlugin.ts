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

async function getWarehouseIdFromDoc(doc: any, modelName: string): Promise<any> {
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
        const cashier = await mongoose.model("Cashier").findById(doc.cashier_id).lean() as any;
        if (cashier) return cashier.warehouse_id;
      } catch (err) {
        console.error("Error resolving CashierShift warehouse_id:", err);
      }
    }
  }

  if (modelName === "ProductSale" || modelName === "Payment") {
    if (doc.sale_id) {
      try {
        const sale = await mongoose.model("Sale").findById(doc.sale_id).lean() as any;
        if (sale) return sale.warehouse_id;
      } catch (err) {
        console.error(`Error resolving ${modelName} warehouse_id:`, err);
      }
    }
  }

  if (modelName === "Expense") {
    if (doc.shift_id) {
      try {
        const shift = await mongoose.model("CashierShift").findOne({ _id: doc.shift_id }).lean() as any;
        if (shift && shift.cashier_id) {
          const cashier = await mongoose.model("Cashier").findById(shift.cashier_id).lean() as any;
          if (cashier) return cashier.warehouse_id;
        }
      } catch (err) {
        console.error("Error resolving Expense shift warehouse_id:", err);
      }
    }
    if (doc.financial_accountId) {
      try {
        const acc = await mongoose.model("BankAccount").findById(doc.financial_accountId).lean() as any;
        if (acc) return acc.warehouseId;
      } catch (err) {
        console.error("Error resolving Expense bankAccount warehouse_id:", err);
      }
    }
  }

  // Direct fields
  if (doc.warehouseId) {
    if (Array.isArray(doc.warehouseId)) return doc.warehouseId;
    return doc.warehouseId;
  }
  if (doc.warehouse_id) return doc.warehouse_id;
  if (doc.WarehouseId) return doc.WarehouseId;

  return null;
}

export const syncPlugin = (schema: mongoose.Schema) => {
  // 1. Post Save (inserts or doc.save() updates)
  schema.post("save", async function (doc: any) {
    const modelName = doc.constructor.modelName;
    if (modelName === "ChangeLog") return;
    if (!TRACKED_TABLES.includes(modelName)) return;

    try {
      const warehouseId = await getWarehouseIdFromDoc(doc, modelName);
      await ChangeLogModel.create({
        table_name: modelName,
        record_id: String(doc._id),
        op: "upsert",
        payload: doc.toObject ? doc.toObject() : doc,
        warehouseId: warehouseId || null,
      });
    } catch (err) {
      console.error(`syncPlugin save hook error for ${modelName}:`, err);
    }
  });

  // 2. Post findOneAndUpdate
  schema.post("findOneAndUpdate", async function (doc: any) {
    if (!doc) return;
    const modelName = (this as any).model.modelName;
    if (modelName === "ChangeLog") return;
    if (!TRACKED_TABLES.includes(modelName)) return;

    try {
      // Always retrieve the latest updated document from DB to be safe
      const latestDoc = await (this as any).model.findById((doc as any)._id).lean() as any;
      if (!latestDoc) return;

      const warehouseId = await getWarehouseIdFromDoc(latestDoc, modelName);
      const originClientId = (this as any).getOptions()?.originClientId ?? null;

      await ChangeLogModel.create({
        table_name: modelName,
        record_id: String(latestDoc._id),
        op: "upsert",
        payload: latestDoc,
        warehouseId: warehouseId || null,
        originClientId,
      });
    } catch (err) {
      console.error(`syncPlugin findOneAndUpdate hook error for ${modelName}:`, err);
    }
  });

  // 3. Post updateOne
  schema.post("updateOne", async function (res: any) {
    const modelName = (this as any).model.modelName;
    if (modelName === "ChangeLog") return;
    if (!TRACKED_TABLES.includes(modelName)) return;

    try {
      const queryFilter = (this as any).getQuery();
      const updatedDoc = await (this as any).model.findOne(queryFilter).lean() as any;
      if (!updatedDoc) return;

      const warehouseId = await getWarehouseIdFromDoc(updatedDoc, modelName);
      const originClientId = (this as any).getOptions()?.originClientId ?? null;

      await ChangeLogModel.create({
        table_name: modelName,
        record_id: String(updatedDoc._id),
        op: "upsert",
        payload: updatedDoc,
        warehouseId: warehouseId || null,
        originClientId,
      });
    } catch (err) {
      console.error(`syncPlugin updateOne hook error for ${modelName}:`, err);
    }
  });

  // 4. Post updateMany
  schema.post("updateMany", async function (res: any) {
    const modelName = (this as any).model.modelName;
    if (modelName === "ChangeLog") return;
    if (!TRACKED_TABLES.includes(modelName)) return;

    try {
      const queryFilter = (this as any).getQuery();
      const updatedDocs = await (this as any).model.find(queryFilter).lean() as any[];
      for (const doc of updatedDocs) {
        const warehouseId = await getWarehouseIdFromDoc(doc, modelName);
        await ChangeLogModel.create({
          table_name: modelName,
          record_id: String(doc._id),
          op: "upsert",
          payload: doc,
          warehouseId: warehouseId || null,
        });
      }
    } catch (err) {
      console.error(`syncPlugin updateMany hook error for ${modelName}:`, err);
    }
  });

  // 5. Pre deletion hooks (query level: deleteOne, deleteMany, findOneAndDelete)
  schema.pre(["deleteOne", "deleteMany", "findOneAndDelete"], async function () {
    const modelName = (this as any).model.modelName;
    if (modelName === "ChangeLog") return;
    if (!TRACKED_TABLES.includes(modelName)) return;

    try {
      const queryFilter = (this as any).getQuery();
      const docsToDelete = await (this as any).model.find(queryFilter).lean() as any[];
      (this as any)._docsToDelete = docsToDelete;
      (this as any)._originClientId = (this as any).getOptions()?.originClientId ?? null;
    } catch (err) {
      console.error(`syncPlugin pre-delete hook error for ${modelName}:`, err);
    }
  });

  // 6. Post deletion hooks (query level: deleteOne, deleteMany, findOneAndDelete)
  schema.post(["deleteOne", "deleteMany", "findOneAndDelete"], async function () {
    const modelName = (this as any).model.modelName;
    if (modelName === "ChangeLog") return;
    if (!TRACKED_TABLES.includes(modelName)) return;

    const docs = (this as any)._docsToDelete;
    if (!docs || docs.length === 0) return;
    const originClientId = (this as any)._originClientId ?? null;

    try {
      for (const doc of docs) {
        const warehouseId = await getWarehouseIdFromDoc(doc, modelName);
        await ChangeLogModel.create({
          table_name: modelName,
          record_id: String(doc._id),
          op: "delete",
          payload: null,
          warehouseId: warehouseId || null,
          originClientId,
        });
      }
    } catch (err) {
      console.error(`syncPlugin post-delete hook error for ${modelName}:`, err);
    }
  });

  // 7. Document-level deleteOne hook
  schema.pre("deleteOne", { document: true, query: false }, async function () {
    const doc: any = this;
    const modelName = doc.constructor.modelName;
    if (modelName === "ChangeLog") return;
    if (!TRACKED_TABLES.includes(modelName)) return;

    try {
      const warehouseId = await getWarehouseIdFromDoc(doc, modelName);
      await ChangeLogModel.create({
        table_name: modelName,
        record_id: String(doc._id),
        op: "delete",
        payload: null,
        warehouseId: warehouseId || null,
      });
    } catch (err) {
      console.error(`syncPlugin document deleteOne error for ${modelName}:`, err);
    }
  });
};
