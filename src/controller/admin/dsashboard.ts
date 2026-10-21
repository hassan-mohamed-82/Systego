import { Request, Response } from "express";
import { SaleModel, ProductSalesModel } from "../../models/schema/admin/POS/Sale";
import { ExpenseModel } from "../../models/schema/admin/POS/expenses";
import { PaymentModel } from "../../models/schema/admin/POS/payment";
import { BankAccountModel } from "../../models/schema/admin/Financial_Account";
import { ReturnModel } from "../../models/schema/admin/POS/ReturnSale";
import { PurchaseModel } from "../../models/schema/admin/Purchase";
import { TransferModel } from "../../models/schema/admin/Transfer";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { ProductModel } from "../../models/schema/admin/products";
import { SuccessResponse } from "../../utils/response";
import { getTenantInfo } from "../../utils/tenantService";
import mongoose from "mongoose";
import {
  resolveBranchIds,
  getBranchAccountFilters,
} from "../../utils/reportFilters";

// ═══════════════════════════════════════════════════════════
// 📊 MAIN DASHBOARD API
// ═══════════════════════════════════════════════════════════
export const getDashboard = async (req: Request, res: Response) => {
  const { start_date, end_date } = req.query as {
    start_date?: string;
    end_date?: string;
  };

  // ═══════════════════════════════════════════════════════════
  // 📅 تحديد الفترة الزمنية
  // ═══════════════════════════════════════════════════════════
  let dateFilter: any = {};
  let startDateObj: Date;
  let endDateObj: Date;

  if (start_date && end_date) {
    startDateObj = new Date(start_date);
    endDateObj = new Date(new Date(end_date).setHours(23, 59, 59, 999));
    dateFilter.createdAt = { $gte: startDateObj, $lte: endDateObj };
  } else {
    // Default: آخر 30 يوم
    endDateObj = new Date();
    startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - 30);
    dateFilter.createdAt = { $gte: startDateObj, $lte: endDateObj };
  }

  // فلتر الفروع (الفرع = Warehouse)
  // يدعم اختيار فرع واحد أو أكتر، والفاضي = كل الفروع
  const branchIds = resolveBranchIds(req.query);
  const hasBranchFilter = branchIds.length > 0;
  const warehouseFilter: any = hasBranchFilter
    ? { warehouse_id: { $in: branchIds } }
    : {};

  // فلتر الحسابات البنكية للفروع المختارة (بعدين بيتطبق على المصروفات وطرق الدفع)
  const { accountFilter, paymentAccountFilter } =
    await getBranchAccountFilters(branchIds);

  // ═══════════════════════════════════════════════════════════
  // 📈 CARDS DATA
  // ═══════════════════════════════════════════════════════════

  // 1️⃣ Total Sales Today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaySales = await SaleModel.aggregate([
    {
      $match: {
        createdAt: { $gte: todayStart, $lte: todayEnd },
        order_pending: 0,
        ...warehouseFilter,
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$grand_total" },
        ordersCount: { $sum: 1 },
      },
    },
  ]);

  const totalSalesToday = todaySales[0]?.totalSales || 0;
  const ordersToday = todaySales[0]?.ordersCount || 0;

  // 2️⃣ Total Sales (للفترة المحددة)
  const periodSales = await SaleModel.aggregate([
    {
      $match: {
        ...dateFilter,
        order_pending: 0,
        ...warehouseFilter,
      },
    },
    {
      $group: {
        _id: null,
        totalBeforeDiscount: { $sum: "$total" },
        totalSales: { $sum: "$grand_total" },
        totalDiscount: { $sum: "$discount" },
        totalTax: { $sum: "$tax_amount" },
        ordersCount: { $sum: 1 },
      },
    },
  ]);

  const totalBeforeDiscount = periodSales[0]?.totalBeforeDiscount || 0;
  const totalSales = periodSales[0]?.totalSales || 0;
  const totalDiscount = periodSales[0]?.totalDiscount || 0;
  const totalTax = periodSales[0]?.totalTax || 0;
  const totalOrders = periodSales[0]?.ordersCount || 0;

  // 3️⃣ Total Returns
  const periodReturns = await ReturnModel.aggregate([
    {
      $match: {
        ...dateFilter,
        ...warehouseFilter,
      },
    },
    {
      $group: {
        _id: null,
        totalReturns: { $sum: "$total_amount" },
        returnsCount: { $sum: 1 },
      },
    },
  ]);

  const totalReturns = periodReturns[0]?.totalReturns || 0;
  const returnsCount = periodReturns[0]?.returnsCount || 0;

  // 4️⃣ Net Revenue = grand_total (المبلغ النهائي) - المرتجعات
  const netRevenue = totalSales - totalReturns;

  // 5️⃣ Total Expenses
  const periodExpenses = await ExpenseModel.aggregate([
    {
      $match: {
        ...dateFilter,
        ...accountFilter,
      },
    },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: "$amount" },
        expensesCount: { $sum: 1 },
      },
    },
  ]);

  const totalExpenses = periodExpenses[0]?.totalExpenses || 0;

  // 6️⃣ Net Profit = Net Revenue - Expenses
  const netProfit = netRevenue - totalExpenses;

  // ═══════════════════════════════════════════════════════════
  // 📊 CHARTS DATA
  // ═══════════════════════════════════════════════════════════

  // 1️⃣ Sales Trend (Line Chart)
  const salesTrend = await SaleModel.aggregate([
    {
      $match: {
        ...dateFilter,
        order_pending: 0,
        ...warehouseFilter,
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        sales: { $sum: "$grand_total" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        sales: { $round: ["$sales", 2] },
        orders: 1,
      },
    },
  ]);

  // 2️⃣ Sales by Payment Methods (Pie Chart)
  const salesByPaymentMethod = await PaymentModel.aggregate([
    {
      $match: {
        ...dateFilter,
        status: "completed",
        ...paymentAccountFilter,
      },
    },
    { $unwind: "$financials" },
    {
      $group: {
        _id: "$financials.account_id",
        total: { $sum: "$financials.amount" },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "bankaccounts",
        localField: "_id",
        foreignField: "_id",
        as: "account",
      },
    },
    { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        account_id: "$_id",
        account_name: { $ifNull: ["$account.name", "Unknown"] },
        total: { $round: ["$total", 2] },
        count: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  // 3️⃣ Revenue vs Expenses (Combo Chart - Monthly)
  const revenueVsExpenses = await SaleModel.aggregate([
    {
      $match: {
        ...dateFilter,
        order_pending: 0,
        ...warehouseFilter,
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        revenue: { $sum: "$grand_total" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const expensesByMonth = await ExpenseModel.aggregate([
    {
      $match: dateFilter,
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        expenses: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // دمج البيانات
  const expensesMap: Record<string, number> = {};
  expensesByMonth.forEach((e) => {
    expensesMap[e._id] = e.expenses;
  });

  const revenueVsExpensesChart = revenueVsExpenses.map((r) => ({
    month: r._id,
    revenue: Number(r.revenue.toFixed(2)),
    expenses: Number((expensesMap[r._id] || 0).toFixed(2)),
    profit: Number((r.revenue - (expensesMap[r._id] || 0)).toFixed(2)),
  }));

  // 4️⃣ Restock Over Time (Line Chart - Purchases)
  const restockTrend = await PurchaseModel.aggregate([
    {
      $match: {
        ...dateFilter,
        ...warehouseFilter,
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        amount: { $sum: "$grand_total" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        amount: { $round: ["$amount", 2] },
        count: 1,
      },
    },
  ]);

  // 5️⃣ Transfer Activity (Heatmap)
  // Transfer schema uses `date` field instead of `createdAt`
  const transferDateFilter: any = {};
  if (dateFilter.createdAt) {
    transferDateFilter.date = dateFilter.createdAt;
  }

  const transferActivity = await TransferModel.aggregate([
    {
      $match: {
        ...transferDateFilter,
        status: "received",
        // لو في فلتر فروع: التحويلات اللي ليها علاقة بالفروع المختارة (منها أو لها)
        ...(hasBranchFilter
          ? {
              $or: [
                { fromWarehouseId: { $in: branchIds } },
                { toWarehouseId: { $in: branchIds } },
              ],
            }
          : {}),
      },
    },
    {
      $unwind: "$products",
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          fromWarehouse: "$fromWarehouseId",
          toWarehouse: "$toWarehouseId",
        },
        totalQuantity: { $sum: "$products.quantity" },
        transfersCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "warehouses",
        localField: "_id.fromWarehouse",
        foreignField: "_id",
        as: "fromWarehouseData",
      },
    },
    {
      $lookup: {
        from: "warehouses",
        localField: "_id.toWarehouse",
        foreignField: "_id",
        as: "toWarehouseData",
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id.date",
        fromWarehouse: {
          _id: "$_id.fromWarehouse",
          name: { $arrayElemAt: ["$fromWarehouseData.name", 0] },
        },
        toWarehouse: {
          _id: "$_id.toWarehouse",
          name: { $arrayElemAt: ["$toWarehouseData.name", 0] },
        },
        totalQuantity: 1,
        transfersCount: 1,
      },
    },
    { $sort: { date: 1 } },
  ]);

  // 6️⃣ Stock Value by Warehouse (Bar Chart)
  const stockByWarehouse = await Product_WarehouseModel.aggregate([
    {
      $match: {
        quantity: { $gt: 0 },
        // اسم الحقل هنا warehouseId وليس warehouse_id
        ...(hasBranchFilter ? { warehouseId: { $in: branchIds } } : {}),
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$warehouseId",
        totalQuantity: { $sum: "$quantity" },
        totalValue: {
          $sum: {
            $multiply: ["$quantity", { $ifNull: ["$product.cost", "$product.price"] }],
          },
        },
        productsCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "warehouses",
        localField: "_id",
        foreignField: "_id",
        as: "warehouse",
      },
    },
    { $unwind: { path: "$warehouse", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        warehouse_id: "$_id",
        warehouse_name: { $ifNull: ["$warehouse.name", "Unknown"] },
        totalQuantity: 1,
        totalValue: { $round: ["$totalValue", 2] },
        productsCount: 1,
      },
    },
    { $sort: { totalValue: -1 } },
  ]);

  // ═══════════════════════════════════════════════════════════
  // 🔑 SUBSCRIPTION PLAN INFO
  // ═══════════════════════════════════════════════════════════
  let subscription: any = null;
  try {
    const tenantInfo = await getTenantInfo();
    subscription = {
      plan_name: tenantInfo.package?.name || null,
      is_active: tenantInfo.package?.status || false,
      features: tenantInfo.features,
    };
  } catch (error) {
    // لو مش متوفر، نرجع null
    subscription = null;
  }

  // ═══════════════════════════════════════════════════════════
  // 🌿 BRANCHES LIST (للـ filter dropdown في الفرونت)
  // ═══════════════════════════════════════════════════════════
  const branches = await WarehouseModel.find({ enabled: true })
    .select("name ar_name address Is_Online enabled")
    .sort({ createdAt: 1 })
    .lean();

  // ═══════════════════════════════════════════════════════════
  // 📤 RESPONSE
  // ═══════════════════════════════════════════════════════════
  return SuccessResponse(res, {
    message: "Dashboard data retrieved successfully",
    period: {
      start_date: startDateObj.toISOString().split("T")[0],
      end_date: endDateObj.toISOString().split("T")[0],
    },

    // الفروع المتاحة للفلترة (branch = warehouse)
    branches,

    // الفلتر المطبق حالياً (مصفوفة فاضية = كل الفروع)
    filters: {
      warehouse_ids: branchIds.map((id) => id.toString()),
    },

    // ═══════════════════════════════════════════════════════════
    // 🔑 SUBSCRIPTION
    // ═══════════════════════════════════════════════════════════
    subscription,

    // ═══════════════════════════════════════════════════════════
    // 📈 CARDS
    // ═══════════════════════════════════════════════════════════
    cards: {
      total_sales_today: Number(totalSalesToday.toFixed(2)),
      orders_today: ordersToday,

      total_before_discount: Number(totalBeforeDiscount.toFixed(2)),
      total_sales: Number(totalSales.toFixed(2)),
      total_discount: Number(totalDiscount.toFixed(2)),
      total_tax: Number(totalTax.toFixed(2)),
      total_returns: Number(totalReturns.toFixed(2)),
      returns_count: returnsCount,

      net_revenue: Number(netRevenue.toFixed(2)),
      total_expenses: Number(totalExpenses.toFixed(2)),
      net_profit: Number(netProfit.toFixed(2)),

      total_orders: totalOrders,
    },

    // ═══════════════════════════════════════════════════════════
    // 📊 CHARTS
    // ═══════════════════════════════════════════════════════════
    charts: {
      // 1️⃣ Sales Trend (Line Chart)
      sales_trend: salesTrend,

      // 2️⃣ Sales by Payment Method (Pie Chart)
      sales_by_payment_method: salesByPaymentMethod,

      // 3️⃣ Revenue vs Expenses (Combo Chart)
      revenue_vs_expenses: revenueVsExpensesChart,

      // 4️⃣ Restock Over Time (Line Chart)
      restock_trend: restockTrend,

      // 5️⃣ Transfer Activity (Heatmap)
      transfer_activity: transferActivity,

      // 6️⃣ Stock Value by Warehouse (Bar Chart)
      stock_by_warehouse: stockByWarehouse,
    },
  });
};

// ═══════════════════════════════════════════════════════════
// 📊 QUICK STATS (للـ Header أو Summary سريع)
// ═══════════════════════════════════════════════════════════
export const getQuickStats = async (req: Request, res: Response) => {
  // فلتر الفروع (اختياري) — نفس منطق الداشبورد الرئيسي
  const branchIds = resolveBranchIds(req.query);
  const warehouseFilter: any =
    branchIds.length > 0 ? { warehouse_id: { $in: branchIds } } : {};
  const { accountFilter } = await getBranchAccountFilters(branchIds);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // مبيعات اليوم
  const todaySales = await SaleModel.aggregate([
    {
      $match: {
        createdAt: { $gte: todayStart, $lte: todayEnd },
        order_pending: 0,
        ...warehouseFilter,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$grand_total" },
        count: { $sum: 1 },
      },
    },
  ]);

  // مصروفات اليوم
  const todayExpenses = await ExpenseModel.aggregate([
    {
      $match: {
        createdAt: { $gte: todayStart, $lte: todayEnd },
        ...accountFilter,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  // أوردرات معلقة
  const pendingOrders = await SaleModel.countDocuments({
    order_pending: 1,
    ...warehouseFilter,
  });

  // ديون العملاء
  const totalDue = await SaleModel.aggregate([
    {
      $match: {
        Due: 1,
        remaining_amount: { $gt: 0 },
        ...warehouseFilter,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$remaining_amount" },
      },
    },
  ]);

  return SuccessResponse(res, {
    today_sales: Number((todaySales[0]?.total || 0).toFixed(2)),
    today_orders: todaySales[0]?.count || 0,
    today_expenses: Number((todayExpenses[0]?.total || 0).toFixed(2)),
    pending_orders: pendingOrders,
    total_customer_due: Number((totalDue[0]?.total || 0).toFixed(2)),
  });
};