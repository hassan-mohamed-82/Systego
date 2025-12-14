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
  // ممكن تضيف فلاتر من query لو حبيت (status, cashierman_id, ...إلخ)
  const { status, cashierman_id, cashier_id } = req.query as any;

  const filter: any = {};
  if (status) filter.status = status;                // "open" أو "closed"
  if (cashierman_id) filter.cashierman_id = cashierman_id;
  if (cashier_id) filter.cashier_id = cashier_id;

  const shifts = await CashierShift.find(filter)
    .populate("cashierman_id", "username email role")   // اليوزر
    .populate("cashier_id", "name code")               // الكاشير (الدراج)
    .sort({ start_time: -1 })
    .lean();

  return SuccessResponse(res, {
    message: "Cashier shifts fetched successfully",
    shifts,
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

  // 2) كل المبيعات في الشيفت ده (Pending + Completed)
  const sales = await SaleModel.find({
    shift_id: shift._id,
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
  })
    .populate("Category_id", "name")
    .populate("financial_accountId", "name")
    .lean();

  // 5) Summary (لو حابب تحسب من الداتا مش من قيم الشيفت المخزّنة)
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

  return SuccessResponse(res, {
    message: "Cashier shift details fetched successfully",
    shift,
    summary,
    sales: salesWithItems,
    expenses,
  });
};