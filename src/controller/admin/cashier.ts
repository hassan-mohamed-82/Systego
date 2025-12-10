import { CashierModel } from "../../models/schema/admin/cashier";
import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors";
import { BadRequest } from "../../Errors/BadRequest";
import { UserModel } from "../../models/schema/admin/User";

export const createCashier = async (req: Request, res: Response) => {
  const { name,ar_name,warehouse_id,status } = req.body;
    if (!name || !ar_name || !warehouse_id) {
        throw new BadRequest(" name, ar_name and warehouse_id are required");
    }
    const existingCashier = await CashierModel.findOne({ name,warehouse_id });
    if (existingCashier) throw new BadRequest("Cashier already exists in this warehouse");
    const cashier = await CashierModel.create({ name, ar_name,warehouse_id,status });
    SuccessResponse(res, { message: "Cashier created successfully", cashier });
}

export const deleteCashier = async (req: Request, res: Response) => {
    const { id } = req.params;
    const cashier = await CashierModel.findById(id);
    if (!cashier) throw new NotFound("Cashier not found");
    await CashierModel.findByIdAndDelete(id);
    SuccessResponse(res, { message: "Cashier deleted successfully" });
}

export const getCashiers = async (req: Request, res: Response) => {
  const cashiers = await CashierModel.find()
    .populate("warehouse_id", "name") // اسم المخزن
    .populate({
      path: "users",
      select: "username email role status warehouseId", // الحقول اللي محتاجها من User
    })
    .populate({
      path: "bankAccounts",
      select: "name balance status in_POS warehouseId", // الحقول اللي محتاجها من BankAccount
    });

  SuccessResponse(res, {
    message: "Cashiers with their users and bank accounts",
    cashiers,
  });
};


export const updateCashier = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, ar_name,warehouse_id,status } = req.body;
    const cashier = await CashierModel.findById(id);
    if (!cashier) throw new NotFound("Cashier not found");
    if (name) cashier.name = name;
    if (ar_name) cashier.ar_name = ar_name;
    if (warehouse_id) cashier.warehouse_id = warehouse_id;
    if (status) cashier.status = status;
    await cashier.save();
    SuccessResponse(res, { message: "Cashier updated successfully", cashier });
}
