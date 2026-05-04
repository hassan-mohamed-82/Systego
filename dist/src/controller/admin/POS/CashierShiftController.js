"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.getCashierUsers = exports.endshiftcashier = exports.endShiftWithReport = exports.startcashierShift = void 0;
const CashierShift_1 = require("../../../models/schema/admin/POS/CashierShift");
const Sale_1 = require("../../../models/schema/admin/POS/Sale");
const response_1 = require("../../../utils/response");
const Errors_1 = require("../../../Errors");
const BadRequest_1 = require("../../../Errors/BadRequest");
const User_1 = require("../../../models/schema/admin/User");
const position_1 = require("../../../models/schema/admin/position");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const expenses_1 = require("../../../models/schema/admin/POS/expenses");
const cashier_1 = require("../../../models/schema/admin/cashier");
const payment_1 = require("../../../models/schema/admin/POS/payment");
const Financial_Account_1 = require("../../../models/schema/admin/Financial_Account");
// import { Forbidden, BadRequest, NotFound } من الـ error handlers بتاعتك
const startcashierShift = async (req, res) => {
    const cashierman_id = req.user?.id;
    const warehouseId = req.user?.warehouse_id;
    const { cashier_id } = req.body;
    if (!cashierman_id)
        throw new Errors_1.NotFound("User not found");
    if (!warehouseId)
        throw new Errors_1.NotFound("Warehouse ID is required");
    // ✅ هل اليوزر عنده شيفت مفتوح؟
    const existingShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id,
        status: "open",
    });
    if (existingShift) {
        const cashierDoc = await cashier_1.CashierModel.findById(existingShift.cashier_id);
        return (0, response_1.SuccessResponse)(res, {
            message: "You already have an open shift",
            isExisting: true,
            shift: existingShift,
            cashier: cashierDoc,
        });
    }
    if (!cashier_id) {
        throw new BadRequest_1.BadRequest("Cashier ID is required");
    }
    // 🔥 check من الـ shift
    const busyShift = await CashierShift_1.CashierShift.findOne({
        cashier_id,
        status: "open",
    });
    if (busyShift) {
        throw new BadRequest_1.BadRequest("Cashier already has an open shift");
    }
    const cashierDoc = await cashier_1.CashierModel.findOne({
        _id: cashier_id,
        warehouse_id: warehouseId,
        status: true,
    });
    if (!cashierDoc) {
        throw new Errors_1.NotFound("Cashier not found");
    }
    // ✅ افتح الشيفت
    const cashierShift = await CashierShift_1.CashierShift.create({
        start_time: new Date(),
        cashierman_id,
        cashier_id,
        status: "open",
    });
    // ✅ بعد ما الشيفت اتفتح فعلًا
    await cashier_1.CashierModel.updateOne({ _id: cashier_id }, { $set: { cashier_active: true } });
    (0, response_1.SuccessResponse)(res, {
        message: "Cashier shift started successfully",
        shift: cashierShift,
        cashier: cashierDoc,
    });
};
exports.startcashierShift = startcashierShift;
const endShiftWithReport = async (req, res) => {
    const { password } = req.body;
    const jwtUser = req.user;
    if (!jwtUser)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const userId = jwtUser.id;
    // ✅ 1) تحقق من اليوزر والباسورد
    const user = await User_1.UserModel.findById(userId).select("+password_hash");
    if (!user)
        throw new Errors_1.NotFound("User not found");
    const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isMatch)
        throw new BadRequest_1.BadRequest("Wrong password");
    // ✅ 2) هات الشيفت المفتوح (source of truth)
    const shift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: user._id,
        status: "open",
    }).sort({ start_time: -1 });
    if (!shift)
        throw new Errors_1.NotFound("No open cashier shift found");
    // ✅ 3) تحديد تاريخ الفلترة (الأحدث بين بداية اليوم وبداية الشيفت)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const shiftStartTime = new Date(shift.start_time || Date.now());
    const filterFromDate = new Date(Math.max(shiftStartTime.getTime(), todayStart.getTime()));
    // ✅ 4) المبيعات
    const completedSales = await Sale_1.SaleModel.find({
        shift_id: shift._id,
        cashier_id: user._id,
        order_pending: 0,
        createdAt: { $gte: filterFromDate },
    })
        .select("_id grand_total")
        .lean();
    const totalSales = completedSales.reduce((sum, s) => sum + (s.grand_total || 0), 0);
    const totalOrders = completedSales.length;
    const saleIds = completedSales.map((s) => s._id);
    // ✅ 5) المدفوعات مجمعة حسب الحساب
    let paymentsByAccount = {};
    if (saleIds.length) {
        const paymentsAgg = await payment_1.PaymentModel.aggregate([
            { $match: { sale_id: { $in: saleIds } } },
            { $unwind: "$financials" },
            {
                $group: {
                    _id: "$financials.account_id",
                    totalAmount: { $sum: "$financials.amount" },
                },
            },
        ]);
        paymentsByAccount = paymentsAgg.reduce((acc, row) => {
            if (row._id)
                acc[row._id.toString()] = row.totalAmount;
            return acc;
        }, {});
    }
    // ✅ 6) المصروفات
    const expensesAgg = await expenses_1.ExpenseModel.aggregate([
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
    const expensesByAccount = expensesAgg.reduce((acc, row) => {
        if (row._id)
            acc[row._id.toString()] = row.totalAmount;
        return acc;
    }, {});
    const totalExpenses = Object.values(expensesByAccount).reduce((sum, v) => sum + v, 0);
    const netCashInDrawer = totalSales - totalExpenses;
    // ✅ 7) الحسابات المستخدمة
    const allAccountIds = [
        ...new Set([
            ...Object.keys(paymentsByAccount),
            ...Object.keys(expensesByAccount),
        ]),
    ];
    let accounts = [];
    if (allAccountIds.length) {
        accounts = await Financial_Account_1.BankAccountModel.find({
            _id: { $in: allAccountIds },
        })
            .select("name type")
            .lean();
    }
    const accountsMap = new Map(accounts.map((a) => [a._id.toString(), a]));
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
    const expenses = await expenses_1.ExpenseModel.find({
        shift_id: shift._id,
        cashier_id: user._id,
        createdAt: { $gte: filterFromDate },
    })
        .populate("financial_accountId", "name")
        .lean();
    const expensesRows = expenses.map((e, idx) => ({
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
    const shiftData = shift.toObject?.() || shift;
    return (0, response_1.SuccessResponse)(res, {
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
exports.endShiftWithReport = endShiftWithReport;
const endshiftcashier = async (req, res) => {
    const jwtUser = req.user;
    if (!jwtUser)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const cashierman_id = jwtUser.id;
    const shift = await CashierShift_1.CashierShift.findOne({
        cashierman_id,
        status: "open",
    }).sort({ start_time: -1 });
    if (!shift) {
        throw new Errors_1.NotFound("Cashier shift not found");
    }
    if (shift.end_time) {
        throw new BadRequest_1.BadRequest("Shift already ended");
    }
    // ✅ اقفل الشيفت
    shift.end_time = new Date();
    shift.status = "closed";
    await shift.save();
    // ✅ رجّع الكاشير متاح (بدون شروط تقفل التحديث)
    if (shift.cashier_id) {
        await cashier_1.CashierModel.updateOne({ _id: shift.cashier_id }, { $set: { cashier_active: false } });
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Cashier shift ended successfully",
        shift,
    });
};
exports.endshiftcashier = endshiftcashier;
const getCashierUsers = async (req, res) => {
    // 1️⃣ هات Position اللي اسمه Cashier
    const cashierPosition = await position_1.PositionModel.findOne({ name: "Cashier" });
    if (!cashierPosition) {
        throw new Errors_1.NotFound("Cashier position not found");
    }
    // 2️⃣ هات كل Users اللي positionId بتاعهم = ID بتاع Cashier
    const users = await User_1.UserModel.find({ positionId: cashierPosition._id })
        .select("-password_hash");
    // 3️⃣ رجّع الرد
    (0, response_1.SuccessResponse)(res, {
        message: "Cashier users fetched successfully",
        users,
    });
};
exports.getCashierUsers = getCashierUsers;
//logout for cashiershift without token invalidation
const logout = async (req, res) => {
    return (0, response_1.SuccessResponse)(res, {
        message: "Logged out successfully",
    });
};
exports.logout = logout;
