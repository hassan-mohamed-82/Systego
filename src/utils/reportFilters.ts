import mongoose from "mongoose";
import { BadRequest } from "../Errors/BadRequest";
import { CashierShift } from "../models/schema/admin/POS/CashierShift";
import { CashierModel } from "../models/schema/admin/cashier";
import { BankAccountModel } from "../models/schema/admin/Financial_Account";

// ═══════════════════════════════════════════════════════════
// 🌿 فلاتر مشتركة للتقارير: الفروع + نقاط البيع (POS)
// - الفرع = Warehouse
// - الـ POS = Cashier (جهاز/كاشير نقطة البيع)
// ═══════════════════════════════════════════════════════════

// يدعم: قيمة واحدة، مفصولة بفاصلة، أو قيم متكررة في الـ query
const toObjectIdList = (
  value: unknown,
  label: string,
): mongoose.Types.ObjectId[] => {
  if (value === undefined || value === null || value === "") return [];

  const rawList: string[] = Array.isArray(value)
    ? value.flatMap((v) => String(v).split(","))
    : String(value).split(",");

  const ids: string[] = [];
  for (const raw of rawList) {
    const id = raw.trim();
    if (!id) continue;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequest(`Invalid ${label}`);
    }
    ids.push(id);
  }

  return [...new Set(ids)].map((id) => new mongoose.Types.ObjectId(id));
};

// الفروع: ?warehouse_id=id أو ?warehouse_id=id1,id2 أو ?branch_id=...
export const resolveBranchIds = (query: any): mongoose.Types.ObjectId[] =>
  toObjectIdList(
    query?.warehouse_id ??
      query?.branch_id ??
      query?.warehouse_ids ??
      query?.branch_ids,
    "warehouse_id",
  );

/**
 * 🔒 نسخة آمنة للتقارير: لو المستخدم مربوط بفرع (warehouse_id في التوكن)
 * بنرجّع فرعه بس ونتجاهل أي فلتر جاي من الـ query.
 * الأدمن اللي مش مربوط بفرع (أو السوبر أدمن) بيختار براحته زي الأول.
 */
export const resolveBranchIdsForUser = (
  query: any,
  user?: { warehouse_id?: string | null } | null,
): mongoose.Types.ObjectId[] => {
  const scoped = user?.warehouse_id;
  if (!scoped) return resolveBranchIds(query);

  const id = String(scoped);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    // id غير صالح → نرجّع id عشوائي عشان مفيش نتايج (أأمن من "كل الفروع")
    return [new mongoose.Types.ObjectId()];
  }
  return [new mongoose.Types.ObjectId(id)];
};

// نقاط البيع: ?cashier_id=id أو ?pos_id=... (مفصولة بفاصلة أو متكررة)
export const resolvePosIds = (query: any): mongoose.Types.ObjectId[] =>
  toObjectIdList(
    query?.cashier_id ??
      query?.pos_id ??
      query?.cashier_ids ??
      query?.pos_ids,
    "cashier_id",
  );

// فلتر مباشر على أي حقل فرع (warehouse_id أو warehouseId)
export const buildBranchFilter = (
  branchIds: mongoose.Types.ObjectId[],
  field = "warehouse_id",
): any => (branchIds.length > 0 ? { [field]: { $in: branchIds } } : {});

// المبيعات/المرتجعات/المصروفات مربوطة بالـ POS عن طريق الشيفت،
// فبنجيب IDs الشيفتات الخاصة بالـ POS المختار
// ترجع null لو مفيش فلتر POS (يعني كل الـ POS)
export const resolvePosShiftIds = async (
  posIds: mongoose.Types.ObjectId[],
): Promise<string[] | null> => {
  if (posIds.length === 0) return null;

  const shifts = await CashierShift.find({ cashier_id: { $in: posIds } })
    .select("_id")
    .lean();

  return shifts.map((s: any) => String(s._id));
};

// فلتر shift_id — مع null مفيش فلتر
export const buildPosShiftFilter = (
  shiftIds: string[] | null,
  field = "shift_id",
): any => (shiftIds === null ? {} : { [field]: { $in: shiftIds } });

// الكاشيرز (POS) التابعين للفروع المختارة
export const resolveBranchCashierIds = async (
  branchIds: mongoose.Types.ObjectId[],
): Promise<mongoose.Types.ObjectId[]> => {
  if (branchIds.length === 0) return [];

  const cashiers = await CashierModel.find({
    warehouse_id: { $in: branchIds },
  })
    .select("_id")
    .lean();

  return cashiers.map((c: any) => c._id as mongoose.Types.ObjectId);
};

// المصروفات والمدفوعات بتتسجل على حسابات بنكية، والحساب مربوط بفروع
export const getBranchAccountFilters = async (
  branchIds: mongoose.Types.ObjectId[],
): Promise<{
  accountFilter: any;
  paymentAccountFilter: any;
  accountIds: mongoose.Types.ObjectId[];
}> => {
  if (branchIds.length === 0) {
    return {
      accountFilter: {},
      paymentAccountFilter: {},
      accountIds: [],
    };
  }

  const accounts = await BankAccountModel.find({
    warehouseId: { $in: branchIds },
  })
    .select("_id")
    .lean();

  const accountIds = accounts.map(
    (acc: any) => acc._id as mongoose.Types.ObjectId,
  );

  return {
    accountFilter: { financial_accountId: { $in: accountIds } },
    paymentAccountFilter: { "financials.account_id": { $in: accountIds } },
    accountIds,
  };
};

// فلتر تاريخ موحّد: يدعم start_date/startDate و end_date/endDate
export const resolveDateFilter = (query: any, field = "createdAt") => {
  const startRaw = query?.start_date ?? query?.startDate;
  const endRaw = query?.end_date ?? query?.endDate;

  const filter: any = {};
  let start: Date | null = null;
  let end: Date | null = null;

  if (startRaw) {
    start = new Date(String(startRaw));
    filter[field] = { ...(filter[field] || {}), $gte: start };
  }
  if (endRaw) {
    end = new Date(new Date(String(endRaw)).setHours(23, 59, 59, 999));
    filter[field] = { ...(filter[field] || {}), $lte: end };
  }

  return { start, end, filter };
};
