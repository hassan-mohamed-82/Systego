import { Request, Response } from "express";
import { PickupPointModel } from "../../models/schema/admin/PickupPoint";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

/**
 * Copies the editable fields from a branch (warehouse) onto a pickup point.
 * Used when the owner chooses "pick from my branches" instead of drawing a new
 * location on the map.
 */
const branchDefaults = (branch: any) => ({
  name: branch.name,
  ar_name: branch.ar_name || "",
  address: branch.address || "",
  ar_address: branch.ar_address || "",
  phone: branch.phone || "",
  lat: branch.lat,
  lng: branch.lng,
  branch_id: branch._id,
});

export const createPickupPoint = async (req: Request, res: Response) => {
  const {
    name,
    ar_name,
    address,
    ar_address,
    phone,
    lat,
    lng,
    branch_id,
    is_active,
  } = req.body;

  let payload: any = {
    name,
    ar_name,
    address,
    ar_address,
    phone,
    lat,
    lng,
    branch_id: branch_id || null,
    is_active: is_active !== undefined ? is_active : true,
  };

  // If the owner picked an existing branch and left the fields empty, inherit
  // the branch data so the pickup point is never blank.
  if (branch_id) {
    const branch = await WarehouseModel.findById(branch_id);
    if (!branch) throw new NotFound("Branch not found");
    const defaults = branchDefaults(branch);
    payload = {
      ...defaults,
      ...Object.fromEntries(
        Object.entries(payload).filter(
          ([, v]) => v !== undefined && v !== null && v !== "",
        ),
      ),
      branch_id,
    };
  }

  if (!payload.name) {
    throw new BadRequest("Pickup point name is required");
  }

  const pickupPoint = await PickupPointModel.create(payload);

  SuccessResponse(res, {
    message: "Pickup point created successfully",
    pickupPoint,
  });
};

export const getPickupPoints = async (req: Request, res: Response) => {
  const pickupPoints = await PickupPointModel.find()
    .populate("branch_id", "name ar_name address Is_Online enabled")
    .sort({ createdAt: -1 });

  SuccessResponse(res, {
    message: "Pickup points fetched successfully",
    pickupPoints,
  });
};

export const getPickupPointById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Pickup point id is required");

  const pickupPoint = await PickupPointModel.findById(id).populate(
    "branch_id",
    "name ar_name address Is_Online enabled",
  );
  if (!pickupPoint) throw new NotFound("Pickup point not found");

  SuccessResponse(res, {
    message: "Pickup point fetched successfully",
    pickupPoint,
  });
};

export const updatePickupPoint = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Pickup point id is required");

  const existing = await PickupPointModel.findById(id);
  if (!existing) throw new NotFound("Pickup point not found");

  const {
    name,
    ar_name,
    address,
    ar_address,
    phone,
    lat,
    lng,
    branch_id,
    is_active,
  } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (ar_name !== undefined) updateData.ar_name = ar_name;
  if (address !== undefined) updateData.address = address;
  if (ar_address !== undefined) updateData.ar_address = ar_address;
  if (phone !== undefined) updateData.phone = phone;
  if (lat !== undefined) updateData.lat = lat;
  if (lng !== undefined) updateData.lng = lng;
  if (branch_id !== undefined) updateData.branch_id = branch_id || null;
  if (is_active !== undefined) updateData.is_active = is_active;

  const pickupPoint = await PickupPointModel.findByIdAndUpdate(id, updateData, {
    new: true,
  }).populate("branch_id", "name ar_name address Is_Online enabled");

  SuccessResponse(res, {
    message: "Pickup point updated successfully",
    pickupPoint,
  });
};

export const deletePickupPoint = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Pickup point id is required");

  const pickupPoint = await PickupPointModel.findByIdAndDelete(id);
  if (!pickupPoint) throw new NotFound("Pickup point not found");

  SuccessResponse(res, { message: "Pickup point deleted successfully" });
};
