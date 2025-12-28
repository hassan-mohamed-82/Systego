"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBankAccounts = exports.updateCashier = exports.getCashierById = exports.getCashiers = exports.deleteCashier = exports.createCashier = void 0;
const cashier_1 = require("../../models/schema/admin/cashier");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const createCashier = async (req, res) => {
    const { name, ar_name, warehouse_id, status, bankAccounts } = req.body;
    if (!name || !ar_name || !warehouse_id) {
        throw new Errors_1.BadRequest("name, ar_name and warehouse_id are required");
    }
    const existingCashier = await cashier_1.CashierModel.findOne({ name, warehouse_id });
    if (existingCashier) {
        throw new Errors_1.BadRequest("Cashier already exists in this warehouse");
    }
    const cashier = await cashier_1.CashierModel.create({
        name,
        ar_name,
        warehouse_id,
        status,
        bankAccounts: bankAccounts || [],
    });
    (0, response_1.SuccessResponse)(res, { message: "Cashier created successfully", cashier });
};
exports.createCashier = createCashier;
const deleteCashier = async (req, res) => {
    const { id } = req.params;
    const cashier = await cashier_1.CashierModel.findByIdAndDelete(id);
    if (!cashier)
        throw new Errors_1.NotFound("Cashier not found");
    (0, response_1.SuccessResponse)(res, { message: "Cashier deleted successfully" });
};
exports.deleteCashier = deleteCashier;
const getCashiers = async (req, res) => {
    const cashiers = await cashier_1.CashierModel.find()
        .populate("warehouse_id", "name")
        .populate("bankAccounts", "name balance status in_POS")
        .populate("warehouseUsers", "username email role status"); // الـ virtual
    (0, response_1.SuccessResponse)(res, {
        message: "Cashiers fetched successfully",
        cashiers,
    });
};
exports.getCashiers = getCashiers;
const getCashierById = async (req, res) => {
    const { id } = req.params;
    const cashier = await cashier_1.CashierModel.findById(id)
        .populate("warehouse_id", "name")
        .populate("bankAccounts", "name balance status in_POS")
        .populate("warehouseUsers", "username email role status");
    if (!cashier)
        throw new Errors_1.NotFound("Cashier not found");
    (0, response_1.SuccessResponse)(res, { cashier });
};
exports.getCashierById = getCashierById;
const updateCashier = async (req, res) => {
    const { id } = req.params;
    const { name, ar_name, warehouse_id, status, bankAccounts, addBankAccount, removeBankAccount, } = req.body;
    const updateQuery = {};
    const setFields = {};
    // الحقول العادية
    if (name !== undefined)
        setFields.name = name;
    if (ar_name !== undefined)
        setFields.ar_name = ar_name;
    if (warehouse_id !== undefined)
        setFields.warehouse_id = warehouse_id;
    if (status !== undefined)
        setFields.status = status;
    // استبدال كل الـ bankAccounts
    if (bankAccounts !== undefined)
        setFields.bankAccounts = bankAccounts;
    // بناء الـ query
    if (Object.keys(setFields).length > 0)
        updateQuery.$set = setFields;
    if (addBankAccount)
        updateQuery.$addToSet = { bankAccounts: addBankAccount };
    if (removeBankAccount)
        updateQuery.$pull = { bankAccounts: removeBankAccount };
    if (Object.keys(updateQuery).length === 0) {
        throw new Errors_1.BadRequest("No valid fields to update");
    }
    const cashier = await cashier_1.CashierModel.findByIdAndUpdate(id, updateQuery, {
        new: true,
        runValidators: true,
    })
        .populate("warehouse_id", "name")
        .populate("bankAccounts", "name balance");
    if (!cashier)
        throw new Errors_1.NotFound("Cashier not found");
    (0, response_1.SuccessResponse)(res, { message: "Cashier updated successfully", cashier });
};
exports.updateCashier = updateCashier;
// جلب كل الـ Bank Accounts (للاختيار منها)
const getBankAccounts = async (req, res) => {
    const bankAccounts = await Financial_Account_1.BankAccountModel.find({ status: true, in_POS: true }).select("name balance status in_POS");
    (0, response_1.SuccessResponse)(res, {
        message: "Bank accounts fetched successfully",
        bankAccounts,
    });
};
exports.getBankAccounts = getBankAccounts;
