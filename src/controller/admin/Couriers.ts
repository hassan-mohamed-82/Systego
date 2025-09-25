import { Request, Response } from "express";
import { CourierModel } from "../../models/schema/admin/Couriers";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const createCourier = async (req: Request, res: Response) => {
  const { name, phone_number, address } = req.body;
  if (!name || !phone_number || !address) throw new BadRequest("All fields are required");

  const courier = await CourierModel.create({ name, phone_number, address });
  SuccessResponse(res, { message: "Courier created successfully", courier });
};

export const getCouriers = async (req: Request, res: Response) => {
  const couriers = await CourierModel.find();
  if (!couriers || couriers.length === 0) throw new NotFound("No couriers found");

  SuccessResponse(res, { message: "Get couriers successfully", couriers });
};

export const getCourierById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Courier ID is required");
  const courier = await CourierModel.findById(id);
  if (!courier) throw new NotFound("Courier not found");

  SuccessResponse(res, { message: "Get courier successfully", courier });
};

export const updateCourier = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Courier ID is required");
  const courier = await CourierModel.findByIdAndUpdate(id, req.body, { new: true });
  if (!courier) throw new NotFound("Courier not found");

  SuccessResponse(res, { message: "Courier updated successfully", courier });
};

export const deleteCourier = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Courier ID is required");
  const courier = await CourierModel.findByIdAndDelete(id);
  if (!courier) throw new NotFound("Courier not found");

  SuccessResponse(res, { message: "Courier deleted successfully" });
};
