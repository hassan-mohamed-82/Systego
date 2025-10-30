import { Request, Response } from "express";
import { TransferModel } from "../../models/schema/admin/Transfer";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/index";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { SuccessResponse } from "../../utils/response";

export const getproductWarehouse = async (req: Request, res: Response): Promise<void> => {
  const { warehouse_id } = req.params;

  const warehouse = await WarehouseModel.findById(warehouse_id);
  if (!warehouse) throw new NotFound("Warehouse not found");

  const productWarehouses = await Product_WarehouseModel.find({ WarehouseId: warehouse_id })
    .populate('productId', 'name')  
    .lean();

  SuccessResponse(res, { productWarehouses });
};


export const getproductWarehousebyid = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
    const productWarehouse = await Product_WarehouseModel.findById(id).populate('product_id', 'name').populate('variation_id', 'name options').lean();
    if (!productWarehouse) throw new NotFound("Product Warehouse not found");
    SuccessResponse(res, { productWarehouse });
}