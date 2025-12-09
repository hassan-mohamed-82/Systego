"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.endshiftcashier = exports.getCashierUsers = exports.endShiftWithReport = exports.startcashierShift = void 0;
const CashierShift_1 = require("../../../models/schema/admin/POS/CashierShift");
const Sale_1 = require("../../../models/schema/admin/POS/Sale");
const response_1 = require("../../../utils/response");
const Errors_1 = require("../../../Errors");
const BadRequest_1 = require("../../../Errors/BadRequest");
const User_1 = require("../../../models/schema/admin/User");
const position_1 = require("../../../models/schema/admin/position");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const expenses_1 = require("../../../models/schema/admin/POS/expenses");
// import { Forbidden, BadRequest, NotFound } من الـ error handlers بتاعتك
const startcashierShift = async (req, res) => {
    const cashier_id = req.user?.id; // من الـ JWT
    const cashier = await User_1.UserModel.findById(cashier_id);
    if (!cashier) {
        throw new Errors_1.NotFound("Cashier not found");
    }
    // (اختياري لكن مهم) امنع تكرار شيفت مفتوح لنفس الكاشير
    const existingShift = await CashierShift_1.CashierShift.findOne({
        cashier_id: cashier._id,
        status: "open",
    });
    if (existingShift) {
        throw new BadRequest_1.BadRequest("Cashier already has an open shift");
    }
    const cashierShift = new CashierShift_1.CashierShift({
        start_time: new Date(),
        cashier_id: cashier._id,
        status: 'open'
    });
    const savedShift = await cashierShift.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Cashier shift started successfully",
        shift: savedShift
    });
};
exports.startcashierShift = startcashierShift;
const endShiftWithReport = async (req, res) => {
    const { shiftId } = req.params;
    const { password } = req.body;
    const userId = req.user?.id; // من الـ JWT
    const user = await User_1.UserModel.findById(userId).select("+password_hash +role +positionId");
    if (!user)
        throw new Errors_1.NotFound("User not found");
    const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isMatch)
        throw new BadRequest_1.BadRequest("Wrong password");
    // 3) هات الشيفت المفتوح
    const shift = await CashierShift_1.CashierShift.findOne({
        _id: shiftId,
        cashier_id: user._id,
        status: "open",
    });
    if (!shift)
        throw new Errors_1.NotFound("Open cashier shift not found");
    const endTime = new Date();
    // 4) المبيعات خلال الشيفت ده (باستخدام الوقت)
    const salesAgg = await Sale_1.SaleModel.aggregate([
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
    const expenses = await expenses_1.ExpenseModel.find({
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
                amount: totalSales, // مثال: 7677.34
            },
            // هنا بعرض إجمالي المصروفات كـ رقم سالب زي Vodafone Cash في الصورة
            expensesLine: {
                label: "Expenses",
                amount: -totalExpenses, // مثال: -200.00
            },
            netCashInDrawer, // 7477.34
        },
        ordersSummary: {
            totalOrders, // Orders: 1
        },
        expenses: {
            rows: expenses.map((e, idx) => ({
                index: idx + 1,
                description: e.name, // "Vodafone Cash"
                amount: -e.amount, // -200.00 في الجدول
            })),
            total: totalExpenses, // 200.00
        },
    };
    (0, response_1.SuccessResponse)(res, {
        message: "Cashier shift ended successfully",
        shift,
        report,
    });
};
exports.endShiftWithReport = endShiftWithReport;
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
const endshiftcashier = async (req, res) => {
    const cashier_id = req.user?.id; // من الـ JWT
    // ✅ نستخدم findOne بفلتر على cashier_id + status
    const shift = await CashierShift_1.CashierShift.findOne({
        cashier_id: cashier_id,
        status: 'open',
    });
    if (!shift) {
        throw new Errors_1.NotFound("Cashier shift not found");
    }
    if (shift.end_time) {
        throw new BadRequest_1.BadRequest("Cashier shift already ended");
    }
    shift.end_time = new Date();
    shift.status = 'closed';
    await shift.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Cashier shift ended successfully",
        shift,
    });
};
exports.endshiftcashier = endshiftcashier;
