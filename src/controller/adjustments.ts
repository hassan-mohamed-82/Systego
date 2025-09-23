import { Request, Response } from "express";
import { AdjustmentModel } from "../models/schema/adjustments";
import { WarehouseModel } from "../models/schema/Warehouse";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors";
import { SuccessResponse } from "../utils/response";

export const createAdjustment = async (req: Request, res: Response) => {
  const { date, reference, warehouse_id, note } = req.body;

  if (!date || !reference || !warehouse_id) {
    throw new BadRequest("Please provide all required fields");
  }
  // ✅ تأكد إن المخزن موجود
  const warehouse = await WarehouseModel.findById(warehouse_id);
  if (!warehouse) throw new BadRequest("Invalid warehouse ID");

  const adjustment = await AdjustmentModel.create({
    date,
    reference,
    warehouse_id,
    note,
  });

  SuccessResponse(res, { message: "Adjustment created successfully", adjustment });
};

export const getAdjustments = async (req: Request, res: Response) => {
  const adjustments = await AdjustmentModel.find().populate("warehouse_id","name address");
  if (!adjustments || adjustments.length === 0) throw new NotFound("No adjustments found");

  SuccessResponse(res, { message: "Get adjustments successfully", adjustments });
};

export const getAdjustmentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Adjustment ID is required");

  const adjustment = await AdjustmentModel.findById(id).populate("warehouse_id","name address");
  if (!adjustment) throw new NotFound("Adjustment not found");

  SuccessResponse(res, { message: "Get adjustment successfully", adjustment });
};

export const updateAdjustment = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Adjustment ID is required");

  const adjustment = await AdjustmentModel.findByIdAndUpdate(id, req.body, { new: true });
  if (!adjustment) throw new NotFound("Adjustment not found");

  SuccessResponse(res, { message: "Adjustment updated successfully", adjustment });
};

export const deleteAdjustment = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Adjustment ID is required");

  const adjustment = await AdjustmentModel.findByIdAndDelete(id);
  if (!adjustment) throw new NotFound("Adjustment not found");

  SuccessResponse(res, { message: "Adjustment deleted successfully" });
};
