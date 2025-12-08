"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectionExpense = exports.getExpenses = exports.updateExpense = exports.createExpense = void 0;
const expenses_1 = require("../../models/schema/admin/expenses");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const category_1 = require("../../models/schema/admin/category");
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const CashierShift_1 = require("../../models/schema/admin/POS/CashierShift");
const createExpense = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new BadRequest_1.BadRequest("User ID is required");
    const { name, amount, Category_id, note, financial_accountId } = req.body;
    if (!name || !amount || !Category_id || !financial_accountId) {
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    }
    // ✅ 1) هات الشيفت المفتوح للكاشير ده
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashier_id: userId,
        status: "open",
    }).sort({ start_time: -1 });
    if (!openShift) {
        throw new BadRequest_1.BadRequest("No open shift for this cashier");
    }
    // ✅ 2) تأكيد الكاتجوري و الحساب المالي
    const category = await category_1.CategoryModel.findById(Category_id);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    const account = await Financial_Account_1.BankAccountModel.findById(financial_accountId);
    if (!account)
        throw new Errors_1.NotFound("Financial account not found");
    // ✅ 3) أنشئ الـ Expense مربوط فعلياً بالشيفت
    const expense = new expenses_1.ExpenseModel({
        name,
        amount,
        Category_id,
        note,
        financial_accountId,
        shift_id: openShift._id, // هنا الصح
        cashier_id: userId,
    });
    await expense.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Expense created successfully",
        expense,
    });
};
exports.createExpense = createExpense;
const updateExpense = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new BadRequest_1.BadRequest("User ID is required");
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Expense ID is required");
    const expense = await expenses_1.ExpenseModel.findOne({ _id: id, cashier_id: userId });
    if (!expense)
        throw new Errors_1.NotFound("Expense not found");
    Object.assign(expense, req.body);
    await expense.save();
    (0, response_1.SuccessResponse)(res, { message: "Expense updated successfully", expense });
};
exports.updateExpense = updateExpense;
const getExpenses = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new BadRequest_1.BadRequest("User ID is required");
    // 1️⃣ هات الشيفت المفتوح للكاشير الحالي
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashier_id: userId,
        status: "open",
    }).sort({ start_time: -1 });
    if (!openShift) {
        // مفيش شيفت مفتوح: يا إمّا ترجع فاضي أو ترمي Error
        // هنا هرجّع فاضي عشان الفرونت يتعامل عادي
        return (0, response_1.SuccessResponse)(res, {
            message: "No open shift for this cashier",
            expenses: [],
        });
    }
    // 2️⃣ هات المصروفات المرتبطة بالشيفت المفتوح ده
    const expenses = await expenses_1.ExpenseModel.find({
        cashier_id: userId,
        shift_id: openShift._id,
    })
        .populate("Category_id", "name")
        .populate("financial_accountId", "name ar_name");
    (0, response_1.SuccessResponse)(res, {
        message: "Expenses retrieved successfully",
        expenses,
    });
};
exports.getExpenses = getExpenses;
const selectionExpense = async (req, res) => {
    const categories = await category_1.CategoryModel.find();
    const accounts = await Financial_Account_1.BankAccountModel.find({ is_default: true });
    (0, response_1.SuccessResponse)(res, { message: "Selection data retrieved successfully", categories, accounts });
};
exports.selectionExpense = selectionExpense;
