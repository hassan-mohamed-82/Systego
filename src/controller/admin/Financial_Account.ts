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
  if (name) bankAccount.name = name;
  if (warehouseId) {
    const existwarhouse = await WarehouseModel.findById(warehouseId);
    if (!existwarhouse) {
      throw new NotFound("Warhouse not found");
    } }
    bankAccount.warehouseId = warehouseId;
  if (image) {
    bankAccount.image = await saveBase64Image(image, Date.now().toString(), req, "category");
  }
  if (description) bankAccount.description = description;
  if (status) bankAccount.status = status;
  if (in_POS) bankAccount.in_POS = in_POS;
  await bankAccount.save();
  SuccessResponse(res, { message: "Bank account updated successfully", bankAccount });
}

