"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBankAccount = exports.updateBankAccount = exports.getBankAccountById = exports.getBankAccounts = exports.createBankAccount = void 0;
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const handleImages_1 = require("../../utils/handleImages");
const createBankAccount = async (req, res) => {
    const { account_no, name, initial_balance, is_default, note, icon, ar_name } = req.body;
    if (!account_no || !name || !initial_balance || !ar_name === undefined) {
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    }
    const exists = await Financial_Account_1.BankAccountModel.findOne({ account_no });
    if (exists)
        throw new BadRequest_1.BadRequest("Account number already exists");
    if (is_default) {
        await Financial_Account_1.BankAccountModel.updateMany({}, { is_default: false });
    }
    let iconUrl = "";
    if (icon) {
        iconUrl = await (0, handleImages_1.saveBase64Image)(icon, Date.now().toString(), req, "bank_accounts");
    }
    const bankAccount = await Financial_Account_1.BankAccountModel.create({
        account_no,
        name,
        ar_name,
        initial_balance,
        is_default,
        note,
        icon: iconUrl,
    });
    (0, response_1.SuccessResponse)(res, { message: "Bank account created successfully", bankAccount });
};
exports.createBankAccount = createBankAccount;
const getBankAccounts = async (req, res) => {
    const accounts = await Financial_Account_1.BankAccountModel.find();
    if (!accounts || accounts.length === 0)
        throw new Errors_1.NotFound("No bank accounts found");
    // ✅ total = sum of initial_balance
    const total = accounts.reduce((sum, acc) => sum + acc.initial_balance, 0);
    (0, response_1.SuccessResponse)(res, { message: "Get bank accounts successfully", accounts, total });
};
exports.getBankAccounts = getBankAccounts;
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
