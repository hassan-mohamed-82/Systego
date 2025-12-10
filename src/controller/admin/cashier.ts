import { CashierModel } from "../../models/schema/admin/cashier";
import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors";
import { BadRequest } from "../../Errors/BadRequest";
import { UserModel } from "../../models/schema/admin/User";

export const createCashier = async (req: Request, res: Response) => {
  const { name,ar_name,warehouse_id,status } = req.body;
pppp

/////}