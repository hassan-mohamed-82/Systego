"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBankAccount = exports.updateBankAccount = exports.getBankAccountById = exports.getBankAccounts = exports.createBankAccount = void 0;
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
// ✅ Create
const createBankAccount = async (req, res) => {
    const { account_no, name, initial_balance, is_default, note } = req.body;
    if (!account_no || !name || initial_balance === undefined) {
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    }
    const exists = await Financial_Account_1.BankAccountModel.findOne({ account_no });
    if (exists)
        throw new BadRequest_1.BadRequest("Account number already exists");
    // ✅ لو الحساب دا هو الـ default، خلّي الباقي false
    if (is_default) {
        await Financial_Account_1.BankAccountModel.updateMany({}, { is_default: false });
    }
    const bankAccount = await Financial_Account_1.BankAccountModel.create({
        account_no,
        name,
        initial_balance,
        is_default,
        note,
    });
    (0, response_1.SuccessResponse)(res, { message: "Bank account created successfully", bankAccount });
};
exports.createBankAccount = createBankAccount;
// ✅ Get all (with total)
const getBankAccounts = async (req, res) => {
    const accounts = await Financial_Account_1.BankAccountModel.find();
    if (!accounts || accounts.length === 0)
        throw new Errors_1.NotFound("No bank accounts found");
    // ✅ total = sum of initial_balance
    const total = accounts.reduce((sum, acc) => sum + acc.initial_balance, 0);
    (0, response_1.SuccessResponse)(res, { message: "Get bank accounts successfully", accounts, total });
};
exports.getBankAccounts = getBankAccounts;
// ✅ Get by ID
const getBankAccountById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Bank account ID is required");
    const account = await Financial_Account_1.BankAccountModel.findById(id);
    if (!account)
        throw new Errors_1.NotFound("Bank account not found");
    (0, response_1.SuccessResponse)(res, { message: "Get bank account successfully", account });
};
exports.getBankAccountById = getBankAccountById;
// ✅ Update
const updateBankAccount = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Bank account ID is required");
    const { is_default } = req.body;
    // ✅ لو التحديث فيه is_default = true
    if (is_default) {
        await Financial_Account_1.BankAccountModel.updateMany({}, { is_default: false });
    }
    const account = await Financial_Account_1.BankAccountModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!account)
        throw new Errors_1.NotFound("Bank account not found");
    (0, response_1.SuccessResponse)(res, { message: "Bank account updated successfully", account });
};
exports.updateBankAccount = updateBankAccount;
// ✅ Delete
const deleteBankAccount = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Bank account ID is required");
    const account = await Financial_Account_1.BankAccountModel.findByIdAndDelete(id);
    if (!account)
        throw new Errors_1.NotFound("Bank account not found");
    (0, response_1.SuccessResponse)(res, { message: "Bank account deleted successfully" });
};
exports.deleteBankAccount = deleteBankAccount;
