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

// import { Forbidden, BadRequest, NotFound } من الـ error handlers بتاعتك

export const startcashierShift = async (req: Request, res: Response) => {
  const cashierman_id = req.user?.id;        // الكاشير مان من الـ JWT
  const warehouseId   = req.user?.warehouse_id;
  const { cashier_id } = req.body;           // الكاشير اللي متحدد في الشاشة

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

  // 🔒 امنع شيفت مفتوح لنفس الكاشير مان
  const existingShift = await CashierShift.findOne({
    cashierman_id,
    status: "open",
  });
  if (existingShift) {
    throw new BadRequest("Cashier already has an open shift");
  }

  // 🔒 امنع استخدام نفس الكاشير من حد تاني
  const cashierDoc = await CashierModel.findOneAndUpdate(
    {
      _id: cashier_id,
      warehouse_id: warehouseId,
      status: true,
      cashier_active: false, // لو true يبقى حد مستخدمه بالفعل
    },
    { $set: { cashier_active: true } },      // نخليه مستخدم
    { new: true }
  );

  if (!cashierDoc) {
    throw new BadRequest("Cashier already in use or not found");
  }

  // ✅ نفتح الشيفت ونربطه بالـ cashier_id
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

  const userId = jwtUser.id;

  // 1) هات اليوزر وتأكد من الباسورد
  const user = await UserModel.findById(userId).select("+password_hash +role +positionId");
  if (!user) throw new NotFound("User not found");

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new BadRequest("Wrong password");

  // 2) هات آخر شيفت مفتوح للكاشير ده (من غير ما تبعت shiftId)
  const shift = await CashierShift.findOne({
    cashier_id: user._id,
    status: "open",
  }).sort({ start_time: -1 });

  if (!shift) throw new NotFound("No open cashier shift found");

  const endTime = new Date();

  // 3) المبيعات بتاعة الشيفت ده فعلياً (بإستخدام shift_id + cashier_id)
  const salesAgg = await SaleModel.aggregate([
    {
      $match: {
        shift_id: shift._id,
        cashier_id: user._id,
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$grand_total" },
        ordersCount: { $sum: 1 },
      },
    },
  ]);

  const totalSales  = salesAgg[0]?.totalAmount || 0;
  const totalOrders = salesAgg[0]?.ordersCount || 0;

  // 4) مصروفات نفس الشيفت
  const expenses = await ExpenseModel.find({
    shift_id: shift._id,
    cashier_id: user._id,
  }).lean();

  const totalExpenses = expenses.reduce((sum, e: any) => sum + e.amount, 0);
  const netCashInDrawer = totalSales - totalExpenses;

  // 5) قفل الشيفت وتخزين الأرقام
  shift.end_time          = endTime;
  shift.status            = "closed";
  shift.total_sale_amount = totalSales;
  (shift as any).total_expenses     = totalExpenses;
  (shift as any).net_cash_in_drawer = netCashInDrawer;
  await shift.save();

  // 6) تجهيز الـ report
  const vodafoneCashTotal = expenses
    .filter((e: any) => e.name === "Vodafone Cash")
    .reduce((sum, e: any) => sum + e.amount, 0);

  const report = {
    financialSummary: {
      cash: {
        label: "Cash",
        amount: totalSales,
      },
      vodafoneCash: {
        label: "Vodafone Cash",
        amount: -vodafoneCashTotal,
      },
      netCashInDrawer,
    },
    ordersSummary: {
      totalOrders,
    },
    expenses: {
      rows: expenses.map((e: any, idx: number) => ({
        index: idx + 1,
        description: e.name,
        amount: -e.amount,
      })),
      total: totalExpenses,
    },
  };

  SuccessResponse(res, {
    message: "Cashier shift ended successfully",
    shift,
    report,
  });
};



export const endshiftcashier = async (req: Request, res: Response) => {
  const cashierman_id = req.user?.id;          // الكاشير مان من الـ JWT
  const warehouseId   = req.user?.warehouse_id;

  if (!cashierman_id) {
    throw new NotFound("Cashier user not found in token");
  }
  if (!warehouseId) {
    throw new NotFound("Warehouse ID is required");
  }

  // 🔎 نلاقي الشيفت المفتوح للكاشير مان ده
  const shift: any = await CashierShift.findOne({
    cashierman_id,
    status: "open",
  });

  if (!shift) {
    throw new NotFound("Cashier shift not found");
  }

  if (shift.end_time) {
    throw new BadRequest("Cashier shift already ended");
  }

  // 👈 ناخد cashier_id من الشيفت نفسه
  const cashier_id = shift.cashier_id;

  // ✅ نقفل الشيفت
  shift.end_time = new Date();
  shift.status   = "closed";
  await shift.save();

  // ✅ نرجّع الكاشير متاح تاني
  await CashierModel.updateOne(
    {
      _id: cashier_id,
      warehouse_id: warehouseId,
      status: true,
      cashier_active: true, // كان مستخدم في الشيفت ده
    },
    { $set: { cashier_active: false } }
  );

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