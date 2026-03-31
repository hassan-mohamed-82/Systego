import { Request, Response } from "express";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { SuccessResponse } from "../../utils/response";

export const getWarehouses = async (req: Request, res: Response) => {
    const warehouses = await WarehouseModel.find();
    SuccessResponse(res, { message: "Get warehouses successfully", data: warehouses });
};
