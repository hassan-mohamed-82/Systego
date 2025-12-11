"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBankAccount = exports.deleteBankAccount = exports.getBankAccountById = exports.getBankAccounts = exports.createBankAccount = void 0;
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const handleImages_1 = require("../../utils/handleImages");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const createBankAccount = async (req, res) => {
    const { name, warehouseId, image, description, status, in_POS, balance } = req.body;
    const existingAccount = await Financial_Account_1.BankAccountModel.findOne({ name });
    if (existingAccount) {
        throw new BadRequest_1.BadRequest("Account name already exists");
    }
    const existwarehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
    if (!existwarehouse) {
        throw new Errors_1.NotFound("Warehouse not found");
    }
    let imageUrl = "";
    if (image) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "category");
    }
    const bankAccount = await Financial_Account_1.BankAccountModel.create({
        name,
        warehouseId,
        image: imageUrl,
        description,
        status,
        in_POS,
        balance
    });
    (0, response_1.SuccessResponse)(res, { message: "Bank account created successfully", bankAccount });
};
exports.createBankAccount = createBankAccount;
const getBankAccounts = async (req, res) => {
    const bankAccounts = await Financial_Account_1.BankAccountModel.find().populate("warehouseId", "name");
    (0, response_1.SuccessResponse)(res, { message: "Bank accounts retrieved successfully", bankAccounts });
};
exports.getBankAccounts = getBankAccounts;
const getBankAccountById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Bank account id is required");
    const bankAccount = await Financial_Account_1.BankAccountModel.findById(id).populate("warehouseId", "name");
    if (!bankAccount)
        throw new Errors_1.NotFound("Bank account not found");
    (0, response_1.SuccessResponse)(res, { message: "Bank account retrieved successfully", bankAccount });
};
exports.getBankAccountById = getBankAccountById;
const deleteBankAccount = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Bank account id is required");
    const bankAccount = await Financial_Account_1.BankAccountModel.findByIdAndDelete(id);
    if (!bankAccount)
        throw new Errors_1.NotFound("Bank account not found");
    (0, response_1.SuccessResponse)(res, { message: "Bank account deleted successfully" });
};
exports.deleteBankAccount = deleteBankAccount;
const updateBankAccount = async (req, res) => {
    const { id } = req.params;
    const { name, warehouseId, image, description, status, in_POS } = req.body;
    if (!id)
        throw new BadRequest_1.BadRequest("Bank account id is required");
    const bankAccount = await Financial_Account_1.BankAccountModel.findById(id);
    if (!bankAccount)
        throw new Errors_1.NotFound("Bank account not found");
    // name
    if (typeof name === "string") {
        bankAccount.name = name;
    }
    // warehouse
    if (warehouseId) {
        const existWarehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
        if (!existWarehouse) {
            throw new Errors_1.NotFound("Warehouse not found");
        }
        // لو السكيمة عندك اسمها warhouseId خليه كده
        bankAccount.warehouseId = warehouseId;
        // لو صححتها لـ warehouseId خليه:
        // bankAccount.warehouseId = warehouseId;
    }
    // image (base64)
    if (image) {
        bankAccount.image = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "category");
    }
    // description
    if (typeof description === "string") {
        bankAccount.description = description;
    }
    // ✅ booleans
    if (typeof status === "boolean") {
        bankAccount.status = status;
    }
    if (typeof in_POS === "boolean") {
        bankAccount.in_POS = in_POS;
    }
    await bankAccount.save({ validateBeforeSave: false });
    (0, response_1.SuccessResponse)(res, {
        message: "Bank account updated successfully",
        bankAccount,
    });
};
exports.updateBankAccount = updateBankAccount;
