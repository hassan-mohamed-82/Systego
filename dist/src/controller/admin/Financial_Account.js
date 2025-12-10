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
    const { name, warehouseId, image, description, status, in_POS } = req.body;
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
    if (name)
        bankAccount.name = name;
    if (warehouseId) {
        const existwarhouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
        if (!existwarhouse) {
            throw new Errors_1.NotFound("Warhouse not found");
        }
    }
    bankAccount.warehouseId = warehouseId;
    if (image) {
        bankAccount.image = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "category");
    }
    if (description)
        bankAccount.description = description;
    if (status)
        bankAccount.status = status;
    if (in_POS)
        bankAccount.in_POS = in_POS;
    await bankAccount.save();
    (0, response_1.SuccessResponse)(res, { message: "Bank account updated successfully", bankAccount });
};
exports.updateBankAccount = updateBankAccount;
