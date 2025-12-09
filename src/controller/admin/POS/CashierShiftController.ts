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
  const { shiftId } = req.params;
  const { password } = req.body;
  const userId = req.user?.id;        // من الـ JWT

 const user = await UserModel.findById(userId).select("+password_hash +role +positionId");
  if (!user) throw new NotFound("User not found");

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new BadRequest("Wrong password");


  // 3) هات الشيفت المفتوح
  const shift = await CashierShift.findOne({
    _id: shiftId,
    cashier_id: user._id,
    status: "open",
  });

  if (!shift) throw new NotFound("Open cashier shift not found");

  const endTime = new Date();

  // 4) المبيعات خلال الشيفت ده (باستخدام الوقت)
  const salesAgg = await SaleModel.aggregate([
    {
      $match: {
        createdAt: { $gte: shift.start_time, $lte: endTime },
        // لو عايز تربطها بفرع أو حاجة معينة زود شروط هنا
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

  const totalSales = salesAgg[0]?.totalAmount || 0;
  const totalOrders = salesAgg[0]?.ordersCount || 0;

  // 5) المصروفات خلال نفس الفترة
  const expenses = await ExpenseModel.find({
    createdAt: { $gte: shift.start_time, $lte: endTime },
    // لو حابب تربط بالـ financial_accountId أو غيره، زوّد شرط هنا
  }).lean();

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const netCashInDrawer = totalSales - totalExpenses;

  // 6) حدّث بيانات الشيفت
  shift.end_time = endTime;
  shift.status = "closed";
  shift.total_sale_amount = totalSales;
  shift.total_expenses = totalExpenses;
  shift.net_cash_in_drawer = netCashInDrawer;
  await shift.save();

  // 7) جهّز report شبه اللي في الصور
  const report = {
    financialSummary: {
      cash: {
        label: "Cash",
        amount: totalSales,          // مثال: 7677.34
      },
      // هنا بعرض إجمالي المصروفات كـ رقم سالب زي Vodafone Cash في الصورة
      expensesLine: {
        label: "Expenses",
        amount: -totalExpenses,      // مثال: -200.00
      },
      netCashInDrawer,              // 7477.34
    },
    ordersSummary: {
      totalOrders,                  // Orders: 1
    },
    expenses: {
      rows: expenses.map((e, idx) => ({
        index: idx + 1,
        description: e.name,        // "Vodafone Cash"
        amount: -e.amount,          // -200.00 في الجدول
      })),
      total: totalExpenses,         // 200.00
    },
  };

  SuccessResponse(res, {
    message: "Cashier shift ended successfully",
    shift,
    report,
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


export const endshiftcashier = async (req: Request, res: Response) => {
  const cashier_id = req.user?.id; // من الـ JWT

  // ✅ نستخدم findOne بفلتر على cashier_id + status
  const shift = await CashierShift.findOne({
    cashier_id: cashier_id,
    status: 'open',
  });

  if (!shift) {
    throw new NotFound("Cashier shift not found");
  }

  if (shift.end_time) {
    throw new BadRequest("Cashier shift already ended");
  }

  shift.end_time = new Date();
  shift.status = 'closed';

  await shift.save();

  SuccessResponse(res, {
    message: "Cashier shift ended successfully",
    shift,
  });
};
