import {Request, Response} from 'express';
import { CashierShift } from '../../models/schema/admin/POS/CashierShift';
import { ProductSalesModel, SaleModel } from '../../models/schema/admin/POS/Sale';
import { SuccessResponse } from '../../utils/response';
import { NotFound } from '../../Errors';
import { BadRequest } from '../../Errors/BadRequest';
import { UserModel } from '../../models/schema/admin/User';
import { ExpenseModel } from '../../models/schema/admin/POS/expenses';
import mongoose from 'mongoose';


export const getAllCashierShifts = async (req: Request, res: Response) => {
  const { status, cashierman_id, cashier_id } = req.query as any;

  const filter: any = {};
  if (status) filter.status = status;
  if (cashierman_id) filter.cashierman_id = cashierman_id;
  if (cashier_id) filter.cashier_id = cashier_id;

  const shifts = await CashierShift.find(filter)
    .populate("cashierman_id", "username email role")
    .populate("cashier_id", "name code")
    .sort({ start_time: -1 })
    .lean();

  // ✅ حساب القيم لكل شيفت
  const shiftsWithTotals = await Promise.all(
    shifts.map(async (shift: any) => {
      const shiftStartTime = new Date(shift.start_time || Date.now());

      // مبيعات الشيفت
      const sales = await SaleModel.find({
        shift_id: shift._id,
        order_pending: 0,
        createdAt: { $gte: shiftStartTime },
      })
        .select("grand_total")
        .lean();

      // مصروفات الشيفت
      const expenses = await ExpenseModel.find({
        shift_id: shift._id,
        createdAt: { $gte: shiftStartTime },
      })
        .select("amount")
        .lean();

      const totalSales = sales.reduce(
        (sum, s: any) => sum + (s.grand_total || 0),
        0
      );
      const totalExpenses = expenses.reduce(
        (sum, e: any) => sum + (e.amount || 0),
        0
      );
      const netCashInDrawer = totalSales - totalExpenses;

      return {
        ...shift,
        total_sale_amount: totalSales,
        total_expenses: totalExpenses,
        net_cash_in_drawer: netCashInDrawer,
        orders_count: sales.length,
      };
    })
  );

  return SuccessResponse(res, {
    message: "Cashier shifts fetched successfully",
    shifts: shiftsWithTotals,
  });
};


export const getCashierShiftDetails = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid shift id");
  }

  // 1) هات الشيفت مع بيانات اليوزر و الكاشير
  const shift = await CashierShift.findById(id)
    .populate("cashierman_id", "username email role")
    .populate("cashier_id", "name code")
    .lean();

  if (!shift) {
    throw new NotFound("Cashier shift not found");
  }

  // ✅ حساب الـ filterFromDate
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const shiftStartTime = new Date(shift.start_time || Date.now());
  const filterFromDate = shiftStartTime > todayStart ? shiftStartTime : todayStart;

  // 2) كل المبيعات في الشيفت ده
  const sales = await SaleModel.find({
    shift_id: shift._id,
    order_pending: 0,
    createdAt: { $gte: shiftStartTime },
  })
    .populate("customer_id", "name email phone_number")
    .populate("warehouse_id", "name location")
    .populate("order_tax", "name rate")
    .populate("order_discount", "name rate")
    .populate("coupon_id", "code discount_amount")
    .populate("gift_card_id", "code amount")
    .lean();

  const saleIds = sales.map((s) => s._id);

  let salesWithItems = sales;
  if (saleIds.length > 0) {
    const items = await ProductSalesModel.find({
      sale_id: { $in: saleIds },
    })
      .populate("product_id", "name ar_name image price")
      .populate("product_price_id", "price code")
      .populate("bundle_id", "name price")
      .lean();

    const itemsBySaleId: Record<string, any[]> = {};
    for (const item of items) {
      const key = item.sale_id.toString();
      if (!itemsBySaleId[key]) itemsBySaleId[key] = [];
      itemsBySaleId[key].push(item);
    }

    salesWithItems = sales.map((s) => ({
      ...s,
      items: itemsBySaleId[s._id.toString()] || [],
    }));
  }

  // 4) مصروفات الشيفت
  const expenses = await ExpenseModel.find({
    shift_id: shift._id,
    createdAt: { $gte: shiftStartTime },
  })
    .populate("Category_id", "name")
    .populate("financial_accountId", "name")
    .lean();

  // 5) Summary محسوب من الداتا
  const totalSales = sales.reduce(
    (sum, s: any) => sum + (s.grand_total || 0),
    0
  );
  const totalExpenses = expenses.reduce(
    (sum, e: any) => sum + (e.amount || 0),
    0
  );
  const netCashInDrawer = totalSales - totalExpenses;

  const summary = {
    totalSales,
    totalExpenses,
    netCashInDrawer,
    ordersCount: sales.length,
  };

  // ✅ رجع الشيفت بالقيم المحسوبة
  return SuccessResponse(res, {
    message: "Cashier shift details fetched successfully",
    shift: {
      ...shift,
      total_sale_amount: totalSales,
      total_expenses: totalExpenses,
      net_cash_in_drawer: netCashInDrawer,
    },
    summary,
    sales: salesWithItems,
    expenses,
  });
};