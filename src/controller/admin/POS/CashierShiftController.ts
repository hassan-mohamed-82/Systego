import { Request, Response } from 'express';
import { CashierShift } from '../../../models/schema/admin/POS/CashierShift'; 
import { SaleModel } from '../../../models/schema/admin/POS/Sale'; 
import { SuccessResponse } from '../../../utils/response';
import { NotFound, UnauthorizedError } from '../../../Errors';
import { BadRequest } from '../../../Errors/BadRequest';
import { UserModel } from '../../../models/schema/admin/User';
import { PositionModel } from '../../../models/schema/admin/position';
import bcrypt from "bcryptjs";
import { ExpenseModel } from '../../../models/schema/admin/POS/expenses';
import { CashierModel } from '../../../models/schema/admin/cashier';
import mongoose from 'mongoose';
import { PaymentModel } from '../../../models/schema/admin/POS/payment';
import { BankAccountModel } from '../../../models/schema/admin/Financial_Account';

// import { Forbidden, BadRequest, NotFound } من الـ error handlers بتاعتك


export const startcashierShift = async (req: Request, res: Response) => {
  const cashierman_id = req.user?.id;          // اليوزر اللي داخل بالـ JWT
  const warehouseId   = (req.user as any)?.warehouse_id;
  const { cashier_id } = req.body;            // الكاشير المختار من الشاشة (CashierModel._id)

  if (!cashierman_id) {
    throw new NotFound("Cashier user not found in token");
  }
  if (!warehouseId) {
    throw new NotFound("Warehouse ID is required");
  }
  if (!cashier_id) {
    throw new BadRequest("Cashier ID is required");
  }

  const cashierUser = await UserModel.findById(cashierman_id);
  if (!cashierUser) {
    throw new NotFound("Cashier user not found");
  }

  // 🔒 امنع أن نفس اليوزر يكون له شيفت مفتوح
  const existingShift = await CashierShift.findOne({
    cashierman_id,
    status: "open",
  });
  if (existingShift) {
    throw new BadRequest("You already have an open shift");
  }

  // 🔒 امنع أن نفس الكاشير (CashierModel) يشتغل مع حد تاني
  const cashierDoc = await CashierModel.findOneAndUpdate(
    {
      _id: cashier_id,
      warehouse_id: warehouseId,
      status: true,
      cashier_active: false, // لو true يبقى مستخدم عَ شيفت تاني
    },
    { $set: { cashier_active: true } }, // نفعّله
    { new: true }
  );

  if (!cashierDoc) {
    throw new BadRequest("Cashier already in use or not found");
  }

  // ✅ نفتح الشيفت ونربطه بـ cashierman_id + cashier_id
  const cashierShift = new CashierShift({
    start_time: new Date(),
    cashierman_id,
    cashier_id,
    status: "open",
  });

  const savedShift = await cashierShift.save();

  SuccessResponse(res, {
    message: "Cashier shift started successfully",
    shift: savedShift,
    cashier: cashierDoc,
  });
};

export const endShiftWithReport = async (req: Request, res: Response) => {
const { password } = req.body;
  const jwtUser = req.user;
  if (!jwtUser) throw new UnauthorizedError("Unauthorized");

  const userId      = jwtUser.id;
  const warehouseId = (jwtUser as any)?.warehouse_id;

  // 1) هات اليوزر وتأكد من الباسورد
  const user = await UserModel.findById(userId).select(
    "+password_hash +role +positionId"
  );
  if (!user) throw new NotFound("User not found");

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new BadRequest("Wrong password");

  // 2) آخر شيفت مفتوح لليوزر ده
  const shift = await CashierShift.findOne({
    cashierman_id: user._id,
    status: "open",
  }).sort({ start_time: -1 });

  if (!shift) throw new NotFound("No open cashier shift found");

  // 3) المبيعات المكتملة في الشيفت ده
  const completedSales = await SaleModel.find({
    shift_id: shift._id,
    cashier_id: user._id,
    order_pending: 0, // بس الـ completed
  })
    .select("_id grand_total")
    .lean();

  const totalSales  = completedSales.reduce(
    (sum, s: any) => sum + (s.grand_total || 0),
    0
  );
  const totalOrders = completedSales.length;
  const saleIds     = completedSales.map((s: any) => s._id);

  // 4) إجمالي المدفوعات من PaymentModel مجمعة حسب الحساب المالي
  interface PaymentsAggRow {
    _id: mongoose.Types.ObjectId;
    totalAmount: number;
  }

  let paymentsByAccount: Record<string, number> = {};

  if (saleIds.length > 0) {
    const paymentsAgg: PaymentsAggRow[] = await PaymentModel.aggregate([
      {
        $match: {
          sale_id: { $in: saleIds },
          status: "completed",
        },
      },
      { $unwind: "$financials" },
      {
        $group: {
          _id: "$financials.account_id",
          totalAmount: { $sum: "$financials.amount" },
        },
      },
    ]);

    paymentsByAccount = paymentsAgg.reduce(
      (acc: Record<string, number>, row: PaymentsAggRow) => {
        acc[row._id.toString()] = row.totalAmount;
        return acc;
      },
      {}
    );
  }

  // 5) مصروفات الشيفت مجمعة حسب الحساب المالي
  interface ExpensesAggRow {
    _id: mongoose.Types.ObjectId;
    totalAmount: number;
  }

  const expensesAgg: ExpensesAggRow[] = await ExpenseModel.aggregate([
    {
      $match: {
        shift_id: shift._id,
        cashier_id: user._id,
      },
    },
    {
      $group: {
        _id: "$financial_accountId",
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  const expensesByAccount = expensesAgg.reduce(
    (acc: Record<string, number>, row: ExpensesAggRow) => {
      if (!row._id) return acc;
      acc[row._id.toString()] = row.totalAmount;
      return acc;
    },
    {}
  );

  const totalExpenses = Object.values(expensesByAccount).reduce(
    (sum, v) => sum + v,
    0
  );

  const netCashInDrawer = totalSales - totalExpenses;

  // 6) هات بيانات الحسابات المالية اللي اتستخدمت في المبيعات أو المصروفات
  const allAccountIds = Array.from(
    new Set([
      ...Object.keys(paymentsByAccount),
      ...Object.keys(expensesByAccount),
    ])
  ).filter((id) => !!id);

  const accountObjectIds = allAccountIds.map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  const accounts = await BankAccountModel.find({
    _id: { $in: accountObjectIds },
  })
    .select("name type")
    .lean();

  const accountsMap = new Map(
    accounts.map((a: any) => [a._id.toString(), a])
  );

  // 7) بناء الـ summary ديناميك لكل حساب مالي
  const accountRows = allAccountIds.map((id) => {
    const acc = accountsMap.get(id);
    const salesAmount    = paymentsByAccount[id] || 0;
    const expensesAmount = expensesByAccount[id] || 0;

    return {
      account_id: id,
      name: acc?.name || "Unknown account",
      salesAmount,
      expensesAmount,
      net: salesAmount - expensesAmount,
    };
  });

  // 8) مصروفات مفصلة (لو محتاج تبينها تحت)
  const expenses = await ExpenseModel.find({
    shift_id: shift._id,
    cashier_id: user._id,
  })
    .populate("financial_accountId", "name")
    .lean();

  const expensesRows = expenses.map((e: any, idx: number) => ({
    index: idx + 1,
    description: e.name,
    amount: -e.amount,
    account: e.financial_accountId
      ? {
          id: e.financial_accountId._id,
          name: e.financial_accountId.name,
        }
      : null,
  }));

  // 👈 مفيش قفل شيفت هنا (لا status, لا end_time, لا cashier_active)

  const report = {
    financialSummary: {
      totals: {
        totalSales,
        totalExpenses,
        netCashInDrawer,
      },
      accounts: accountRows, // Vodafone Cash, Instapay, Cash ... حسب الداتا
    },
    ordersSummary: {
      totalOrders,
    },
    expenses: {
      rows: expensesRows,
      total: totalExpenses,
    },
  };

  return SuccessResponse(res, {
    message: "Shift report preview (shift is still open)",
    shift,
    report,
  });
};


export const endshiftcashier = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  if (!jwtUser) throw new UnauthorizedError("Unauthorized");

  const cashierman_id = jwtUser.id;               // User من الـ JWT
  const warehouseId   = jwtUser.warehouse_id;

  if (!cashierman_id) {
    throw new NotFound("Cashier user not found in token");
  }
  if (!warehouseId) {
    throw new NotFound("Warehouse ID is required");
  }

  // 🔎 هات آخر شيفت مفتوح لليوزر ده (زي endShiftWithReport)
  const shift = await CashierShift.findOne({
    cashierman_id,
    status: "open",
  }).sort({ start_time: -1 });

  if (!shift) {
    throw new NotFound("Cashier shift not found");
  }

  if (shift.end_time) {
    throw new BadRequest("Cashier shift already ended");
  }

  // الكاشير (CashierModel) اللي كان مستخدم في الشيفت
  const cashier_id = shift.cashier_id;

  // ✅ نقفل الشيفت (لو عندك داتا قديمة ناقصة cashier_id استخدم الاختيار اللي تحت)
  shift.end_time = new Date();
  shift.status   = "closed";
  await shift.save(); // أو الخيار B تحت

  // ✅ نرجع الكاشير متاح تاني في نفس الـ warehouse
  if (cashier_id) {
    await CashierModel.updateOne(
      {
        _id: cashier_id,
        warehouse_id: warehouseId,
        status: true,
        cashier_active: true, // كان مستخدم في الشيفت
      },
      { $set: { cashier_active: false } }
    );
  }

  SuccessResponse(res, {
    message: "Cashier shift ended successfully",
    shift,
  });
};



export const getCashierUsers = async (req: Request, res: Response ) => {
  // 1️⃣ هات Position اللي اسمه Cashier
  const cashierPosition = await PositionModel.findOne({ name: "Cashier" });

  if (!cashierPosition) {
    throw new NotFound("Cashier position not found");
  }

  // 2️⃣ هات كل Users اللي positionId بتاعهم = ID بتاع Cashier
  const users = await UserModel.find({ positionId: cashierPosition._id })
    .select("-password_hash");

  // 3️⃣ رجّع الرد
  SuccessResponse(res, {
    message: "Cashier users fetched successfully",
    users,
  });
};

//logout for cashiershift without token invalidation
export const logout = async (req: Request, res: Response) => {

  return SuccessResponse(res, {
    message: "Logged out successfully",
  });
};