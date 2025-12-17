"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeWarehouseFromBankAccount = exports.addWarehouseToBankAccount = exports.deleteBankAccount = exports.updateBankAccount = exports.getBankAccountById = exports.getBankAccountsForPOS = exports.getBankAccounts = exports.createBankAccount = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const handleImages_1 = require("../../utils/handleImages");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
// ✅ Helper function للتحقق من الـ warehouses
const validateWarehouses = async (warehouseIds) => {
    // تحويل لـ Array لو مش Array
    const ids = Array.isArray(warehouseIds) ? warehouseIds : [warehouseIds];
    // التحقق من صحة كل ID
    for (const id of ids) {
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new BadRequest_1.BadRequest(`Invalid warehouse id: ${id}`);
        }
    }
    // التحقق من وجود كل الـ warehouses
    const warehouses = await Warehouse_1.WarehouseModel.find({ _id: { $in: ids } });
    if (warehouses.length !== ids.length) {
        const foundIds = warehouses.map(w => w._id.toString());
        const notFoundIds = ids.filter(id => !foundIds.includes(id));
        throw new Errors_1.NotFound(`Warehouses not found: ${notFoundIds.join(", ")}`);
    }
    return ids;
};
// ✅ Create Bank Account
const createBankAccount = async (req, res) => {
    const { name, warehouseId, image, description, status, in_POS, balance } = req.body;
    if (!name || !name.trim()) {
        throw new BadRequest_1.BadRequest("Account name is required");
    }
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("At least one warehouse is required");
    }
    // التحقق من عدم تكرار الاسم
    const existingAccount = await Financial_Account_1.BankAccountModel.findOne({ name: name.trim() });
    if (existingAccount) {
        throw new BadRequest_1.BadRequest("Account name already exists");
    }
    // ✅ التحقق من الـ warehouses (يدعم single و array)
    const validWarehouseIds = await validateWarehouses(warehouseId);
    // معالجة الصورة
    let imageUrl = "";
    if (image) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "bank-account");
    }
    const bankAccount = await Financial_Account_1.BankAccountModel.create({
        name: name.trim(),
        warehouseId: validWarehouseIds,
        image: imageUrl,
        description: description?.trim() || "",
        status: status !== undefined ? status : true,
        in_POS: in_POS !== undefined ? in_POS : false,
        balance: Number(balance) || 0,
    });
    const populatedAccount = await Financial_Account_1.BankAccountModel.findById(bankAccount._id)
        .populate("warehouseId", "name location");
    (0, response_1.SuccessResponse)(res, {
        message: "Bank account created successfully",
        bankAccount: populatedAccount
    });
};
exports.createBankAccount = createBankAccount;
// ✅ Get All Bank Accounts
const getBankAccounts = async (req, res) => {
    const { warehouse_id, status, in_POS } = req.query;
    const filter = {};
    // فلترة بالـ warehouse
    if (warehouse_id) {
        if (!mongoose_1.default.Types.ObjectId.isValid(warehouse_id)) {
            throw new BadRequest_1.BadRequest("Invalid warehouse_id");
        }
        filter.warehouseId = warehouse_id;
    }
    // فلترة بالـ status
    if (status !== undefined) {
        if (typeof status === "string") {
            filter.status = status.toLowerCase() === "true";
        }
        else if (typeof status === "boolean") {
            filter.status = status;
        }
        // ignore other types (e.g., object/array)
    }
    // فلترة بالـ in_POS
    if (in_POS !== undefined) {
        // Convert to boolean only if value is string "true"
        if (typeof in_POS === "string") {
            filter.in_POS = in_POS.toLowerCase() === "true";
        }
        else if (typeof in_POS === "boolean") {
            filter.in_POS = in_POS;
        }
        // ignore other types (e.g., object/array)
    }
    const bankAccounts = await Financial_Account_1.BankAccountModel.find(filter)
        .populate("warehouseId", "name location")
        .sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, {
        message: "Bank accounts retrieved successfully",
        count: bankAccounts.length,
        bankAccounts
    });
};
exports.getBankAccounts = getBankAccounts;
// ✅ Get Bank Accounts for POS (by warehouse)
const getBankAccountsForPOS = async (req, res) => {
    const jwtUser = req.user;
    const warehouseId = jwtUser?.warehouse_id;
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    const bankAccounts = await Financial_Account_1.BankAccountModel.find({
        warehouseId: warehouseId,
        status: true,
        in_POS: true,
    })
        .select("name image balance")
        .sort({ name: 1 });
    (0, response_1.SuccessResponse)(res, {
        message: "POS bank accounts retrieved successfully",
        bankAccounts
    });
};
exports.getBankAccountsForPOS = getBankAccountsForPOS;
// ✅ Get Bank Account By ID
const getBankAccountById = async (req, res) => {
    const { id } = req.params;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Valid bank account id is required");
    }
    const bankAccount = await Financial_Account_1.BankAccountModel.findById(id)
        .populate("warehouseId", "name location");
    if (!bankAccount) {
        throw new Errors_1.NotFound("Bank account not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Bank account retrieved successfully",
        bankAccount
    });
};
exports.getBankAccountById = getBankAccountById;
// ✅ Update Bank Account
const updateBankAccount = async (req, res) => {
    const { id } = req.params;
    const { name, warehouseId, image, description, status, in_POS, balance } = req.body;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Valid bank account id is required");
    }
    const bankAccount = await Financial_Account_1.BankAccountModel.findById(id);
    if (!bankAccount) {
        throw new Errors_1.NotFound("Bank account not found");
    }
    // ✅ تحديث الاسم
    if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
            throw new BadRequest_1.BadRequest("Name must be a non-empty string");
        }
        // التحقق من عدم تكرار الاسم (باستثناء الحساب الحالي)
        const existingAccount = await Financial_Account_1.BankAccountModel.findOne({
            name: name.trim(),
            _id: { $ne: id }
        });
        if (existingAccount) {
            throw new BadRequest_1.BadRequest("Account name already exists");
        }
        bankAccount.name = name.trim();
    }
    // ✅ تحديث الـ warehouses
    if (warehouseId !== undefined) {
        if (!warehouseId || (Array.isArray(warehouseId) && warehouseId.length === 0)) {
            throw new BadRequest_1.BadRequest("At least one warehouse is required");
        }
        const validWarehouseIds = await validateWarehouses(warehouseId);
        bankAccount.warehouseId = validWarehouseIds;
    }
    // ✅ تحديث الصورة
    if (image) {
        bankAccount.image = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "bank-account");
    }
    // ✅ تحديث الوصف
    if (description !== undefined) {
        bankAccount.description = typeof description === "string" ? description.trim() : "";
    }
    // ✅ تحديث الـ status
    if (status !== undefined) {
        if (typeof status !== "boolean") {
            throw new BadRequest_1.BadRequest("Status must be a boolean");
        }
        bankAccount.status = status;
    }
    // ✅ تحديث الـ in_POS
    if (in_POS !== undefined) {
        if (typeof in_POS !== "boolean") {
            throw new BadRequest_1.BadRequest("in_POS must be a boolean");
        }
        bankAccount.in_POS = in_POS;
    }
    // ✅ تحديث الـ balance (اختياري - عادة يتم عبر transactions)
    if (balance !== undefined) {
        const numBalance = Number(balance);
        if (isNaN(numBalance)) {
            throw new BadRequest_1.BadRequest("Balance must be a number");
        }
        bankAccount.balance = numBalance;
    }
    await bankAccount.save();
    const updatedAccount = await Financial_Account_1.BankAccountModel.findById(id)
        .populate("warehouseId", "name location");
    (0, response_1.SuccessResponse)(res, {
        message: "Bank account updated successfully",
        bankAccount: updatedAccount,
    });
};
exports.updateBankAccount = updateBankAccount;
// ✅ Delete Bank Account
const deleteBankAccount = async (req, res) => {
    const { id } = req.params;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Valid bank account id is required");
    }
    const bankAccount = await Financial_Account_1.BankAccountModel.findById(id);
    if (!bankAccount) {
        throw new Errors_1.NotFound("Bank account not found");
    }
    // ✅ التحقق من عدم وجود رصيد (اختياري)
    if (bankAccount.balance !== 0) {
        throw new BadRequest_1.BadRequest(`Cannot delete account with non-zero balance (${bankAccount.balance}). Please transfer the balance first.`);
    }
    await Financial_Account_1.BankAccountModel.findByIdAndDelete(id);
    (0, response_1.SuccessResponse)(res, {
        message: "Bank account deleted successfully"
    });
};
exports.deleteBankAccount = deleteBankAccount;
// ✅ Add Warehouse to Bank Account
const addWarehouseToBankAccount = async (req, res) => {
    const { id } = req.params;
    const { warehouseId } = req.body;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Valid bank account id is required");
    }
    if (!warehouseId || !mongoose_1.default.Types.ObjectId.isValid(warehouseId)) {
        throw new BadRequest_1.BadRequest("Valid warehouse id is required");
    }
    const bankAccount = await Financial_Account_1.BankAccountModel.findById(id);
    if (!bankAccount) {
        throw new Errors_1.NotFound("Bank account not found");
    }
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
    if (!warehouse) {
        throw new Errors_1.NotFound("Warehouse not found");
    }
    // التحقق من عدم وجوده مسبقاً
    const warehouseExists = bankAccount.warehouseId.some((wId) => wId.toString() === warehouseId);
    if (warehouseExists) {
        throw new BadRequest_1.BadRequest("Warehouse already assigned to this account");
    }
    await Financial_Account_1.BankAccountModel.findByIdAndUpdate(id, {
        $addToSet: { warehouseId: warehouseId }
    });
    const updatedAccount = await Financial_Account_1.BankAccountModel.findById(id)
        .populate("warehouseId", "name location");
    (0, response_1.SuccessResponse)(res, {
        message: "Warehouse added to bank account successfully",
        bankAccount: updatedAccount,
    });
};
exports.addWarehouseToBankAccount = addWarehouseToBankAccount;
// ✅ Remove Warehouse from Bank Account
const removeWarehouseFromBankAccount = async (req, res) => {
    const { id } = req.params;
    const { warehouseId } = req.body;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Valid bank account id is required");
    }
    if (!warehouseId || !mongoose_1.default.Types.ObjectId.isValid(warehouseId)) {
        throw new BadRequest_1.BadRequest("Valid warehouse id is required");
    }
    const bankAccount = await Financial_Account_1.BankAccountModel.findById(id);
    if (!bankAccount) {
        throw new Errors_1.NotFound("Bank account not found");
    }
    // التحقق من أن هناك أكثر من warehouse واحد
    if (bankAccount.warehouseId.length <= 1) {
        throw new BadRequest_1.BadRequest("Cannot remove the last warehouse. Account must have at least one warehouse.");
    }
    await Financial_Account_1.BankAccountModel.findByIdAndUpdate(id, {
        $pull: { warehouseId: warehouseId }
    });
    const updatedAccount = await Financial_Account_1.BankAccountModel.findById(id)
        .populate("warehouseId", "name location");
    (0, response_1.SuccessResponse)(res, {
        message: "Warehouse removed from bank account successfully",
        bankAccount: updatedAccount,
    });
};
exports.removeWarehouseFromBankAccount = removeWarehouseFromBankAccount;
