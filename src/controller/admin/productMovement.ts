import { Request, Response } from "express";
import { SaleModel, ProductSalesModel } from "../../models/schema/admin/POS/Sale";
import { PurchaseModel } from "../../models/schema/admin/Purchase";
import { PurchaseItemModel } from "../../models/schema/admin/purchase_item";
import { ProductModel } from "../../models/schema/admin/products";
import { SuccessResponse } from "../../utils/response";
import mongoose from "mongoose";

// ═══════════════════════════════════════════════════════════
// 📊 تقرير حركة المادة - Product Movement Report
// ═══════════════════════════════════════════════════════════
export const getProductMovement = async (req: Request, res: Response) => {
  const { product_id, start_date, end_date } = req.query as {
    product_id?: string;
    start_date?: string;
    end_date?: string;
  };

  if (!product_id || !mongoose.Types.ObjectId.isValid(product_id)) {
    return SuccessResponse(res, {
      message: "product_id is required",
      movements: [],
    });
  }

  if (!start_date || !end_date) {
    return SuccessResponse(res, {
      message: "start_date and end_date are required",
      movements: [],
    });
  }

  const productObjectId = new mongoose.Types.ObjectId(product_id);
  const startDateObj = new Date(start_date);
  startDateObj.setHours(0, 0, 0, 0);
  const endDateObj = new Date(end_date);
  endDateObj.setHours(23, 59, 59, 999);

  // ═══════════════════════════════════════════════════════════
  // 🛒 حركة البيع - Sales Movement (يوم بيوم)
  // ═══════════════════════════════════════════════════════════
  const completedSales = await SaleModel.find({
    order_pending: 0,
    createdAt: { $gte: startDateObj, $lte: endDateObj },
  })
    .select("_id")
    .lean();

  const saleIds = completedSales.map((s) => s._id);

  const salesByDay = await ProductSalesModel.aggregate([
    {
      $match: {
        sale_id: { $in: saleIds },
        product_id: productObjectId,
      },
    },
    {
      $lookup: {
        from: "sales",
        localField: "sale_id",
        foreignField: "_id",
        as: "sale",
      },
    },
    { $unwind: "$sale" },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$sale.createdAt" },
        },
        total_quantity: { $sum: "$quantity" },
        total_amount: { $sum: "$subtotal" },
        avg_price: { $avg: "$price" },
        transactions_count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // ═══════════════════════════════════════════════════════════
  // 📦 حركة الشراء - Purchase Movement (يوم بيوم)
  // ═══════════════════════════════════════════════════════════
  const purchasesByDay = await PurchaseItemModel.aggregate([
    {
      $match: {
        product_id: productObjectId,
        item_type: "product",
        createdAt: { $gte: startDateObj, $lte: endDateObj },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        total_quantity: { $sum: "$quantity" },
        total_amount: { $sum: "$subtotal" },
        avg_unit_cost: { $avg: "$unit_cost" },
        transactions_count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // ═══════════════════════════════════════════════════════════
  // 📅 تجميع يوم بيوم
  // ═══════════════════════════════════════════════════════════
  const salesMap = new Map(salesByDay.map((s) => [s._id, s]));
  const purchasesMap = new Map(purchasesByDay.map((p) => [p._id, p]));

  const allDates = new Set([...salesMap.keys(), ...purchasesMap.keys()]);
  const sortedDates = Array.from(allDates).sort();

  const movements = sortedDates.map((date) => {
    const sale = salesMap.get(date);
    const purchase = purchasesMap.get(date);

    return {
      date,
      sales: sale
        ? {
            quantity: sale.total_quantity,
            price: Number(sale.avg_price.toFixed(2)),
            total: Number(sale.total_amount.toFixed(2)),
            transactions_count: sale.transactions_count,
          }
        : { quantity: 0, price: 0, total: 0, transactions_count: 0 },
      purchases: purchase
        ? {
            quantity: purchase.total_quantity,
            unit_cost: Number(purchase.avg_unit_cost.toFixed(2)),
            total: Number(purchase.total_amount.toFixed(2)),
            transactions_count: purchase.transactions_count,
          }
        : { quantity: 0, unit_cost: 0, total: 0, transactions_count: 0 },
    };
  });

  // ═══════════════════════════════════════════════════════════
  // 📈 الإجماليات
  // ═══════════════════════════════════════════════════════════
  const totalSalesQty = movements.reduce((s, m) => s + m.sales.quantity, 0);
  const totalSalesAmount = movements.reduce((s, m) => s + m.sales.total, 0);
  const totalPurchasesQty = movements.reduce((s, m) => s + m.purchases.quantity, 0);
  const totalPurchasesAmount = movements.reduce((s, m) => s + m.purchases.total, 0);

  // جلب بيانات المنتج
  const product = await ProductModel.findById(productObjectId)
    .select("name ar_name code image price cost quantity")
    .lean();

  return SuccessResponse(res, {
    message: "Product movement report generated successfully",
    period: { start_date, end_date },
    product,
    summary: {
      total_sales: {
        quantity: totalSalesQty,
        amount: Number(totalSalesAmount.toFixed(2)),
      },
      total_purchases: {
        quantity: totalPurchasesQty,
        amount: Number(totalPurchasesAmount.toFixed(2)),
      },
    },
    movements,
  });
};

// ═══════════════════════════════════════════════════════════
// 🔽 بيانات السلكشن (قائمة المنتجات)
// ═══════════════════════════════════════════════════════════
export const selection = async (req: Request, res: Response) => {
  const products = await ProductModel.find().select("name ar_name code image").lean();
  return SuccessResponse(res, { products });
};
