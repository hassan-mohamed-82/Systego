import { Request, Response } from "express";
import { SelectReasonModel } from "../../models/schema/admin/selectReason";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const createSelectReason =async (req: Request, res: Response) => {
        const { reason } = req.body;
        if (!reason) throw new BadRequest("Reason is required");
if(reason.length < 3) throw new BadRequest("Reason must be at least 3 characters");
const exist = await SelectReasonModel.findOne({ reason });
     if(exist) throw new BadRequest("Reason already exists");
    
        const createReason = await SelectReasonModel.create({ reason });
        if (!createReason) throw new NotFound("Reason not found");
    
        SuccessResponse(res, { message: "Create Reason Successfully", createReason });
}

export const getSelectReason =async (req: Request, res: Response) => {
        const reason = await SelectReasonModel.find();
        if (!reason || reason.length === 0) throw new NotFound("Reason not found");
    
        SuccessResponse(res, { message: "Get Reason Successfully", reason });
}

export const deleteSelectReason =async (req: Request, res: Response) => {
        const { id } = req.params;
        const reason = await SelectReasonModel.findByIdAndDelete(id);
        if (!reason) throw new NotFound("Reason not found");
    
        SuccessResponse(res, { message: "Delete Reason Successfully", reason });
}

export const updateSelectReason =async (req: Request, res: Response) => {
        const { id } = req.params;
        const updateData: any = { ...req.body };
    
        const reason = await SelectReasonModel.findByIdAndUpdate(id, updateData, { new: true });
        if (!reason) throw new NotFound("Reason not found");
    
        SuccessResponse(res, { message: "Update Reason Successfully", reason });
}