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
    const { password } = req.body;
    const jwtUser = req.user;
    if (!jwtUser)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const userId = jwtUser.id;
    // 1) هات اليوزر وتأكد من الباسورد
    const user = await User_1.UserModel.findById(userId).select("+password_hash +role +positionId");
    if (!user)
        throw new Errors_1.NotFound("User not found");
    const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isMatch)
        throw new BadRequest_1.BadRequest("Wrong password");
    // 2) هات آخر شيفت مفتوح للكاشير ده (من غير ما تبعت shiftId)
    const shift = await CashierShift_1.CashierShift.findOne({
        cashier_id: user._id,
        status: "open",
    }).sort({ start_time: -1 });
    if (!shift)
        throw new Errors_1.NotFound("No open cashier shift found");
    const endTime = new Date();
    // 3) المبيعات بتاعة الشيفت ده فعلياً (بإستخدام shift_id + cashier_id)
    const salesAgg = await Sale_1.SaleModel.aggregate([
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
    const totalSales = salesAgg[0]?.totalAmount || 0;
    const totalOrders = salesAgg[0]?.ordersCount || 0;
    // 4) مصروفات نفس الشيفت
    const expenses = await expenses_1.ExpenseModel.find({
        shift_id: shift._id,
        cashier_id: user._id,
    }).lean();
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netCashInDrawer = totalSales - totalExpenses;
    // 5) قفل الشيفت وتخزين الأرقام
    shift.end_time = endTime;
    shift.status = "closed";
    shift.total_sale_amount = totalSales;
    shift.total_expenses = totalExpenses;
    shift.net_cash_in_drawer = netCashInDrawer;
    await shift.save();
    // 6) تجهيز الـ report
    const vodafoneCashTotal = expenses
        .filter((e) => e.name === "Vodafone Cash")
        .reduce((sum, e) => sum + e.amount, 0);
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
            rows: expenses.map((e, idx) => ({
                index: idx + 1,
                description: e.name,
                amount: -e.amount,
            })),
            total: totalExpenses,
        },
    };
    (0, response_1.SuccessResponse)(res, {
        message: "Cashier shift ended successfully",
        shift,
        report,
    });
};
exports.endShiftWithReport = endShiftWithReport;
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
