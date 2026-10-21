import { BankAccountModel } from "../models/schema/admin/Financial_Account";
import { WarehouseModel } from "../models/schema/admin/Warehouse";

const CASH_MATCH = {
  $or: [
    { name: { $regex: /\bcash\b/i } },
    { ar_name: { $regex: /كاش|نقدي/ } },
  ],
};

/**
 * يضمن وجود حساب "Cash" واحد مشترك ويظهر في كل الفروع.
 * - لو الحساب مش موجود: بيعمله ويربطه بكل الفروع.
 * - لو موجود: بيضيف أي فروع جديدة ليه.
 * - بيخليه in_POS عشان يظهر في POS.
 */
export const ensureCashAccountForAllBranches = async () => {
  const warehouses = await WarehouseModel.find().select("_id").lean();
  const warehouseIds = warehouses.map((w: any) => w._id.toString());

  if (warehouseIds.length === 0) {
    return null;
  }

  // نفضّل حساب Cash اللي بياناته كاملة (الاسم عربي والإنجليزي)
  // ولو مفيش، نختار أقدم حساب Cash ونصلح بياناته
  let cashAccount = await BankAccountModel.findOne({
    ...CASH_MATCH,
    name: { $exists: true, $nin: ["", null] },
    ar_name: { $exists: true, $nin: ["", null] },
  }).sort({ createdAt: -1 });

  if (!cashAccount) {
    cashAccount = await BankAccountModel.findOne(CASH_MATCH).sort({
      createdAt: 1,
    });
  }

  if (!cashAccount) {
    return BankAccountModel.create({
      name: "Cash",
      ar_name: "كاش",
      warehouseId: warehouseIds,
      balance: 0,
      status: true,
      in_POS: true,
    });
  }

  // ✅ إصلاح أي بيانات ناقصة في الحساب القديم (عشان الـ validation ما يضربش)
  if (!cashAccount.name || !cashAccount.name.trim()) {
    cashAccount.name = "Cash";
  }
  if (!cashAccount.ar_name || !cashAccount.ar_name.trim()) {
    cashAccount.ar_name = "كاش";
  }
  if (!cashAccount.warehouseId || cashAccount.warehouseId.length === 0) {
    cashAccount.warehouseId = warehouseIds as any;
  }

  // نضيف كل الفروع للحساب المشترك
  const existingIds = new Set(
    (cashAccount.warehouseId as any[]).map((id) => id.toString()),
  );
  const missingIds = warehouseIds.filter((id) => !existingIds.has(id));

  if (missingIds.length > 0) {
    cashAccount.warehouseId.push(...(missingIds as any));
  }

  cashAccount.status = true;
  cashAccount.in_POS = true;
  await cashAccount.save();

  return cashAccount;
};

/**
 * لما نضيف فرع جديد: نضيفه لحساب Cash المشترك فورًا.
 */
export const addWarehouseToCashAccount = async (warehouseId: string) => {
  let cashAccount = await BankAccountModel.findOne({
    ...CASH_MATCH,
    name: { $exists: true, $nin: ["", null] },
    ar_name: { $exists: true, $nin: ["", null] },
  }).sort({ createdAt: -1 });

  if (!cashAccount) {
    cashAccount = await BankAccountModel.findOne(CASH_MATCH).sort({
      createdAt: 1,
    });
  }

  // لو مفيش حساب Cash لسه، نعمل واحد بكل الفروع
  if (!cashAccount) {
    return ensureCashAccountForAllBranches();
  }

  // ✅ إصلاح أي بيانات ناقصة في الحساب القديم
  if (!cashAccount.name || !cashAccount.name.trim()) {
    cashAccount.name = "Cash";
  }
  if (!cashAccount.ar_name || !cashAccount.ar_name.trim()) {
    cashAccount.ar_name = "كاش";
  }
  if (!cashAccount.warehouseId || cashAccount.warehouseId.length === 0) {
    cashAccount.warehouseId = [] as any;
  }

  const exists = (cashAccount.warehouseId as any[]).some(
    (id) => id.toString() === warehouseId,
  );

  if (!exists) {
    cashAccount.warehouseId.push(warehouseId as any);
  }

  cashAccount.status = true;
  cashAccount.in_POS = true;
  await cashAccount.save();

  return cashAccount;
};
