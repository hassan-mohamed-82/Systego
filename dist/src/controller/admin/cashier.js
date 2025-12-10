"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCashier = exports.getCashiers = exports.deleteCashier = exports.createCashier = void 0;
const cashier_1 = require("../../models/schema/admin/cashier");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const BadRequest_1 = require("../../Errors/BadRequest");
const createCashier = async (req, res) => {
    const { name, ar_name, warehouse_id, status } = req.body;
    if (!name || !ar_name || !warehouse_id) {
        throw new BadRequest_1.BadRequest(" name, ar_name and warehouse_id are required");
    }
    const existingCashier = await cashier_1.CashierModel.findOne({ name, warehouse_id });
    if (existingCashier)
        throw new BadRequest_1.BadRequest("Cashier already exists in this warehouse");
    const cashier = await cashier_1.CashierModel.create({ name, ar_name, warehouse_id, status });
    (0, response_1.SuccessResponse)(res, { message: "Cashier created successfully", cashier });
};
exports.createCashier = createCashier;
const deleteCashier = async (req, res) => {
    const { id } = req.params;
    const cashier = await cashier_1.CashierModel.findById(id);
    if (!cashier)
        throw new Errors_1.NotFound("Cashier not found");
    await cashier_1.CashierModel.findByIdAndDelete(id);
    (0, response_1.SuccessResponse)(res, { message: "Cashier deleted successfully" });
};
exports.deleteCashier = deleteCashier;
const getCashiers = async (req, res) => {
    const cashiers = await cashier_1.CashierModel.find()
        .populate("warehouse_id", "name") // اسم المخزن
        .populate({
        path: "users",
        select: "username email role status warehouseId", // الحقول اللي محتاجها من User
    })
        .populate({
        path: "bankAccounts",
        select: "name balance status in_POS warehouseId", // الحقول اللي محتاجها من BankAccount
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Cashiers with their users and bank accounts",
        cashiers,
    });
};
exports.getCashiers = getCashiers;
const updateCashier = async (req, res) => {
    const { id } = req.params;
    const { name, ar_name, warehouse_id, status } = req.body;
    const cashier = await cashier_1.CashierModel.findById(id);
    if (!cashier)
        throw new Errors_1.NotFound("Cashier not found");
    if (name)
        cashier.name = name;
    if (ar_name)
        cashier.ar_name = ar_name;
    if (warehouse_id)
        cashier.warehouse_id = warehouse_id;
    if (status)
        cashier.status = status;
    await cashier.save();
    (0, response_1.SuccessResponse)(res, { message: "Cashier updated successfully", cashier });
};
exports.updateCashier = updateCashier;
