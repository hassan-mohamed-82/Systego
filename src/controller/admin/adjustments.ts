import { Request, Response } from "express";
import { AdjustmentModel } from "../../models/schema/admin/adjustments";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { ProductModel } from "../../models/schema/admin/products";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { saveBase64Image } from "../../utils/handleImages";
import { ProductPriceModel } from "../../models/schema/admin/product_price";
import { CategoryModel } from "../../models/schema/admin/category";

export const createAdjustment = async (req: Request, res: Response) => {
  const { warehouse_id, note, productId, quantity, select_reasonId, image } =
    req.body;

  if (!warehouse_id || !productId || !quantity || !select_reasonId) {
    throw new BadRequest("Please provide all required fields");
  }

  if (quantity <= 0) {
    throw new BadRequest("Quantity must be greater than 0");
  }

  // ✅ تأكد إن المخزن موجود
  const warehouse = await WarehouseModel.findById(warehouse_id);
  if (!warehouse) throw new BadRequest("Invalid warehouse ID");

  const products = await ProductModel.findById(productId);
  if (!products) throw new BadRequest("Invalid product ID");

  // ✅ atomic, race-safe decrement on the per-warehouse stock row
  const updatedProductWarehouse = await Product_WarehouseModel.findOneAndUpdate(
    { productId, warehouseId: warehouse_id, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { new: true }
  );
  if (!updatedProductWarehouse) {
    // either the product isn't stocked in this warehouse, or not enough quantity
    throw new BadRequest("Insufficient product quantity in this warehouse");
  }

  let image_url = "";
  if (image) {
    image_url = await saveBase64Image(
      image,
      Date.now().toString(),
      req,
      "adjustments"
    );
  }

  let adjustment;
  try {
    adjustment = await AdjustmentModel.create({
      productId,
      quantity,
      select_reasonId,
      warehouse_id,
      note,
      image: image_url,
    });
  } catch (err) {
    // ✅ no transactions on standalone Mongo — manually roll back the stock decrement
    await Product_WarehouseModel.updateOne(
      { productId, warehouseId: warehouse_id },
      { $inc: { quantity } }
    );
    throw err;
  }

  // ✅ keep the global product quantity in sync, atomically, guarded against going negative
  await ProductModel.updateOne(
    { _id: productId, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } }
  );

  // ✅ decrement warehouse total stock by the actual quantity moved, and persist it
  await WarehouseModel.updateOne(
    { _id: warehouse_id, stock_Quantity: { $gte: quantity } },
    { $inc: { stock_Quantity: -quantity } }
  );

  SuccessResponse(res, {
    message: "Adjustment created successfully",
    adjustment,
  });
};

export const getAdjustments = async (req: Request, res: Response) => {
  const adjustments = await AdjustmentModel.find()
    .populate("warehouse_id", "name address")
    .populate("select_reasonId")
    .populate("productId", "name");
  SuccessResponse(res, {
    message: "Get adjustments successfully",
    adjustments,
  });
};

export const getAdjustmentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Adjustment ID is required");

  const adjustment = await AdjustmentModel.findById(id)
    .populate("warehouse_id", "name address")
    .populate("select_reasonId")
    .populate("productId", "name");

  if (!adjustment) throw new NotFound("Adjustment not found");

  SuccessResponse(res, { message: "Get adjustment successfully", adjustment });
};
