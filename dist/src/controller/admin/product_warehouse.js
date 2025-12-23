"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLowStockProducts = exports.getAllStocks = exports.getWarehouseProducts = exports.removeProductFromWarehouse = exports.updateProductStock = exports.addProductToWarehouse = void 0;
const products_1 = require("../../models/schema/admin/products");
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
// ==================== إضافة منتج لمخزن ====================
const addProductToWarehouse = async (req, res) => {
    const { productId, WarehouseId, quantity, low_stock } = req.body;
    if (!WarehouseId)
        throw new BadRequest_1.BadRequest("Warehouse ID is required");
    const product = await products_1.ProductModel.findById(productId);
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    const warehouse = await Warehouse_1.WarehouseModel.findById(WarehouseId);
    if (!warehouse)
        throw new NotFound_1.NotFound("Warehouse not found");
    const existingStock = await Product_Warehouse_1.Product_WarehouseModel.findOne({ productId, WarehouseId });
    if (existingStock) {
        throw new BadRequest_1.BadRequest("Product already exists in this warehouse");
    }
    const stock = await Product_Warehouse_1.Product_WarehouseModel.create({
        productId,
        WarehouseId,
        quantity: quantity || 0,
        low_stock: low_stock || 0,
    });
    await Warehouse_1.WarehouseModel.findByIdAndUpdate(WarehouseId, {
        $inc: {
            number_of_products: 1,
            stock_Quantity: quantity || 0,
        },
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Product added to warehouse successfully",
        stock,
    });
};
exports.addProductToWarehouse = addProductToWarehouse;
// ==================== تحديث كمية منتج في مخزن ====================
const updateProductStock = async (req, res) => {
    const { productId, WarehouseId, quantity, low_stock } = req.body;
    const stock = await Product_Warehouse_1.Product_WarehouseModel.findOne({ productId, WarehouseId });
    if (!stock)
        throw new NotFound_1.NotFound("Product not found in this warehouse");
    const oldQuantity = stock.quantity;
    stock.quantity = quantity ?? stock.quantity;
    stock.low_stock = low_stock ?? stock.low_stock;
    await stock.save();
    const quantityDiff = stock.quantity - oldQuantity;
    await Warehouse_1.WarehouseModel.findByIdAndUpdate(WarehouseId, {
        $inc: { stock_Quantity: quantityDiff },
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Stock updated successfully",
        stock,
    });
};
exports.updateProductStock = updateProductStock;
// ==================== حذف منتج من مخزن ====================
const removeProductFromWarehouse = async (req, res) => {
    const { productId, WarehouseId } = req.body;
    const stock = await Product_Warehouse_1.Product_WarehouseModel.findOneAndDelete({ productId, WarehouseId });
    if (!stock)
        throw new NotFound_1.NotFound("Product not found in this warehouse");
    await Warehouse_1.WarehouseModel.findByIdAndUpdate(WarehouseId, {
        $inc: {
            number_of_products: -1,
            stock_Quantity: -stock.quantity,
        },
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Product removed from warehouse successfully",
    });
};
exports.removeProductFromWarehouse = removeProductFromWarehouse;
// ==================== جلب منتجات مخزن معين ====================
const getWarehouseProducts = async (req, res) => {
    const { WarehouseId } = req.params;
    const warehouse = await Warehouse_1.WarehouseModel.findById(WarehouseId);
    if (!warehouse)
        throw new NotFound_1.NotFound("Warehouse not found");
    const stocks = await Product_Warehouse_1.Product_WarehouseModel.find({ WarehouseId })
        .populate({
        path: "productId",
        populate: [{ path: "categoryId" }, { path: "brandId" }],
    })
        .lean();
    const products = stocks.map((stock) => ({
        ...stock.productId,
        quantity: stock.quantity,
        low_stock: stock.low_stock,
        stockId: stock._id,
    }));
    (0, response_1.SuccessResponse)(res, {
        warehouse,
        products,
        totalProducts: products.length,
    });
};
exports.getWarehouseProducts = getWarehouseProducts;
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
const getAllStocks = async (req, res) => {
    const stocks = await Product_Warehouse_1.Product_WarehouseModel.find()
        .populate("productId", "name ar_name code price image")
        .populate("WarehouseId", "name address")
        .lean();
    (0, response_1.SuccessResponse)(res, { stocks });
};
exports.getAllStocks = getAllStocks;
// ==================== جلب المنتجات اللي كميتها قليلة ====================
const getLowStockProducts = async (req, res) => {
    const { WarehouseId } = req.query;
    const filter = {
        $expr: { $lte: ["$quantity", "$low_stock"] },
    };
    if (WarehouseId) {
        filter.WarehouseId = WarehouseId;
    }
    const lowStocks = await Product_Warehouse_1.Product_WarehouseModel.find(filter)
        .populate("productId", "name ar_name code price image")
        .populate("WarehouseId", "name address")
        .lean();
    (0, response_1.SuccessResponse)(res, {
        message: "Low stock products",
        count: lowStocks.length,
        products: lowStocks,
    });
};
exports.getLowStockProducts = getLowStockProducts;
