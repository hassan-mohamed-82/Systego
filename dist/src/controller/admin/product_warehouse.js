"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLowStockProducts = exports.getAllStocks = exports.transferStock = exports.getWarehouseProducts = exports.removeProductFromWarehouse = exports.updateProductStock = exports.addProductToWarehouse = void 0;
const products_1 = require("../../models/schema/admin/products");
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
const product_price_1 = require("../../models/schema/admin/product_price");
const mongoose_1 = __importDefault(require("mongoose"));
// ==================== إضافة منتج لمخزن ====================
const addProductToWarehouse = async (req, res) => {
    const { productId, warehouseId, quantity, low_stock } = req.body;
    if (!productId)
        throw new BadRequest_1.BadRequest("Product ID is required");
    if (!warehouseId)
        throw new BadRequest_1.BadRequest("Warehouse ID is required");
    const product = await products_1.ProductModel.findById(productId);
    if (!product)
        throw new NotFound_1.NotFound("Product not found");
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
    if (!warehouse)
        throw new NotFound_1.NotFound("Warehouse not found");
    const existingStock = await Product_Warehouse_1.Product_WarehouseModel.findOne({ productId, warehouseId });
    if (existingStock) {
        throw new BadRequest_1.BadRequest("Product already exists in this warehouse");
    }
    const stock = await Product_Warehouse_1.Product_WarehouseModel.create({
        productId,
        warehouseId,
        quantity: quantity || 0,
        low_stock: low_stock || 0,
    });
    await Warehouse_1.WarehouseModel.findByIdAndUpdate(warehouseId, {
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
    const { id } = req.params;
    const { productId, low_stock } = req.body;
    if (!id)
        throw new BadRequest_1.BadRequest("Stock ID is required");
    const stock = await Product_Warehouse_1.Product_WarehouseModel.findById(id);
    if (!stock)
        throw new NotFound_1.NotFound("Stock not found");
    // ✅ لو بيغير الـ Product
    if (productId && productId !== stock.productId.toString()) {
        const product = await products_1.ProductModel.findById(productId);
        if (!product)
            throw new NotFound_1.NotFound("Product not found");
        const existing = await Product_Warehouse_1.Product_WarehouseModel.findOne({
            productId: productId,
            warehouseId: stock.warehouseId,
            _id: { $ne: id },
        });
        if (existing)
            throw new BadRequest_1.BadRequest("Product already exists in this warehouse");
        stock.productId = productId;
    }
    // ✅ تحديث الـ low_stock
    if (low_stock !== undefined) {
        stock.low_stock = low_stock;
    }
    await stock.save();
    const updatedStock = await Product_Warehouse_1.Product_WarehouseModel.findById(id)
        .populate("productId", "name ar_name image price")
        .populate("warehouseId", "name address");
    (0, response_1.SuccessResponse)(res, {
        message: "Stock updated successfully",
        stock: updatedStock,
    });
};
exports.updateProductStock = updateProductStock;
// ==================== حذف منتج من مخزن ====================
const removeProductFromWarehouse = async (req, res) => {
    const { productId, warehouseId } = req.body;
    if (!productId)
        throw new BadRequest_1.BadRequest("Product ID is required");
    if (!warehouseId)
        throw new BadRequest_1.BadRequest("Warehouse ID is required");
    const stock = await Product_Warehouse_1.Product_WarehouseModel.findOneAndDelete({ productId, warehouseId });
    if (!stock)
        throw new NotFound_1.NotFound("Product not found in this warehouse");
    await Warehouse_1.WarehouseModel.findByIdAndUpdate(warehouseId, {
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
    const { warehouseId } = req.params;
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
    if (!warehouse)
        throw new NotFound_1.NotFound("Warehouse not found");
    const stocks = await Product_Warehouse_1.Product_WarehouseModel.find({ warehouseId })
        .populate({
        path: "productId",
        populate: [{ path: "categoryId" }, { path: "brandId" }],
    })
        .lean();
    const products = await Promise.all(stocks.map(async (stock) => {
        // لو مفيش productId
        if (!stock.productId)
            return null;
        // هات الـ Prices
        const prices = await product_price_1.ProductPriceModel.find({
            productId: stock.productId._id,
        }).lean();
        // هات الـ Options لكل Price
        const pricesWithOptions = await Promise.all(prices.map(async (price) => {
            const priceOptions = await product_price_1.ProductPriceOptionModel.find({
                product_price_id: price._id,
            }).lean();
            // هات تفاصيل كل Option
            const optionsWithDetails = await Promise.all(priceOptions.map(async (po) => {
                if (!po.option_id)
                    return null;
                const option = await mongoose_1.default.model("Option").findById(po.option_id)
                    .populate("variationId", "name ar_name")
                    .lean();
                return option;
            }));
            // فلتر الـ null values
            const validOptions = optionsWithDetails.filter((o) => o !== null);
            return {
                ...price,
                options: validOptions,
            };
        }));
        return {
            ...stock.productId,
            quantity: stock.quantity,
            low_stock: stock.low_stock,
            stockId: stock._id,
            prices: pricesWithOptions,
        };
    }));
    // فلتر الـ null products
    const validProducts = products.filter((p) => p !== null);
    (0, response_1.SuccessResponse)(res, {
        warehouse,
        products: validProducts,
        totalProducts: validProducts.length,
    });
};
exports.getWarehouseProducts = getWarehouseProducts;
// ==================== نقل كمية بين مخزنين ====================
const transferStock = async (req, res) => {
    const { productId, fromWarehouseId, toWarehouseId, quantity } = req.body;
    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
        throw new BadRequest_1.BadRequest("All fields are required");
    }
    if (quantity <= 0)
        throw new BadRequest_1.BadRequest("Quantity must be positive");
    if (fromWarehouseId === toWarehouseId) {
        throw new BadRequest_1.BadRequest("Source and destination warehouses must be different");
    }
    const fromStock = await Product_Warehouse_1.Product_WarehouseModel.findOne({
        productId,
        warehouseId: fromWarehouseId,
    });
    if (!fromStock)
        throw new NotFound_1.NotFound("Product not found in source warehouse");
    if (fromStock.quantity < quantity) {
        throw new BadRequest_1.BadRequest("Insufficient quantity in source warehouse");
    }
    let toStock = await Product_Warehouse_1.Product_WarehouseModel.findOne({
        productId,
        warehouseId: toWarehouseId,
    });
    if (!toStock) {
        toStock = await Product_Warehouse_1.Product_WarehouseModel.create({
            productId,
            warehouseId: toWarehouseId,
            quantity: 0,
            low_stock: fromStock.low_stock,
        });
        await Warehouse_1.WarehouseModel.findByIdAndUpdate(toWarehouseId, {
            $inc: { number_of_products: 1 },
        });
    }
    fromStock.quantity -= quantity;
    toStock.quantity += quantity;
    await fromStock.save();
    await toStock.save();
    await Warehouse_1.WarehouseModel.findByIdAndUpdate(fromWarehouseId, {
        $inc: { stock_Quantity: -quantity },
    });
    await Warehouse_1.WarehouseModel.findByIdAndUpdate(toWarehouseId, {
        $inc: { stock_Quantity: quantity },
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Stock transferred successfully",
        fromStock,
        toStock,
    });
};
exports.transferStock = transferStock;
// ==================== جلب كل الـ Stocks ====================
const getAllStocks = async (req, res) => {
    const stocks = await Product_Warehouse_1.Product_WarehouseModel.find()
        .populate("productId", "name ar_name code price image")
        .populate("warehouseId", "name address")
        .lean();
    (0, response_1.SuccessResponse)(res, { stocks });
};
exports.getAllStocks = getAllStocks;
// ==================== جلب المنتجات اللي كميتها قليلة ====================
const getLowStockProducts = async (req, res) => {
    const { warehouseId } = req.query;
    const filter = {
        $expr: { $lte: ["$quantity", "$low_stock"] },
    };
    if (warehouseId) {
        filter.warehouseId = warehouseId;
    }
    const lowStocks = await Product_Warehouse_1.Product_WarehouseModel.find(filter)
        .populate("productId", "name ar_name code price image")
        .populate("warehouseId", "name address")
        .lean();
    // تنسيق البيانات
    const formattedProducts = lowStocks.map((stock) => ({
        _id: stock._id,
        product: stock.productId,
        warehouse: stock.warehouseId,
        currentQuantity: stock.quantity, // الكمية الحالية
        lowStockThreshold: stock.low_stock, // الحد الأدنى
        shortage: stock.low_stock - stock.quantity, // الكمية الناقصة
        status: stock.quantity === 0 ? "Out of Stock" : "Low Stock",
    }));
    (0, response_1.SuccessResponse)(res, {
        message: "Low stock products",
        count: formattedProducts.length,
        products: formattedProducts,
    });
};
exports.getLowStockProducts = getLowStockProducts;
