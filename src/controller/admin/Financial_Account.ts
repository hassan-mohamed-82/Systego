import { Request, Response } from "express";
import { BankAccountModel } from "../../models/schema/admin/Financial_Account";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import{saveBase64Image}from "../../utils/handleImages"
import { WarehouseModel } from "../../models/schema/admin/Warehouse";


export const createBankAccount = async (req: Request, res: Response) => {
  const { name, warehouseId, image, description, status, in_POS,balance } = req.body;

  const existingAccount = await BankAccountModel.findOne({ name });
  if (existingAccount) {
    throw new BadRequest("Account name already exists");
  }
  const existwarehouse = await WarehouseModel.findById(warehouseId);
  if (!existwarehouse) {
    throw new NotFound("Warehouse not found");
  }

let imageUrl = "";
  if (image) {
    imageUrl = await saveBase64Image(image, Date.now().toString(), req, "category");
  }
  const bankAccount = await BankAccountModel.create({
    name,
    warehouseId,
    image: imageUrl,
    description,
    status,
    in_POS,
    balance
  });

  SuccessResponse(res, { message: "Bank account created successfully", bankAccount });
};

export const getBankAccounts = async (req: Request, res: Response) => {
  const bankAccounts = await BankAccountModel.find().populate("warehouseId", "name");
  SuccessResponse(res, { message: "Bank accounts retrieved successfully", bankAccounts });
}

export const getBankAccountById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Bank account id is required");

  const bankAccount = await BankAccountModel.findById(id).populate("warehouseId", "name");
  if (!bankAccount) throw new NotFound("Bank account not found");
  SuccessResponse(res, { message: "Bank account retrieved successfully", bankAccount });
}

export const deleteBankAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Bank account id is required");
  const bankAccount = await BankAccountModel.findByIdAndDelete(id);
  if (!bankAccount) throw new NotFound("Bank account not found");
  SuccessResponse(res, { message: "Bank account deleted successfully" });
}

export const updateBankAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, warehouseId, image, description, status, in_POS } = req.body;

  if (!id) throw new BadRequest("Bank account id is required");

  const bankAccount = await BankAccountModel.findById(id);
  if (!bankAccount) throw new NotFound("Bank account not found");

  // name
  if (typeof name === "string") {
    bankAccount.name = name;
  }

  // warehouse
  if (warehouseId) {
    const existWarehouse = await WarehouseModel.findById(warehouseId);
    if (!existWarehouse) {
      throw new NotFound("Warehouse not found");
    }
    // لو السكيمة عندك اسمها warhouseId خليه كده
    bankAccount.warehouseId = warehouseId;
    // لو صححتها لـ warehouseId خليه:
    // bankAccount.warehouseId = warehouseId;
  }

  // image (base64)
  if (image) {
    bankAccount.image = await saveBase64Image(
      image,
      Date.now().toString(),
      req,
      "category"
    );
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

  SuccessResponse(res, {
    message: "Bank account updated successfully",
    bankAccount,
  });
};
