"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRevenueById = exports.selectionRevenue = exports.getRevenues = exports.updateRevenue = exports.createRevenue = void 0;
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const Revenue_1 = require("../../models/schema/admin/Revenue");
const expensecategory_1 = require("../../models/schema/admin/expensecategory");
const NotFound_1 = require("../../Errors/NotFound");
const createRevenue = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const { name, amount, Category_id, note, financial_accountId } = req.body;
    if (!name || amount == null || !Category_id || !financial_accountId) {
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    }
    if (amount <= 0) {
        throw new BadRequest_1.BadRequest("Amount must be greater than 0");
    }
    const category = await expensecategory_1.ExpenseCategoryModel.findById(Category_id);
    if (!category)
        throw new NotFound_1.NotFound("Category not found");
    const updatedAccount = await Financial_Account_1.BankAccountModel.findOneAndUpdate({
        _id: financial_accountId,
        status: true,
        balance: { $gte: amount },
    }, { $inc: { balance: +amount } }, // هنا بيزود الفلوس
    { new: true });
    if (!updatedAccount) {
        throw new BadRequest_1.BadRequest("Insufficient balance in the selected account");
    }
    const revenue = await Revenue_1.RevenueModel.create({
        name,
        amount,
        Category_id,
        note,
        financial_accountId,
        admin_id: userId,
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Revenue created successfully",
        revenue,
        account_balance: updatedAccount.balance,
    });
};
exports.createRevenue = createRevenue;
const updateRevenue = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Revenue ID is required");
    const revenue = await Revenue_1.RevenueModel.findOne({ _id: id });
    if (!revenue)
        throw new NotFound_1.NotFound("Revenue not found");
    const newAmount = req.body.amount;
    // If no amount change, just update other fields
    if (newAmount == null) {
        Object.assign(revenue, req.body);
        await revenue.save();
        (0, response_1.SuccessResponse)(res, { message: "Revenue updated successfully", revenue });
        return;
    }
    // Validate the new amount
    if (newAmount <= 0) {
        throw new BadRequest_1.BadRequest("Amount must be greater than 0");
    }
    // Get the old amount from the existing revenue
    const oldAmount = revenue.amount;
    // Calculate the difference: subtract old amount, add new amount
    // If oldAmount = 100 and newAmount = 150, difference = +50 (add 50 to balance)
    // If oldAmount = 100 and newAmount = 50, difference = -50 (subtract 50 from balance)
    const balanceDifference = newAmount - oldAmount;
    // Update the account balance with the difference
    const updatedAccount = await Financial_Account_1.BankAccountModel.findOneAndUpdate({
        _id: revenue.financial_accountId,
        status: true,
    }, { $inc: { balance: balanceDifference } }, // هنا بنعدل الفرق بين القديم والجديد
    { new: true });
    if (!updatedAccount) {
        throw new BadRequest_1.BadRequest("Financial account not found or is not allowed");
    }
    // Check if balance went negative after the update
    if (updatedAccount.balance < 0) {
        // Rollback the balance change
        await Financial_Account_1.BankAccountModel.findByIdAndUpdate(revenue.financial_accountId, { $inc: { balance: -balanceDifference } });
        throw new BadRequest_1.BadRequest("Insufficient balance in financial account");
    }
    Object.assign(revenue, req.body);
    await revenue.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Revenue updated successfully",
        revenue,
        account_balance: updatedAccount.balance
    });
};
exports.updateRevenue = updateRevenue;
const getRevenues = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new BadRequest_1.BadRequest("Unauthorized Token");
    const revenues = await Revenue_1.RevenueModel.find()
        .populate("admin_id", "username ")
        .populate("Category_id", "name ar_name")
        .populate("financial_accountId", "name ar_name");
    (0, response_1.SuccessResponse)(res, { message: "Revenues retrieved successfully", revenues });
};
exports.getRevenues = getRevenues;
const selectionRevenue = async (req, res) => {
    const categories = await expensecategory_1.ExpenseCategoryModel.find({ status: true });
    const accounts = await Financial_Account_1.BankAccountModel.find({ status: true });
    (0, response_1.SuccessResponse)(res, { message: "Selection data retrieved successfully", categories, accounts });
};
exports.selectionRevenue = selectionRevenue;
const getRevenueById = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new BadRequest_1.BadRequest("Unauthorized Token");
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Revenue ID is required");
    const revenue = await Revenue_1.RevenueModel.findOne({ _id: id })
        .populate("admin_id", "username ")
        .populate("Category_id", "name ar_name")
        .populate("financial_accountId", "name ar_name");
    if (!revenue)
        throw new NotFound_1.NotFound("Revenue not found");
    (0, response_1.SuccessResponse)(res, { message: "Revenue retrieved successfully", revenue });
};
exports.getRevenueById = getRevenueById;
