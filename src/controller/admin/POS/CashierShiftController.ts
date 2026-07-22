import { Request, Response } from "express";
import { CashierShift } from "../../../models/schema/admin/POS/CashierShift";
import { SaleModel } from "../../../models/schema/admin/POS/Sale";
import { SuccessResponse } from "../../../utils/response";
import { NotFound, UnauthorizedError } from "../../../Errors";
import { BadRequest } from "../../../Errors/BadRequest";
import { UserModel } from "../../../models/schema/admin/User";
import { PositionModel } from "../../../models/schema/admin/position";
import bcrypt from "bcryptjs";
import { ExpenseModel } from "../../../models/schema/admin/POS/expenses";
import { CashierModel } from "../../../models/schema/admin/cashier";
import mongoose from "mongoose";
import { PaymentModel } from "../../../models/schema/admin/POS/payment";
import { BankAccountModel } from "../../../models/schema/admin/Financial_Account";

// import { Forbidden, BadRequest, NotFound } من الـ error handlers بتاعتك

export const startcashierShift = async (req: Request, res: Response) => {
  const cashierman_id = req.user?.id;
  const warehouseId = (req.user as any)?.warehouse_id;
  const { cashier_id } = req.body;

  if (!cashierman_id) throw new NotFound("User not found");
  if (!warehouseId) throw new NotFound("Warehouse ID is required");

  // ✅ هل اليوزر عنده شيفت مفتوح؟
  const existingShift = await CashierShift.findOne({
    cashierman_id,
    status: "open",
  });

  if (existingShift) {
    const cashierDoc = await CashierModel.findById(existingShift.cashier_id);

    return SuccessResponse(res, {
      message: "You already have an open shift",
      isExisting: true,
      shift: existingShift,
      cashier: cashierDoc,
    });
  }

  if (!cashier_id) {
    throw new BadRequest("Cashier ID is required");
  }

  // 🔥 check من الـ shift
  const busyShift = await CashierShift.findOne({
    cashier_id,
    status: "open",
  });

  if (busyShift) {
    throw new BadRequest("Cashier already has an open shift");
  }

  const cashierDoc = await CashierModel.findOne({
    _id: cashier_id,
    warehouse_id: warehouseId,
    status: true,
  });

  if (!cashierDoc) {
    throw new NotFound("Cashier not found");
  }

  // ✅ افتح الشيفت
  const cashierShift = await CashierShift.create({
    start_time: new Date(),
    cashierman_id,
    cashier_id,
    status: "open",
  });

  // ✅ بعد ما الشيفت اتفتح فعلًا
  await CashierModel.updateOne(
    { _id: cashier_id },
    { $set: { cashier_active: true } },
  );

  SuccessResponse(res, {
    message: "Cashier shift started successfully",
    shift: cashierShift,
    cashier: cashierDoc,
  });
};

export const endShiftWithReport = async (req: Request, res: Response) => {
  const { password } = req.body;
  const jwtUser = req.user;

  if (!jwtUser) throw new UnauthorizedError("Unauthorized");

  const userId = jwtUser.id;

  // ✅ 1) تحقق من اليوزر والباسورد
  const user = await UserModel.findById(userId).select("+password_hash");
  if (!user) throw new NotFound("User not found");

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new BadRequest("Wrong password");

  // ✅ 2) هات الشيفت المفتوح (source of truth)
  const shift = await CashierShift.findOne({
    cashierman_id: user._id,
    status: "open",
  }).sort({ start_time: -1 });

  if (!shift) throw new NotFound("No open cashier shift found");

  // ✅ 3) تحديد تاريخ الفلترة (الأحدث بين بداية اليوم وبداية الشيفت)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const shiftStartTime = new Date(shift.start_time || Date.now());

  const filterFromDate = new Date(
    Math.max(shiftStartTime.getTime(), todayStart.getTime()),
  );

  // ✅ 4) المبيعات
  const completedSales = await SaleModel.find({
    shift_id: shift._id,
    cashier_id: user._id,
    order_pending: 0,
    createdAt: { $gte: filterFromDate },
  })
    .select("_id grand_total")
    .lean();

  const totalSales = completedSales.reduce(
    (sum, s: any) => sum + (s.grand_total || 0),
    0,
  );

  const totalOrders = completedSales.length;
  const saleIds = completedSales.map((s: any) => s._id);

  // ✅ 5) المدفوعات مجمعة حسب الحساب
  let paymentsByAccount: Record<string, number> = {};

  if (saleIds.length) {
    const paymentsAgg = await PaymentModel.aggregate([
      { $match: { sale_id: { $in: saleIds } } },
      { $unwind: "$financials" },
      {
        $group: {
          _id: "$financials.account_id",
          totalAmount: { $sum: "$financials.amount" },
        },
      },
    ]);

    paymentsByAccount = paymentsAgg.reduce((acc: any, row: any) => {
      if (row._id) acc[row._id.toString()] = row.totalAmount;
      return acc;
    }, {});
  }

  // ✅ 6) المصروفات
  const expensesAgg = await ExpenseModel.aggregate([
    {
      $match: {
        shift_id: shift._id,
        cashier_id: user._id,
        createdAt: { $gte: filterFromDate },
      },
    },
    {
      $group: {
        _id: "$financial_accountId",
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  const expensesByAccount = expensesAgg.reduce((acc: any, row: any) => {
    if (row._id) acc[row._id.toString()] = row.totalAmount;
    return acc;
  }, {});

  const totalExpenses = Object.values(expensesByAccount).reduce(
    (sum: number, v: any) => sum + v,
    0,
  );

  const netCashInDrawer = totalSales - totalExpenses;

  // ✅ 7) الحسابات المستخدمة
  const allAccountIds = [
    ...new Set([
      ...Object.keys(paymentsByAccount),
      ...Object.keys(expensesByAccount),
    ]),
  ];

  let accounts: any[] = [];

  if (allAccountIds.length) {
    accounts = await BankAccountModel.find({
      _id: { $in: allAccountIds },
    })
      .select("name type")
      .lean();
  }

  const accountsMap = new Map(accounts.map((a: any) => [a._id.toString(), a]));

  // ✅ 8) summary لكل حساب
  const accountRows = allAccountIds.map((id) => {
    const acc = accountsMap.get(id);

    const salesAmount = paymentsByAccount[id] || 0;
    const expensesAmount = expensesByAccount[id] || 0;

    return {
      account_id: id,
      name: acc?.name || "Unknown",
      salesAmount,
      expensesAmount,
      net: salesAmount - expensesAmount,
    };
  });

  // ✅ 9) تفاصيل المصروفات
  const expenses = await ExpenseModel.find({
    shift_id: shift._id,
    cashier_id: user._id,
    createdAt: { $gte: filterFromDate },
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

  // ✅ 10) بناء التقرير
  const report = {
    financialSummary: {
      totals: {
        totalSales,
        totalExpenses,
        netCashInDrawer,
      },
      accounts: accountRows,
    },
    ordersSummary: {
      totalOrders,
    },
    expenses: {
      rows: expensesRows,
      total: totalExpenses,
    },
  };

  // ✅ 11) تجهيز بيانات الشيفت
  const shiftData = (shift as any).toObject?.() || shift;

  return SuccessResponse(res, {
    message: "Shift report preview (still open)",
    shift: {
      ...shiftData,
      total_sale_amount: totalSales,
      total_expenses: totalExpenses,
      net_cash_in_drawer: netCashInDrawer,
    },
    report,
  });
};

export const endshiftcashier = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  if (!jwtUser) throw new UnauthorizedError("Unauthorized");

  const cashierman_id = jwtUser.id;

  const shift = await CashierShift.findOne({
    cashierman_id,
    status: "open",
  }).sort({ start_time: -1 });

  if (!shift) {
    throw new NotFound("Cashier shift not found");
  }

  if (shift.end_time) {
    throw new BadRequest("Shift already ended");
  }

  // ✅ اقفل الشيفت
  shift.end_time = new Date();
  shift.status = "closed";
  await shift.save();
  await CashierModel.findByIdAndUpdate(shift.cashier_id, {
    cashier_active: false,
  });

  SuccessResponse(res, {
    message: "Cashier shift ended successfully",
    shift,
  });
};

export const getCashierUsers = async (req: Request, res: Response) => {
  // 1️⃣ هات Position اللي اسمه Cashier
  const cashierPosition = await PositionModel.findOne({ name: "Cashier" });

  if (!cashierPosition) {
    throw new NotFound("Cashier position not found");
  }

  // 2️⃣ هات كل Users اللي positionId بتاعهم = ID بتاع Cashier
  const users = await UserModel.find({
    positionId: cashierPosition._id,
  }).select("-password_hash");

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
