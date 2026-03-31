import { OrderTypeModel } from "../../models/schema/admin/ordertype";
import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";

export const getOrderTypes = async (req: Request, res: Response) => {
    const types = await OrderTypeModel.find({ isActive: true });
    SuccessResponse(res, { message: "get all order types successfully", data: types });
};
