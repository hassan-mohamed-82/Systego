import { Request, Response } from "express";
import mongoose from "mongoose";
import { BankAccountModel } from "../../models/schema/admin/Financial_Account";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { saveBase64Image } from "../../utils/handleImages";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";

// ✅ Helper function للتحقق من الـ warehouses
const validateWarehouses = async (warehouseIds: string | string[]) => {
  // تحويل لـ Array لو مش Array
  const ids = Array.isArray(warehouseIds) ? warehouseIds : [warehouseIds];
  
  // التحقق من صحة كل ID
  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequest(`Invalid warehouse id: ${id}`);
    }
  }

  // التحقق من وجود كل الـ warehouses
  const warehouses = await WarehouseModel.find({ _id: { $in: ids } });
  
  if (warehouses.length !== ids.length) {
    const foundIds = warehouses.map(w => w._id.toString());
    const notFoundIds = ids.filter(id => !foundIds.includes(id));
    throw new NotFound(`Warehouses not found: ${notFoundIds.join(", ")}`);
  }

  return ids;
};

// ✅ Create Bank Account
export const createBankAccount = async (req: Request, res: Response) => {
  const { name, warehouseId, image, description, status, in_POS, balance } = req.body;

  if (!name || !name.trim()) {
    throw new BadRequest("Account name is required");
  }

  if (!warehouseId) {
    throw new BadRequest("At least one warehouse is required");
  }

  // التحقق من عدم تكرار الاسم
  const existingAccount = await BankAccountModel.findOne({ name: name.trim() });
  if (existingAccount) {
    throw new BadRequest("Account name already exists");
  }

  // ✅ التحقق من الـ warehouses (يدعم single و array)
  const validWarehouseIds = await validateWarehouses(warehouseId);

  // معالجة الصورة
  let imageUrl = "";
  if (image) {
    imageUrl = await saveBase64Image(image, Date.now().toString(), req, "bank-account");
  }

  const bankAccount = await BankAccountModel.create({
    name: name.trim(),
    warehouseId: validWarehouseIds,
    image: imageUrl,
    description: description?.trim() || "",
    status: status !== undefined ? status : true,
    in_POS: in_POS !== undefined ? in_POS : false,
    balance: Number(balance) || 0,
  });

  const populatedAccount = await BankAccountModel.findById(bankAccount._id)
    .populate("warehouseId", "name location");

  SuccessResponse(res, { 
    message: "Bank account created successfully", 
    bankAccount: populatedAccount 
  });
};

// ✅ Get All Bank Accounts
export const getBankAccounts = async (req: Request, res: Response) => {
  const { warehouse_id, status, in_POS } = req.query;

  const filter: any = {};

  // فلترة بالـ warehouse
  if (warehouse_id) {
    if (!mongoose.Types.ObjectId.isValid(warehouse_id as string)) {
      throw new BadRequest("Invalid warehouse_id");
    }
    filter.warehouseId = warehouse_id;
  }

  // فلترة بالـ status
  if (status !== undefined) {
    if (typeof status === "string") {
      filter.status = status.toLowerCase() === "true";
    } else if (typeof status === "boolean") {
      filter.status = status;
    }
    // ignore other types (e.g., object/array)
  }

  // فلترة بالـ in_POS
  if (in_POS !== undefined) {
    // Convert to boolean only if value is string "true"
    if (typeof in_POS === "string") {
      filter.in_POS = in_POS.toLowerCase() === "true";
    } else if (typeof in_POS === "boolean") {
      filter.in_POS = in_POS;
    }
    // ignore other types (e.g., object/array)
  }

  const bankAccounts = await BankAccountModel.find(filter)
    .populate("warehouseId", "name location")
    .sort({ createdAt: -1 });

  SuccessResponse(res, { 
    message: "Bank accounts retrieved successfully", 
    count: bankAccounts.length,
    bankAccounts 
  });
};

// ✅ Get Bank Accounts for POS (by warehouse)
export const getBankAccountsForPOS = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const bankAccounts = await BankAccountModel.find({
    warehouseId: warehouseId,
    status: true,
    in_POS: true,
  })
    .select("name image balance")
    .sort({ name: 1 });

  SuccessResponse(res, { 
    message: "POS bank accounts retrieved successfully", 
    bankAccounts 
  });
};

// ✅ Get Bank Account By ID
export const getBankAccountById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Valid bank account id is required");
  }

  const bankAccount = await BankAccountModel.findById(id)
    .populate("warehouseId", "name location");

  if (!bankAccount) {
    throw new NotFound("Bank account not found");
  }

  SuccessResponse(res, { 
    message: "Bank account retrieved successfully", 
    bankAccount 
  });
};

// ✅ Update Bank Account
export const updateBankAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, warehouseId, image, description, status, in_POS, balance } = req.body;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Valid bank account id is required");
  }

  const bankAccount = await BankAccountModel.findById(id);
  if (!bankAccount) {
    throw new NotFound("Bank account not found");
  }

  // ✅ تحديث الاسم
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new BadRequest("Name must be a non-empty string");
    }

    // التحقق من عدم تكرار الاسم (باستثناء الحساب الحالي)
    const existingAccount = await BankAccountModel.findOne({ 
      name: name.trim(),
      _id: { $ne: id }
    });
    if (existingAccount) {
      throw new BadRequest("Account name already exists");
    }

    bankAccount.name = name.trim();
  }

  // ✅ تحديث الـ warehouses
  if (warehouseId !== undefined) {
    if (!warehouseId || (Array.isArray(warehouseId) && warehouseId.length === 0)) {
      throw new BadRequest("At least one warehouse is required");
    }
    const validWarehouseIds = await validateWarehouses(warehouseId);
    bankAccount.warehouseId = validWarehouseIds as any;
  }

  // ✅ تحديث الصورة
  if (image) {
    bankAccount.image = await saveBase64Image(
      image,
      Date.now().toString(),
      req,
      "bank-account"
    );
  }

  // ✅ تحديث الوصف
  if (description !== undefined) {
    bankAccount.description = typeof description === "string" ? description.trim() : "";
  }

  // ✅ تحديث الـ status
  if (status !== undefined) {
    if (typeof status !== "boolean") {
      throw new BadRequest("Status must be a boolean");
    }
    bankAccount.status = status;
  }

  // ✅ تحديث الـ in_POS
  if (in_POS !== undefined) {
    if (typeof in_POS !== "boolean") {
      throw new BadRequest("in_POS must be a boolean");
    }
    bankAccount.in_POS = in_POS;
  }

  // ✅ تحديث الـ balance (اختياري - عادة يتم عبر transactions)
  if (balance !== undefined) {
    const numBalance = Number(balance);
    if (isNaN(numBalance)) {
      throw new BadRequest("Balance must be a number");
    }
    bankAccount.balance = numBalance;
  }

  await bankAccount.save();

  const updatedAccount = await BankAccountModel.findById(id)
    .populate("warehouseId", "name location");

  SuccessResponse(res, {
    message: "Bank account updated successfully",
    bankAccount: updatedAccount,
  });
};

// ✅ Delete Bank Account
export const deleteBankAccount = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Valid bank account id is required");
  }

  const bankAccount = await BankAccountModel.findById(id);
  if (!bankAccount) {
    throw new NotFound("Bank account not found");
  }

  // ✅ التحقق من عدم وجود رصيد (اختياري)
  if (bankAccount.balance !== 0) {
    throw new BadRequest(
      `Cannot delete account with non-zero balance (${bankAccount.balance}). Please transfer the balance first.`
    );
  }

  await BankAccountModel.findByIdAndDelete(id);

  SuccessResponse(res, { 
    message: "Bank account deleted successfully" 
  });
};

// ✅ Add Warehouse to Bank Account
export const addWarehouseToBankAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { warehouseId } = req.body;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Valid bank account id is required");
  }

  if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
    throw new BadRequest("Valid warehouse id is required");
  }

  const bankAccount = await BankAccountModel.findById(id);
  if (!bankAccount) {
    throw new NotFound("Bank account not found");
  }

  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse) {
    throw new NotFound("Warehouse not found");
  }

  // التحقق من عدم وجوده مسبقاً
  const warehouseExists = bankAccount.warehouseId.some(
    (wId: any) => wId.toString() === warehouseId
  );

  if (warehouseExists) {
    throw new BadRequest("Warehouse already assigned to this account");
  }

  await BankAccountModel.findByIdAndUpdate(id, {
    $addToSet: { warehouseId: warehouseId }
  });

  const updatedAccount = await BankAccountModel.findById(id)
    .populate("warehouseId", "name location");

  SuccessResponse(res, {
    message: "Warehouse added to bank account successfully",
    bankAccount: updatedAccount,
  });
};

// ✅ Remove Warehouse from Bank Account
export const removeWarehouseFromBankAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { warehouseId } = req.body;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Valid bank account id is required");
  }

  if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
    throw new BadRequest("Valid warehouse id is required");
  }

  const bankAccount = await BankAccountModel.findById(id);
  if (!bankAccount) {
    throw new NotFound("Bank account not found");
  }

  // التحقق من أن هناك أكثر من warehouse واحد
  if (bankAccount.warehouseId.length <= 1) {
    throw new BadRequest("Cannot remove the last warehouse. Account must have at least one warehouse.");
  }

  await BankAccountModel.findByIdAndUpdate(id, {
    $pull: { warehouseId: warehouseId }
  });

  const updatedAccount = await BankAccountModel.findById(id)
    .populate("warehouseId", "name location");

  SuccessResponse(res, {
    message: "Warehouse removed from bank account successfully",
    bankAccount: updatedAccount,
  });
};
