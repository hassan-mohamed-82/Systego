import { Request, Response } from "express";
import { SaleModel, ProductSalesModel } from "../../models/schema/admin/POS/Sale";
import { ExpenseModel } from "../../models/schema/admin/POS/expenses";
import { PaymentModel } from "../../models/schema/admin/POS/payment";
import { BankAccountModel } from "../../models/schema/admin/Financial_Account";
import { SuccessResponse } from "../../utils/response";
import { catchAsync } from "../../utils/catchAsync";
import mongoose from "mongoose";
import {
    resolveBranchIdsForUser,
    resolvePosIds,
    resolvePosShiftIds,
    buildBranchFilter,
    buildPosShiftFilter,
    getBranchAccountFilters,
} from "../../utils/reportFilters";

// ═══════════════════════════════════════════════════════════
// 📊 FINANCIAL REPORT
// ═══════════════════════════════════════════════════════════
export const getFinancialReport = catchAsync(async (req: Request, res: Response) => {
    const {
        start_date,
        end_date,
    } = req.query as {
        start_date?: string;
        end_date?: string;
    };

    // ═══════════════════════════════════════════════════════════
    // 📅 تحديد الفترة الزمنية
    // ═══════════════════════════════════════════════════════════
    let dateFilter: any = {};

    if (start_date && end_date) {
        dateFilter = {
            createdAt: {
                $gte: new Date(start_date),
                $lte: new Date(new Date(end_date).setHours(23, 59, 59, 999)),
            },
        };
    } else if (start_date) {
        dateFilter = {
            createdAt: { $gte: new Date(start_date) },
        };
    } else if (end_date) {
        dateFilter = {
            createdAt: { $lte: new Date(new Date(end_date).setHours(23, 59, 59, 999)) },
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 🌿 فلاتر الفروع (Warehouse) ونقاط البيع (POS = Cashier)
    // ═══════════════════════════════════════════════════════════
    const branchIds = resolveBranchIdsForUser(req.query, req.user);
    const posIds = resolvePosIds(req.query);
    const shiftIds = await resolvePosShiftIds(posIds);

    // المصروفات بتتسجل على الحساب البنكي المربوط بالفرع
    const { accountFilter } = await getBranchAccountFilters(branchIds);

    let salesFilter: any = {
        ...dateFilter,
        ...buildBranchFilter(branchIds),
        ...buildPosShiftFilter(shiftIds),
    };

    let expensesFilter: any = {
        ...dateFilter,
        ...accountFilter,
        ...buildPosShiftFilter(shiftIds),
    };

    // ═══════════════════════════════════════════════════════════
    // 📈 1. إحصائيات المبيعات
    // ═══════════════════════════════════════════════════════════
    const completedSalesFilter = { ...salesFilter, order_pending: 0 };

    const salesStats = await SaleModel.aggregate([
        { $match: completedSalesFilter },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$grand_total" },
                totalTax: { $sum: "$tax_amount" },
                totalDiscount: { $sum: "$discount" },
                totalShipping: { $sum: "$shipping" },
                totalPaid: { $sum: "$paid_amount" },
            },
        },
    ]);

    const salesData = salesStats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        totalTax: 0,
        totalDiscount: 0,
        totalShipping: 0,
        totalPaid: 0,
    };

    // ═══════════════════════════════════════════════════════════
    // 💰 2. إحصائيات الديون (Due)
    // ═══════════════════════════════════════════════════════════
    const dueStats = await SaleModel.aggregate([
        {
            $match: {
                ...completedSalesFilter,
                Due: 1,
                remaining_amount: { $gt: 0 }
            }
        },
        {
            $group: {
                _id: null,
                totalDueOrders: { $sum: 1 },
                totalDueAmount: { $sum: "$remaining_amount" },
            },
        },
    ]);

    const dueData = dueStats[0] || {
        totalDueOrders: 0,
        totalDueAmount: 0,
    };

    // ═══════════════════════════════════════════════════════════
    // 🕐 3. الأوردرات المعلقة (Pending)
    // ═══════════════════════════════════════════════════════════
    const pendingStats = await SaleModel.aggregate([
        { $match: { ...salesFilter, order_pending: 1 } },
        {
            $group: {
                _id: null,
                totalPendingOrders: { $sum: 1 },
                totalPendingValue: { $sum: "$grand_total" },
            },
        },
    ]);

    const pendingData = pendingStats[0] || {
        totalPendingOrders: 0,
        totalPendingValue: 0,
    };

    // ═══════════════════════════════════════════════════════════
    // 💸 4. إحصائيات المصروفات
    // ═══════════════════════════════════════════════════════════
    const expensesStats = await ExpenseModel.aggregate([
        { $match: expensesFilter },
        {
            $group: {
                _id: null,
                totalExpenses: { $sum: "$amount" },
                expensesCount: { $sum: 1 },
            },
        },
    ]);

    const expensesData = expensesStats[0] || {
        totalExpenses: 0,
        expensesCount: 0,
    };

    // ═══════════════════════════════════════════════════════════
    const expensesDetailsByAccount = await ExpenseModel.aggregate([
        { $match: expensesFilter },
        {
            $lookup: {
                from: "bankaccounts",
                localField: "financial_accountId",
                foreignField: "_id",
                as: "account",
            },
        },
        { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: "$financial_accountId",
                account_name: { $first: "$account.name" },
                total_amount: { $sum: "$amount" },
                expenses: {
                    $push: {
                        name: "$name",
                        amount: "$amount",
                        note: "$note",
                        date: "$createdAt",
                    },
                },
            },
        },
    ]);

    const expensesMapDetails: Record<string, any[]> = {};
    expensesDetailsByAccount.forEach((item: any) => {
        if (item._id) {
            expensesMapDetails[item._id.toString()] = item.expenses;
        }
    });

    // المدفوعات حسب الحساب
    // فلتر الفرع/الـ POS بيتطبق على الفاتورة المرتبطة بالدفع (Payment.sale_id)
    const paymentPipeline: any[] = [
        {
            $match: {
                ...dateFilter,
                status: "completed",
            },
        },
    ];

    if (branchIds.length > 0 || shiftIds !== null) {
        paymentPipeline.push(
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
                $match: {
                    ...(branchIds.length > 0
                        ? { "sale.warehouse_id": { $in: branchIds } }
                        : {}),
                    ...(shiftIds !== null
                        ? { "sale.shift_id": { $in: shiftIds } }
                        : {}),
                },
            },
        );
    }

    paymentPipeline.push(
        { $unwind: "$financials" },
        {
            $group: {
                _id: "$financials.account_id",
                totalReceived: { $sum: "$financials.amount" },
                transactionsCount: { $sum: 1 },
            },
        },
    );

    const paymentsByAccount = await PaymentModel.aggregate(paymentPipeline);

    // المصروفات حسب الحساب
    const expensesByAccount = await ExpenseModel.aggregate([
        { $match: expensesFilter },
        {
            $group: {
                _id: "$financial_accountId",
                totalSpent: { $sum: "$amount" },
                expensesCount: { $sum: 1 },
            },
        },
    ]);

    // جمع كل الـ Account IDs
    const allAccountIds = [
        ...new Set([
            ...paymentsByAccount.map((p) => p._id?.toString()).filter(Boolean),
            ...expensesByAccount.map((e) => e._id?.toString()).filter(Boolean),
        ]),
    ];

    // جلب بيانات الحسابات
    let financialAccountsDetails: any[] = [];

    if (allAccountIds.length > 0) {
        const accounts = await BankAccountModel.find({
            _id: { $in: allAccountIds },
        }).select("name balance").lean();

        const accountsMap: Record<string, any> = {};
        accounts.forEach((acc: any) => {
            accountsMap[acc._id.toString()] = acc;
        });

        financialAccountsDetails = allAccountIds.map((accId) => {
            const account = accountsMap[accId] || { name: "Unknown", balance: 0 };
            const payments = paymentsByAccount.find((p) => p._id?.toString() === accId);
            const expenses = expensesByAccount.find((e) => e._id?.toString() === accId);

            const totalReceived = payments?.totalReceived || 0;
            const totalSpent = expenses?.totalSpent || 0;
            const netTotal = totalReceived - totalSpent;

            return {
                account_id: accId,
                account_name: account.name,
                current_balance: account.balance,
                total_received: Number(totalReceived.toFixed(2)),
                total_spent: Number(totalSpent.toFixed(2)),
                net_total: Number(netTotal.toFixed(2)),
                transactions_count: payments?.transactionsCount || 0,
                expenses_count: expenses?.expensesCount || 0,
                detailed_expenses: expensesMapDetails[accId] || [],
            };
        });
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 7. حساب صافي الربح
    // ═══════════════════════════════════════════════════════════
    const netProfit = salesData.totalRevenue - expensesData.totalExpenses;

    // ═══════════════════════════════════════════════════════════
    // 📤 Response
    // ═══════════════════════════════════════════════════════════
    return SuccessResponse(res, {
        message: "Financial report generated successfully",
        period: {
            start_date: start_date || "All time",
            end_date: end_date || "All time",
        },

        summary: {
            total_orders: salesData.totalOrders,
            total_revenue: Number(salesData.totalRevenue.toFixed(2)),
            total_expenses: Number(expensesData.totalExpenses.toFixed(2)),
            net_profit: Number(netProfit.toFixed(2)),
            total_tax: Number(salesData.totalTax.toFixed(2)),
            total_discount: Number(salesData.totalDiscount.toFixed(2)),
            total_shipping: Number(salesData.totalShipping.toFixed(2)),
        },

        due_summary: {
            total_due_orders: dueData.totalDueOrders,
            total_due_amount: Number(dueData.totalDueAmount.toFixed(2)),
        },

        pending_summary: {
            total_pending_orders: pendingData.totalPendingOrders,
            total_pending_value: Number(pendingData.totalPendingValue.toFixed(2)),
        },

        financial_accounts: financialAccountsDetails,
    });
});

