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
// import { Forbidden, BadRequest, NotFound } من الـ error handlers بتاعتك
const startcashierShift = async (req, res) => {
    const cashierman_id = req.user?.id; // اليوزر اللي داخل بالـ JWT
    const warehouseId = req.user?.warehouse_id;
    const { cashier_id } = req.body; // الكاشير المختار من الشاشة (CashierModel._id)
    if (!cashierman_id) {
        throw new Errors_1.NotFound("Cashier user not found in token");
    }
    if (!warehouseId) {
        throw new Errors_1.NotFound("Warehouse ID is required");
    }
    if (!cashier_id) {
        throw new BadRequest_1.BadRequest("Cashier ID is required");
    }
    const cashierUser = await User_1.UserModel.findById(cashierman_id);
    if (!cashierUser) {
        throw new Errors_1.NotFound("Cashier user not found");
    }
    // 🔒 امنع أن نفس اليوزر يكون له شيفت مفتوح
    const existingShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id,
        status: "open",
    });
    if (existingShift) {
        throw new BadRequest_1.BadRequest("You already have an open shift");
    }
    // 🔒 امنع أن نفس الكاشير (CashierModel) يشتغل مع حد تاني
    const cashierDoc = await cashier_1.CashierModel.findOneAndUpdate({
        _id: cashier_id,
        warehouse_id: warehouseId,
        status: true,
        cashier_active: false, // لو true يبقى مستخدم عَ شيفت تاني
    }, { $set: { cashier_active: true } }, // نفعّله
    { new: true });
    if (!cashierDoc) {
        throw new BadRequest_1.BadRequest("Cashier already in use or not found");
    }
    // ✅ نفتح الشيفت ونربطه بـ cashierman_id + cashier_id
    const cashierShift = new CashierShift_1.CashierShift({
        start_time: new Date(),
        cashierman_id,
        cashier_id,
        status: "open",
    });
    const savedShift = await cashierShift.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Cashier shift started successfully",
        shift: savedShift,
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
    const warehouseId = jwtUser?.warehouse_id;
    // 1) هات اليوزر وتأكد من الباسورد
    const user = await User_1.UserModel.findById(userId).select("+password_hash +role +positionId");
    if (!user)
        throw new Errors_1.NotFound("User not found");
    const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isMatch)
        throw new BadRequest_1.BadRequest("Wrong password");
    // 2) آخر شيفت مفتوح لليوزر ده
    const shift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: user._id,
        status: "open",
    }).sort({ start_time: -1 });
    if (!shift)
        throw new Errors_1.NotFound("No open cashier shift found");
    const endTime = new Date();
    // 3) المبيعات بتاعة الشيفت ده (shift_id + cashier_id=اليوزر)
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
    // 4) مصروفات الشيفت
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
    // 5-مكرر) رجّع الكاشير متاح تاني (لو مربوط بكاشير)
    const cashier_id = shift.cashier_id;
    if (cashier_id) {
        await cashier_1.CashierModel.updateOne({
            _id: cashier_id,
            warehouse_id: warehouseId,
            status: true,
            cashier_active: true,
        }, { $set: { cashier_active: false } });
    }
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
    const jwtUser = req.user;
    if (!jwtUser)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const cashierman_id = jwtUser.id; // User من الـ JWT
    const warehouseId = jwtUser.warehouse_id;
    if (!cashierman_id) {
        throw new Errors_1.NotFound("Cashier user not found in token");
    }
    if (!warehouseId) {
        throw new Errors_1.NotFound("Warehouse ID is required");
    }
    // 🔎 هات آخر شيفت مفتوح لليوزر ده (زي endShiftWithReport)
    const shift = await CashierShift_1.CashierShift.findOne({
        cashierman_id,
        status: "open",
    }).sort({ start_time: -1 });
    if (!shift) {
        throw new Errors_1.NotFound("Cashier shift not found");
    }
    if (shift.end_time) {
        throw new BadRequest_1.BadRequest("Cashier shift already ended");
    }
    // الكاشير (CashierModel) اللي كان مستخدم في الشيفت
    const cashier_id = shift.cashier_id;
    // ✅ نقفل الشيفت (لو عندك داتا قديمة ناقصة cashier_id استخدم الاختيار اللي تحت)
    shift.end_time = new Date();
    shift.status = "closed";
    await shift.save(); // أو الخيار B تحت
    // ✅ نرجع الكاشير متاح تاني في نفس الـ warehouse
    if (cashier_id) {
        await cashier_1.CashierModel.updateOne({
            _id: cashier_id,
            warehouse_id: warehouseId,
            status: true,
            cashier_active: true, // كان مستخدم في الشيفت
        }, { $set: { cashier_active: false } });
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
