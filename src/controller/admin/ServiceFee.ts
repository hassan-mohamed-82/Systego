import { Request, Response } from "express";
import mongoose from "mongoose";
import { ServiceFeeModel } from "../../models/schema/admin/ServiceFee";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";

export const createServiceFee = async (req: Request, res: Response) => {
  const { title, amount, type, module, warehouseId, status } = req.body;

  if (warehouseId && !mongoose.Types.ObjectId.isValid(warehouseId)) {
    throw new BadRequest("Invalid warehouseId");
  }

  const fee = await ServiceFeeModel.create({
    title,
    amount,
    type,
    module,
    warehouseId: warehouseId || null,
    status,
  });

  const populated = await fee.populate("warehouseId", "name");
  SuccessResponse(res, { message: "Service fee created successfully", fee: populated }, 201);
};

export const getAllServiceFees = async (req: Request, res: Response) => {
  const { module: mod, type, warehouseId, status } = req.query;

  const filter: Record<string, any> = {};
  if (mod) filter.module = mod;
  if (type) filter.type = type;
  if (status !== undefined) filter.status = status === "true";
  if (warehouseId) {
    if (!mongoose.Types.ObjectId.isValid(warehouseId as string)) {
      throw new BadRequest("Invalid warehouseId");
    }
    filter.warehouseId = warehouseId;
  }

  const fees = await ServiceFeeModel.find(filter)
    .populate("warehouseId", "name")
    .sort({ createdAt: -1 });

  SuccessResponse(res, { message: "Service fees fetched successfully", count: fees.length, fees });
};

export const getServiceFeeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequest("Invalid ID");

  const fee = await ServiceFeeModel.findById(id).populate("warehouseId", "name");
  if (!fee) throw new NotFound("Service fee not found");

  SuccessResponse(res, { message: "Service fee fetched successfully", fee });
};

export const updateServiceFee = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequest("Invalid ID");

  const { warehouseId } = req.body;
  if (warehouseId && !mongoose.Types.ObjectId.isValid(warehouseId)) {
    throw new BadRequest("Invalid warehouseId");
  }

  const fee = await ServiceFeeModel.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
    .populate("warehouseId", "name");

  if (!fee) throw new NotFound("Service fee not found");

  SuccessResponse(res, { message: "Service fee updated successfully", fee });
};

export const deleteServiceFee = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequest("Invalid ID");

  const fee = await ServiceFeeModel.findByIdAndDelete(id);
  if (!fee) throw new NotFound("Service fee not found");

  SuccessResponse(res, { message: "Service fee deleted successfully" });
};

export const toggleServiceFeeStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequest("Invalid ID");

  const fee = await ServiceFeeModel.findById(id);
  if (!fee) throw new NotFound("Service fee not found");

  fee.status = !fee.status;
  await fee.save();

  SuccessResponse(res, { message: `Service fee ${fee.status ? "activated" : "deactivated"} successfully`, fee });
};

export const getallwarehouses= async (req: Request, res: Response) => {
    const warehouses = await WarehouseModel.find({ status: "active" }).select("name");
    SuccessResponse(res, { message: "Warehouses retrieved successfully", warehouses });
}