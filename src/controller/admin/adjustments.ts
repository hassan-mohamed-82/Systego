import { Request, Response } from "express";
import { AdjustmentModel } from "../../models/schema/admin/adjustments";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { ProductModel } from "../../models/schema/admin/products";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import{saveBase64Image} from "../../utils/handleImages"
import { ProductPriceModel } from "../../models/schema/admin/product_price";
import { CategoryModel } from "../../models/schema/admin/category";

export const createAdjustment = async (req: Request, res: Response) => {
  const {  warehouse_id, note,productId,quantity,select_reasonId,image } = req.body;

  if ( !warehouse_id || productId || quantity || select_reasonId) {
    throw new BadRequest("Please provide all required fields");
  }
  // ✅ تأكد إن المخزن موجود

  const warehouse = await WarehouseModel.findById(warehouse_id);
  if (!warehouse) throw new BadRequest("Invalid warehouse ID");
 const product = await Product_WarehouseModel.findById(productId);
  if (!product) throw new BadRequest("Invalid product ID");
  const products= await ProductModel.findById(productId);
  if (!products) throw new BadRequest("Invalid product ID");
  // const productPrice = await ProductPriceModel.findById(productId);
  // if (!productPrice) throw new BadRequest("Invalid product price ID");
  // const category = await CategoryModel.findById(products.categoryId);
  // if(!category) throw new BadRequest("Invalid category ID");
  let image_url =" ";
  if(image){
    image_url = await saveBase64Image(image, Date.now().toString(), req, "adjustments");
  }

  const adjustment = await AdjustmentModel.create({
    productId,
    quantity,
    select_reasonId,
    warehouse_id,
    note,
    image:image_url
  });
  if(quantity > product.quantity) throw new BadRequest("Insufficient product quantity");
  if(quantity == product.quantity){
    warehouse.stock_Quantity -=1;
  }
  product.quantity -= quantity;
  await product.save();

  products.quantity -= quantity;
  await products.save();


  SuccessResponse(res, { message: "Adjustment created successfully", adjustment });
};

export const getAdjustments = async (req: Request, res: Response) => {
  const adjustments = await AdjustmentModel.find().populate("warehouse_id","name address").populate("select_reasonId").populate("productId","name");
  SuccessResponse(res, { message: "Get adjustments successfully", adjustments });
};

export const getAdjustmentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Adjustment ID is required");

  const adjustment = await AdjustmentModel.findById(id)
  .populate("warehouse_id","name address")
  .populate("select_reasonId")
  .populate("productId","name");

  if (!adjustment) throw new NotFound("Adjustment not found");

  SuccessResponse(res, { message: "Get adjustment successfully", adjustment });
};



