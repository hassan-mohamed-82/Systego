import { Request, Response } from "express";
import { TransferModel } from "../../models/schema/admin/Transfer.js";
import { WarehouseModel } from "../../models/schema/admin/Warehouse.js";
import { BadRequest } from "../../Errors/BadRequest.js";
import { NotFound } from "../../Errors/index.js";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse.js";
import { SuccessResponse } from "../../utils/response.js";

export const getproductWarehouse = async (req: Request, res: Response): Promise<void> => {
  const { warehouse_id } = req.params;
    const warehouse = await WarehouseModel.findById(warehouse_id);
    if (!warehouse) throw new NotFound("Warehouse not found");
    const productWarehouses = await Product_WarehouseModel.find({ warehouse_id }).populate('product_id', 'name').populate('variation_id', 'name options').lean();
    SuccessResponse(res, { productWarehouses });
}

export const getproductWarehousebyid = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
    const productWarehouse = await Product_WarehouseModel.findById(id).populate('product_id', 'name').populate('variation_id', 'name options').lean();
    if (!productWarehouse) throw new NotFound("Product Warehouse not found");
    SuccessResponse(res, { productWarehouse });
}