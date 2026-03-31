import { OrderTypeModel } from "../../models/schema/admin/ordertype";
import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";

export const getOrderTypes = async (req: Request, res: Response) => {
    const types = await OrderTypeModel.find();
    SuccessResponse(res, { message: "get all order types successfully", data: types });
};

export const updateOrderTypeStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("order type id is required");
    const { isActive } = req.body;

    const orderType = await OrderTypeModel.findById(id);
    if (!orderType) throw new NotFound("order type not found");

    const updated = await OrderTypeModel.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
    );

    SuccessResponse(res, { message: "update order type successfully", data: updated });
};