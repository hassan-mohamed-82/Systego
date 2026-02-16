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
const mongoose_1 = __importDefault(require("mongoose"));
const payment_1 = require("../../../models/schema/admin/POS/payment");
const Financial_Account_1 = require("../../../models/schema/admin/Financial_Account");
// import { Forbidden, BadRequest, NotFound } من الـ error handlers بتاعتك
const startcashierShift = async (req, res) => {
    const cashierman_id = req.user?.id;
    const warehouseId = req.user?.warehouse_id;
    const { cashier_id } = req.body;
    if (!cashierman_id) {
        throw new Errors_1.NotFound("Cashier user not found in token");
    }
    if (!warehouseId) {
        throw new Errors_1.NotFound("Warehouse ID is required");
    }
    const cashierUser = await User_1.UserModel.findById(cashierman_id);
    if (!cashierUser) {
        throw new Errors_1.NotFound("Cashier user not found");
    }
    // ✅ لو فيه شيفت مفتوح، دخّله عليه على طول
    const existingShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id,
        status: "open",
    }).populate("cashier_id", "name code");
    if (existingShift) {
        // جيب بيانات الكاشير المرتبط بالشيفت
        const cashierDoc = await cashier_1.CashierModel.findById(existingShift.cashier_id);
        return (0, response_1.SuccessResponse)(res, {
            message: "You already have an open shift",
            isExisting: true,
            shift: existingShift,
            cashier: cashierDoc,
        });
    }
    // ✅ لو مفيش شيفت مفتوح، لازم يختار كاشير
    if (!cashier_id) {
        throw new BadRequest_1.BadRequest("Cashier ID is required to start a new shift");
    }
    // 🔒 امنع أن نفس الكاشير (CashierModel) يشتغل مع حد تاني
    const cashierDoc = await cashier_1.CashierModel.findOneAndUpdate({
        _id: cashier_id,
        warehouse_id: warehouseId,
        status: true,
        cashier_active: false,
    }, { $set: { cashier_active: true } }, { new: true });
    if (!cashierDoc) {
        throw new BadRequest_1.BadRequest("Cashier already in use or not found");
    }
    // ✅ نفتح شيفت جديد
    const cashierShift = new CashierShift_1.CashierShift({
        start_time: new Date(),
        cashierman_id,
        cashier_id,
        status: "open",
    });
    const savedShift = await cashierShift.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Cashier shift started successfully",
        isExisting: false,
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
    // ✅ تحقق إن الشيفت مش قديم (أكتر من 24 ساعة)
    const shiftAge = Date.now() - new Date(shift.start_time || Date.now()).getTime();
    const maxShiftDuration = 24 * 60 * 60 * 1000;
    if (shiftAge > maxShiftDuration) {
        throw new BadRequest_1.BadRequest("Your shift has expired (more than 24 hours). Please contact admin to close it.");
    }
    // 3) المبيعات المكتملة في الشيفت ده فقط
    const completedSales = await Sale_1.SaleModel.find({
        shift_id: shift._id,
        cashier_id: user._id,
        order_pending: 0,
    })
        .select("_id grand_total")
        .lean();
    const totalSales = completedSales.reduce((sum, s) => sum + (s.grand_total || 0), 0);
    const totalOrders = completedSales.length;
    const saleIds = completedSales.map((s) => s._id);
    let paymentsByAccount = {};
    if (saleIds.length > 0) {
        const paymentsAgg = await payment_1.PaymentModel.aggregate([
            {
                $match: {
                    sale_id: { $in: saleIds },
                },
            },
            { $unwind: "$financials" },
            {
                $group: {
                    _id: "$financials.account_id",
                    totalAmount: { $sum: "$financials.amount" },
                },
            },
        ]);
        paymentsByAccount = paymentsAgg.reduce((acc, row) => {
            if (row._id) {
                acc[row._id.toString()] = row.totalAmount;
            }
            return acc;
        }, {});
    }
    const expensesAgg = await expenses_1.ExpenseModel.aggregate([
        {
            $match: {
                shift_id: shift._id,
                cashier_id: user._id,
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
        if (row._id) {
            acc[row._id.toString()] = row.totalAmount;
        }
        return acc;
    }, {});
    const totalExpenses = Object.values(expensesByAccount).reduce((sum, v) => sum + v, 0);
    const netCashInDrawer = totalSales - totalExpenses;
    // 6) هات بيانات الحسابات المالية اللي اتستخدمت
    const allAccountIds = Array.from(new Set([
        ...Object.keys(paymentsByAccount),
        ...Object.keys(expensesByAccount),
    ])).filter((id) => !!id);
    let accounts = [];
    if (allAccountIds.length > 0) {
        const accountObjectIds = allAccountIds.map((id) => new mongoose_1.default.Types.ObjectId(id));
        accounts = await Financial_Account_1.BankAccountModel.find({
            _id: { $in: accountObjectIds },
        })
            .select("name type")
            .lean();
    }
    const accountsMap = new Map(accounts.map((a) => [a._id.toString(), a]));
    // 7) بناء الـ summary ديناميك لكل حساب مالي
    const accountRows = allAccountIds.map((id) => {
        const acc = accountsMap.get(id);
        const salesAmount = paymentsByAccount[id] || 0;
        const expensesAmount = expensesByAccount[id] || 0;
        return {
            account_id: id,
            name: acc?.name || "Unknown account",
            salesAmount,
            expensesAmount,
            net: salesAmount - expensesAmount,
        };
    });
    // 8) مصروفات مفصلة
    const expenses = await expenses_1.ExpenseModel.find({
        shift_id: shift._id,
        cashier_id: user._id,
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
    return (0, response_1.SuccessResponse)(res, {
        message: "Shift report preview (shift is still open)",
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
