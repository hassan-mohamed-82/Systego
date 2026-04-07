"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBankAccounts = exports.updateCashier = exports.getCashierById = exports.getCashiers = exports.deleteCashier = exports.createCashier = void 0;
const cashier_1 = require("../../models/schema/admin/cashier");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const createCashier = async (req, res) => {
    const { name, ar_name, warehouse_id, status, bankAccounts, printer_type, printer_IP, printer_port, Printer_name } = req.body;
    if (!name || !ar_name || !warehouse_id) {
        throw new Errors_1.BadRequest("name, ar_name and warehouse_id are required");
    }
    // ✅ التحقق من بيانات الطابعة لو نوعها شبكة
    if (printer_type === "NETWORK") {
        if (!printer_IP || !printer_port || !Printer_name) {
            throw new Errors_1.BadRequest("printer_IP, printer_port, and Printer_name are required when printer_type is NETWORK");
        }
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
        printer_type,
        printer_IP,
        printer_port,
        Printer_name,
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
        .populate("warehouseUsers", "username email role status");
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
    const { name, ar_name, warehouse_id, status, bankAccounts, addBankAccount, removeBankAccount, printer_type, printer_IP, printer_port, Printer_name } = req.body;
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
    // حقول الطابعة
    if (printer_type !== undefined)
        setFields.printer_type = printer_type;
    if (printer_IP !== undefined)
        setFields.printer_IP = printer_IP;
    if (printer_port !== undefined)
        setFields.printer_port = printer_port;
    if (Printer_name !== undefined)
        setFields.Printer_name = Printer_name;
    // ✅ التحقق أثناء التعديل لو بيغير الطابعة لـ NETWORK 
    // (للتأكد إنه باعت باقي البيانات المطلوبة)
    if (setFields.printer_type === "NETWORK") {
        // يجب توفير البيانات إما في الـ body أو تكون موجودة مسبقاً، بس بنفضل نأكد عليها هنا
        if (!printer_IP && !printer_port && !Printer_name) {
            throw new Errors_1.BadRequest("You must provide printer_IP, printer_port, and Printer_name when changing printer_type to NETWORK");
        }
    }
    else if (setFields.printer_type === "USB") {
        // اختياري: لو غير لـ USB ممكن تفضي حقول الـ Network علشان الداتا تكون نظيفة
        setFields.printer_IP = null;
        setFields.printer_port = null;
        setFields.Printer_name = null;
    }
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
        runValidators: true, // هينفذ الـ validation بتاع الموديل
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
    // الـ Warehouse مش محتاج populate - هو نفسه الـ model
    const warehouse = await Warehouse_1.WarehouseModel.find().select("name");
    (0, response_1.SuccessResponse)(res, {
        message: "Bank accounts fetched successfully",
        bankAccounts,
        warehouse,
    });
};
exports.getBankAccounts = getBankAccounts;
