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

// import { Forbidden, BadRequest, NotFound } من الـ error handlers بتاعتك

export const startcashierShift = async (req: Request, res: Response)=> {
  const cashier_id = req.user?.id; // من الـ JWT
    
  const cashier = await UserModel.findById(cashier_id);
  if (!cashier) {
    throw new NotFound("Cashier not found");
  }

  // (اختياري لكن مهم) امنع تكرار شيفت مفتوح لنفس الكاشير
  const existingShift = await CashierShift.findOne({
    cashier_id: cashier._id,
    status: "open",
  });
  if (existingShift) {
    throw new BadRequest("Cashier already has an open shift");
  }

  const cashierShift = new CashierShift({
    start_time: new Date(),
    cashier_id: cashier._id,
    status: 'open'
  });

  const savedShift = await cashierShift.save();

  SuccessResponse(res, { 
    message: "Cashier shift started successfully", 
    shift: savedShift
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
  const cashier_id = req.user?.id; // من الـ JWT
  if (!cashier_id) throw new UnauthorizedError("Unauthorized");

  const shift = await CashierShift.findOne({
    cashier_id,
    status: "open",
  });

  if (!shift) {
    throw new NotFound("Cashier shift not found");
  }

  if (shift.end_time) {
    throw new BadRequest("Cashier shift already ended");
  }

  shift.end_time = new Date();
  shift.status = "closed";
  await shift.save();

  // 🧨 هنا بنبطل كل التوكنز القديمة للكاشير ده
  await UserModel.findByIdAndUpdate(cashier_id, {
    $inc: { tokenVersion: 1 },
  });

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