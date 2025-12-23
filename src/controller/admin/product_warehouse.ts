// controllers/StockController.ts
import { Request, Response } from "express";
import { ProductModel } from "../../models/schema/admin/products";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { SuccessResponse } from "../../utils/response";

// ==================== إضافة منتج لمخزن ====================
export const addProductToWarehouse = async (req: Request, res: Response) => {
  const { productId,WarehouseId, quantity, low_stock } = req.body;

  if (!WarehouseId) throw new BadRequest("Warehouse ID is required");

  const product = await ProductModel.findById(productId);
  if (!product) throw new NotFound("Product not found");

  const warehouse = await WarehouseModel.findById(WarehouseId);
  if (!warehouse) throw new NotFound("Warehouse not found");

  const existingStock = await Product_WarehouseModel.findOne({ productId, WarehouseId });
  if (existingStock) {
    throw new BadRequest("Product already exists in this warehouse");
  }

  const stock = await Product_WarehouseModel.create({
    productId,
    WarehouseId,
    quantity: quantity || 0,
    low_stock: low_stock || 0,
  });

  await WarehouseModel.findByIdAndUpdate(WarehouseId, {
    $inc: {
      number_of_products: 1,
      stock_Quantity: quantity || 0,
    },
  });

  SuccessResponse(res, {
    message: "Product added to warehouse successfully",
    stock,
  });
};

// ==================== تحديث كمية منتج في مخزن ====================
export const updateProductStock = async (req: Request, res: Response) => {
  const {productId, WarehouseId, quantity, low_stock } = req.body;

  const stock = await Product_WarehouseModel.findOne({ productId, WarehouseId });
  if (!stock) throw new NotFound("Product not found in this warehouse");

  const oldQuantity = stock.quantity;

  stock.quantity = quantity ?? stock.quantity;
  stock.low_stock = low_stock ?? stock.low_stock;
  await stock.save();

  const quantityDiff = stock.quantity - oldQuantity;
  await WarehouseModel.findByIdAndUpdate(WarehouseId, {
    $inc: { stock_Quantity: quantityDiff },
  });

  SuccessResponse(res, {
    message: "Stock updated successfully",
    stock,
  });
};

// ==================== حذف منتج من مخزن ====================
export const removeProductFromWarehouse = async (req: Request, res: Response) => {
  const { productId, WarehouseId } = req.body;

  const stock = await Product_WarehouseModel.findOneAndDelete({ productId, WarehouseId });
  if (!stock) throw new NotFound("Product not found in this warehouse");

  await WarehouseModel.findByIdAndUpdate(WarehouseId, {
    $inc: {
      number_of_products: -1,
      stock_Quantity: -stock.quantity,
    },
  });

  SuccessResponse(res, {
    message: "Product removed from warehouse successfully",
  });
};

// ==================== جلب منتجات مخزن معين ====================
export const getWarehouseProducts = async (req: Request, res: Response) => {
  const { WarehouseId } = req.params;

  const warehouse = await WarehouseModel.findById(WarehouseId);
  if (!warehouse) throw new NotFound("Warehouse not found");

  const stocks = await Product_WarehouseModel.find({ WarehouseId })
    .populate({
      path: "productId",
      populate: [{ path: "categoryId" }, { path: "brandId" }],
    })
    .lean();

  const products = stocks.map((stock: any) => ({
    ...stock.productId,
    quantity: stock.quantity,
    low_stock: stock.low_stock,
    stockId: stock._id,
  }));

  SuccessResponse(res, {
    warehouse,
    products,
    totalProducts: products.length,
  });
};

// ==================== نقل كمية بين مخزنين ====================
// export const transferStock = async (req: Request, res: Response) => {
//   const { productId, fromWarehouseId, toWarehouseId, quantity } = req.body;

//   if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
//     throw new BadRequest("All fields are required");
//   }

//   if (quantity <= 0) throw new BadRequest("Quantity must be positive");
//   if (fromWarehouseId === toWarehouseId) {
//     throw new BadRequest("Source and destination warehouses must be different");
//   }

//   const fromStock = await Product_WarehouseModel.findOne({
//     productId,
//     WarehouseId: fromWarehouseId,
//   });
//   if (!fromStock) throw new NotFound("Product not found in source warehouse");
//   if (fromStock.quantity < quantity) {
//     throw new BadRequest("Insufficient quantity in source warehouse");
//   }

//   let toStock = await Product_WarehouseModel.findOne({
//     productId,
//     WarehouseId: toWarehouseId,
//   });

//   if (!toStock) {
//     toStock = await Product_WarehouseModel.create({
//       productId,
//       WarehouseId: toWarehouseId,
//       quantity: 0,
//       low_stock: fromStock.low_stock,
//     });

//     await WarehouseModel.findByIdAndUpdate(toWarehouseId, {
//       $inc: { number_of_products: 1 },
//     });
//   }

//   fromStock.quantity -= quantity;
//   toStock.quantity += quantity;

//   await fromStock.save();
//   await toStock.save();

//   await WarehouseModel.findByIdAndUpdate(fromWarehouseId, {
//     $inc: { stock_Quantity: -quantity },
//   });
//   await WarehouseModel.findByIdAndUpdate(toWarehouseId, {
//     $inc: { stock_Quantity: quantity },
//   });

//   SuccessResponse(res, {
//     message: "Stock transferred successfully",
//     fromStock,
//     toStock,
//   });
// };

// ==================== جلب كل الـ Stocks ====================
export const getAllStocks = async (req: Request, res: Response) => {
  const stocks = await Product_WarehouseModel.find()
    .populate("productId", "name ar_name code price image")
    .populate("WarehouseId", "name address")
    .lean();

  SuccessResponse(res, { stocks });
};

// ==================== جلب المنتجات اللي كميتها قليلة ====================
export const getLowStockProducts = async (req: Request, res: Response) => {
  const { WarehouseId } = req.query;

  const filter: any = {
    $expr: { $lte: ["$quantity", "$low_stock"] },
  };

  if (WarehouseId) {
    filter.WarehouseId = WarehouseId;
  }

  const lowStocks = await Product_WarehouseModel.find(filter)
    .populate("productId", "name ar_name code price image")
    .populate("WarehouseId", "name address")
    .lean();

  SuccessResponse(res, {
    message: "Low stock products",
    count: lowStocks.length,
    products: lowStocks,
  });
};
