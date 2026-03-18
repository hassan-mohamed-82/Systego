import { Request, Response } from "express";
import mongoose from "mongoose";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { CourierModel } from "../../models/schema/admin/Couriers";
import { ProductModel } from "../../models/schema/admin/products";

const DEFAULT_FILTER = { singletonKey: "default" };

const ensureSettings = async () => {
  let settings = await ShippingSettingsModel.findOne(DEFAULT_FILTER);

  if (!settings) {
    settings = await ShippingSettingsModel.create(DEFAULT_FILTER);
  }

  return settings;
};

export const getShippingSettings = async (_req: Request, res: Response) => {
  const settings = await ensureSettings();

  SuccessResponse(res, {
    message: "Shipping settings fetched successfully",
    settings,
  });
};

export const updateShippingSettings = async (req: Request, res: Response) => {
  const {
    shippingMethod,
    flatRate,
    carrierRate,
    carrierId,
    freeShippingEnabled,
  } = req.body;

  if (shippingMethod === "flat_rate" && (flatRate === undefined || flatRate === null)) {
    throw new BadRequest("flatRate is required when shipping method is flat_rate");
  }

  if (shippingMethod === "carrier" && (carrierRate === undefined || carrierRate === null)) {
    throw new BadRequest("carrierRate is required when shipping method is carrier");
  }

  if (carrierId) {
    if (!mongoose.Types.ObjectId.isValid(carrierId)) {
      throw new BadRequest("Invalid carrierId");
    }

    const courier = await CourierModel.findById(carrierId);
    if (!courier) {
      throw new BadRequest("Courier not found");
    }
  }

  const settings = await ensureSettings();
  settings.shippingMethod = shippingMethod;

  if (shippingMethod === "zone") {
    settings.flatRate = 0;
    settings.carrierRate = 0;
    settings.set("carrierId", undefined);
  }

  if (shippingMethod === "flat_rate") {
    settings.flatRate = Number(flatRate);
    settings.carrierRate = 0;
    settings.set("carrierId", undefined);
  }

  if (shippingMethod === "carrier") {
    settings.carrierRate = Number(carrierRate);
    settings.set("carrierId", carrierId ?? undefined);
    settings.flatRate = 0;
  }

  if (freeShippingEnabled !== undefined) {
    settings.freeShippingEnabled = freeShippingEnabled;
  }

  await settings.save();

  SuccessResponse(res, {
    message: "Shipping settings updated successfully",
    settings,
  });
};

export const getFreeShippingProducts = async (_req: Request, res: Response) => {
  const products = await ProductModel.find(
    { free_shipping: true },
    { name: 1, ar_name: 1, code: 1, free_shipping: 1 }
  ).sort({ createdAt: -1 });

  SuccessResponse(res, {
    message: "Free shipping products fetched successfully",
    count: products.length,
    products,
  });
};

export const updateFreeShippingProducts = async (req: Request, res: Response) => {
  const { productIds } = req.body as { productIds: string[] };

  const uniqueProductIds = Array.from(new Set(productIds || []));

  for (const id of uniqueProductIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequest(`Invalid product id: ${id}`);
    }
  }

  const existingProductsCount = await ProductModel.countDocuments({
    _id: { $in: uniqueProductIds },
  });

  if (existingProductsCount !== uniqueProductIds.length) {
    throw new BadRequest("One or more products were not found");
  }

  await ProductModel.updateMany({}, { $set: { free_shipping: false } });

  if (uniqueProductIds.length > 0) {
    await ProductModel.updateMany(
      { _id: { $in: uniqueProductIds } },
      { $set: { free_shipping: true } }
    );
  }

  const products = await ProductModel.find(
    { free_shipping: true },
    { name: 1, ar_name: 1, code: 1, free_shipping: 1 }
  ).sort({ createdAt: -1 });

  SuccessResponse(res, {
    message: "Free shipping products updated successfully",
    count: products.length,
    products,
  });
};
