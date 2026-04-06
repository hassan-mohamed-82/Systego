"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeCashierShift = exports.getCashierShiftDetails = exports.getAllCashierShifts = void 0;
const CashierShift_1 = require("../../models/schema/admin/POS/CashierShift");
const Sale_1 = require("../../models/schema/admin/POS/Sale");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const BadRequest_1 = require("../../Errors/BadRequest");
const expenses_1 = require("../../models/schema/admin/POS/expenses");
const mongoose_1 = __importDefault(require("mongoose"));
const getAllCashierShifts = async (req, res) => {
    const { status, cashierman_id, cashier_id } = req.query;
    const filter = {};
    if (status)
        filter.status = status;
    if (cashierman_id)
        filter.cashierman_id = cashierman_id;
    if (cashier_id)
        filter.cashier_id = cashier_id;
    const shifts = await CashierShift_1.CashierShift.find(filter)
        .populate("cashierman_id", "username email role")
        .populate("cashier_id", "name code")
        .sort({ start_time: -1 })
        .lean();
    // ✅ حساب القيم لكل شيفت
    const shiftsWithTotals = await Promise.all(shifts.map(async (shift) => {
        const shiftStartTime = new Date(shift.start_time || Date.now());
        // مبيعات الشيفت
        const sales = await Sale_1.SaleModel.find({
            shift_id: shift._id,
            order_pending: 0,
            createdAt: { $gte: shiftStartTime },
        })
            .select("grand_total")
            .lean();
        // مصروفات الشيفت
        const expenses = await expenses_1.ExpenseModel.find({
            shift_id: shift._id,
            createdAt: { $gte: shiftStartTime },
        })
            .select("amount")
            .lean();
        const totalSales = sales.reduce((sum, s) => sum + (s.grand_total || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const netCashInDrawer = totalSales - totalExpenses;
        return {
            ...shift,
            total_sale_amount: totalSales,
            total_expenses: totalExpenses,
            net_cash_in_drawer: netCashInDrawer,
            orders_count: sales.length,
        };
    }));
    return (0, response_1.SuccessResponse)(res, {
        message: "Cashier shifts fetched successfully",
        shifts: shiftsWithTotals,
    });
};
exports.getAllCashierShifts = getAllCashierShifts;
const getCashierShiftDetails = async (req, res) => {
    const { id } = req.params;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Invalid shift id");
    }
    // 1) هات الشيفت مع بيانات اليوزر و الكاشير
    const shift = await CashierShift_1.CashierShift.findById(id)
        .populate("cashierman_id", "username email role")
        .populate("cashier_id", "name code")
        .lean();
    if (!shift) {
        throw new Errors_1.NotFound("Cashier shift not found");
    }
    // ✅ حساب الـ filterFromDate
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const shiftStartTime = new Date(shift.start_time || Date.now());
    const filterFromDate = shiftStartTime > todayStart ? shiftStartTime : todayStart;
    // 2) كل المبيعات في الشيفت ده
    const sales = await Sale_1.SaleModel.find({
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
        const items = await Sale_1.ProductSalesModel.find({
            sale_id: { $in: saleIds },
        })
            .populate("product_id", "name ar_name image price")
            .populate("product_price_id", "price code")
            .populate("bundle_id", "name price")
            .lean();
        const itemsBySaleId = {};
        for (const item of items) {
            const key = item.sale_id.toString();
            if (!itemsBySaleId[key])
                itemsBySaleId[key] = [];
            itemsBySaleId[key].push(item);
        }
        salesWithItems = sales.map((s) => ({
            ...s,
            items: itemsBySaleId[s._id.toString()] || [],
        }));
    }
    // 4) مصروفات الشيفت
    const expenses = await expenses_1.ExpenseModel.find({
        shift_id: shift._id,
        createdAt: { $gte: shiftStartTime },
    })
        .populate("Category_id", "name")
        .populate("financial_accountId", "name")
        .lean();
    // 5) Summary محسوب من الداتا
    const totalSales = sales.reduce((sum, s) => sum + (s.grand_total || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netCashInDrawer = totalSales - totalExpenses;
    const summary = {
        totalSales,
        totalExpenses,
        netCashInDrawer,
        ordersCount: sales.length,
    };
    // ✅ رجع الشيفت بالقيم المحسوبة
    return (0, response_1.SuccessResponse)(res, {
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
exports.getCashierShiftDetails = getCashierShiftDetails;
const closeCashierShift = async (req, res) => {
    const { id } = req.params;
    // التحقق من صحة الـ ID
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Invalid shift id");
    }
    // 1) البحث عن الشيفت
    const shift = await CashierShift_1.CashierShift.findById(id);
    if (!shift) {
        throw new Errors_1.NotFound("Cashier shift not found");
    }
    // 2) التأكد أن الشيفت مفتوح بالفعل وليس مغلقاً مسبقاً
    if (shift.status === "closed") {
        throw new BadRequest_1.BadRequest("This shift is already closed");
    }
    const shiftStartTime = new Date(shift.start_time || shift.createdAt);
    // 3) حساب إجمالي المبيعات التي تمت خلال هذا الشيفت
    const sales = await Sale_1.SaleModel.find({
        shift_id: shift._id,
        order_pending: 0,
        createdAt: { $gte: shiftStartTime },
    })
        .select("grand_total")
        .lean();
    const totalSales = sales.reduce((sum, s) => sum + (s.grand_total || 0), 0);
    // 4) حساب إجمالي المصروفات التي تمت خلال هذا الشيفت
    const expenses = await expenses_1.ExpenseModel.find({
        shift_id: shift._id,
        createdAt: { $gte: shiftStartTime },
    })
        .select("amount")
        .lean();
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netCashInDrawer = totalSales - totalExpenses;
    // 5) تحديث بيانات الشيفت وإغلاقه
    shift.status = "closed";
    shift.end_time = new Date(); // تسجيل وقت الإغلاق
    shift.total_sale_amount = totalSales; // حفظ المبيعات النهائية
    shift.total_expenses = totalExpenses; // حفظ المصروفات النهائية
    shift.net_cash_in_drawer = netCashInDrawer; // حفظ صافي الدرج النهائي
    await shift.save();
    // إرجاع الرد بنجاح
    return (0, response_1.SuccessResponse)(res, {
        message: "Cashier shift closed successfully",
        shift,
    });
};
exports.closeCashierShift = closeCashierShift;
