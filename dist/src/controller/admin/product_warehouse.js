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
// ==================== إضافة منتج لمخزن (مع دعم الـ Variations) ====================
const addProductToWarehouse = async (req, res) => {
    const { productId, productPriceId, warehouseId, quantity, low_stock } = req.body;
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
    // ✅ لو فيه productPriceId، نتحقق منه
    if (productPriceId) {
        const productPrice = await product_price_1.ProductPriceModel.findById(productPriceId);
        if (!productPrice)
            throw new NotFound_1.NotFound("Product variation not found");
        // التأكد من أن الـ variation تابع للمنتج الصحيح
        if (productPrice.productId.toString() !== productId) {
            throw new BadRequest_1.BadRequest("Product variation does not belong to this product");
        }
    }
    // ✅ بناء query للبحث عن المنتج/الـ variation في المخزن
    const existingQuery = { productId, warehouseId };
    if (productPriceId) {
        existingQuery.productPriceId = productPriceId;
    }
    else {
        existingQuery.productPriceId = null;
    }
    const existingStock = await Product_Warehouse_1.Product_WarehouseModel.findOne(existingQuery);
    if (existingStock) {
        const variationText = productPriceId ? " (this variation)" : "";
        throw new BadRequest_1.BadRequest(`Product${variationText} already exists in this warehouse`);
    }
    const stock = await Product_Warehouse_1.Product_WarehouseModel.create({
        productId,
        productPriceId: productPriceId || null,
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
    // populate للـ response
    const populatedStock = await Product_Warehouse_1.Product_WarehouseModel.findById(stock._id)
        .populate("productId", "name ar_name image price")
        .populate("productPriceId", "price code")
        .populate("warehouseId", "name address");
    (0, response_1.SuccessResponse)(res, {
        message: "Product added to warehouse successfully",
        stock: populatedStock,
    });
};
exports.addProductToWarehouse = addProductToWarehouse;
// ==================== تحديث كمية منتج في مخزن (مع دعم الـ Variations) ====================
const updateProductStock = async (req, res) => {
    const { id } = req.params;
    const { productId, productPriceId, low_stock } = req.body;
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
        // بناء query للتحقق من وجود المنتج/الـ variation في نفس المخزن
        const existingQuery = {
            productId: productId,
            warehouseId: stock.warehouseId,
            _id: { $ne: id },
        };
        // لو فيه productPriceId جديد
        if (productPriceId !== undefined) {
            existingQuery.productPriceId = productPriceId || null;
        }
        else {
            existingQuery.productPriceId = stock.productPriceId;
        }
        const existing = await Product_Warehouse_1.Product_WarehouseModel.findOne(existingQuery);
        if (existing)
            throw new BadRequest_1.BadRequest("Product already exists in this warehouse");
        stock.productId = productId;
    }
    // ✅ لو بيغير الـ Variation
    if (productPriceId !== undefined) {
        if (productPriceId) {
            const productPrice = await product_price_1.ProductPriceModel.findById(productPriceId);
            if (!productPrice)
                throw new NotFound_1.NotFound("Product variation not found");
            if (productPrice.productId.toString() !== stock.productId.toString()) {
                throw new BadRequest_1.BadRequest("Product variation does not belong to this product");
            }
        }
        stock.productPriceId = productPriceId || null;
    }
    // ✅ تحديث الـ low_stock
    if (low_stock !== undefined) {
        stock.low_stock = low_stock;
    }
    await stock.save();
    const updatedStock = await Product_Warehouse_1.Product_WarehouseModel.findById(id)
        .populate("productId", "name ar_name image price")
        .populate("productPriceId", "price code")
        .populate("warehouseId", "name address");
    (0, response_1.SuccessResponse)(res, {
        message: "Stock updated successfully",
        stock: updatedStock,
    });
};
exports.updateProductStock = updateProductStock;
// ==================== حذف منتج من مخزن (مع دعم الـ Variations) ====================
const removeProductFromWarehouse = async (req, res) => {
    const { productId, productPriceId, warehouseId } = req.body;
    if (!productId)
        throw new BadRequest_1.BadRequest("Product ID is required");
    if (!warehouseId)
        throw new BadRequest_1.BadRequest("Warehouse ID is required");
    // بناء query للحذف
    const deleteQuery = { productId, warehouseId };
    if (productPriceId) {
        deleteQuery.productPriceId = productPriceId;
    }
    else {
        deleteQuery.productPriceId = null;
    }
    const stock = await Product_Warehouse_1.Product_WarehouseModel.findOneAndDelete(deleteQuery);
    if (!stock) {
        const variationText = productPriceId ? " (this variation)" : "";
        throw new NotFound_1.NotFound(`Product${variationText} not found in this warehouse`);
    }
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
// ==================== جلب منتجات مخزن معين (مع دعم الـ Variations) ====================
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
        .populate("productPriceId", "price code quantity")
        .lean();
    const products = await Promise.all(stocks.map(async (stock) => {
        // لو مفيش productId
        if (!stock.productId)
            return null;
        // هات الـ Options للـ variation لو موجود
        let variationOptions = [];
        if (stock.productPriceId) {
            const priceOptions = await product_price_1.ProductPriceOptionModel.find({
                product_price_id: stock.productPriceId._id,
            }).lean();
            variationOptions = await Promise.all(priceOptions.map(async (po) => {
                if (!po.option_id)
                    return null;
                const option = await mongoose_1.default.model("Option").findById(po.option_id)
                    .populate("variationId", "name ar_name")
                    .lean();
                return option;
            }));
            variationOptions = variationOptions.filter((o) => o !== null);
        }
        // هات كل الـ Prices للمنتج (لو محتاج تعرضهم)
        const prices = await product_price_1.ProductPriceModel.find({
            productId: stock.productId._id,
        }).lean();
        const pricesWithOptions = await Promise.all(prices.map(async (price) => {
            const priceOptions = await product_price_1.ProductPriceOptionModel.find({
                product_price_id: price._id,
            }).lean();
            const optionsWithDetails = await Promise.all(priceOptions.map(async (po) => {
                if (!po.option_id)
                    return null;
                const option = await mongoose_1.default.model("Option").findById(po.option_id)
                    .populate("variationId", "name ar_name")
                    .lean();
                return option;
            }));
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
            productPriceId: stock.productPriceId, // الـ variation المحدد
            variationOptions, // الـ options بتاعة الـ variation
            prices: pricesWithOptions, // كل الـ prices المتاحة
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
// ==================== نقل كمية بين مخزنين (مع دعم الـ Variations) ====================
const transferStock = async (req, res) => {
    const { productId, productPriceId, fromWarehouseId, toWarehouseId, quantity } = req.body;
    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
        throw new BadRequest_1.BadRequest("productId, fromWarehouseId, toWarehouseId, and quantity are required");
    }
    if (quantity <= 0)
        throw new BadRequest_1.BadRequest("Quantity must be positive");
    if (fromWarehouseId === toWarehouseId) {
        throw new BadRequest_1.BadRequest("Source and destination warehouses must be different");
    }
    // ✅ لو فيه productPriceId، نتحقق منه
    if (productPriceId) {
        const productPrice = await product_price_1.ProductPriceModel.findById(productPriceId);
        if (!productPrice)
            throw new NotFound_1.NotFound("Product variation not found");
        if (productPrice.productId.toString() !== productId) {
            throw new BadRequest_1.BadRequest("Product variation does not belong to this product");
        }
    }
    // بناء query المصدر
    const fromQuery = {
        productId,
        warehouseId: fromWarehouseId,
    };
    if (productPriceId) {
        fromQuery.productPriceId = productPriceId;
    }
    else {
        fromQuery.productPriceId = null;
    }
    // ✅ الحل: Atomic Update - الخصم والتحقق في أمر واحد
    const fromStock = await Product_Warehouse_1.Product_WarehouseModel.findOneAndUpdate({
        ...fromQuery,
        quantity: { $gte: quantity } // ✅ شرط: الكمية >= المطلوب
    }, {
        $inc: { quantity: -quantity }
    }, {
        new: true // يرجع الـ document بعد التحديث
    });
    // ❌ لو مرجعش حاجة يبقى الكمية مش كافية
    if (!fromStock) {
        // نشيك هل المنتج موجود أصلاً ولا لأ
        const existingStock = await Product_Warehouse_1.Product_WarehouseModel.findOne(fromQuery);
        if (!existingStock) {
            const variationText = productPriceId ? " (this variation)" : "";
            throw new NotFound_1.NotFound(`Product${variationText} not found in source warehouse`);
        }
        throw new BadRequest_1.BadRequest(`Insufficient quantity in source warehouse. Available: ${existingStock.quantity}, Requested: ${quantity}`);
    }
    // بناء query الوجهة
    const toQuery = {
        productId,
        warehouseId: toWarehouseId,
    };
    if (productPriceId) {
        toQuery.productPriceId = productPriceId;
    }
    else {
        toQuery.productPriceId = null;
    }
    // ✅ إضافة للمخزن الوجهة (upsert)
    const toStock = await Product_Warehouse_1.Product_WarehouseModel.findOneAndUpdate(toQuery, {
        $inc: { quantity: quantity },
        $setOnInsert: {
            productId,
            productPriceId: productPriceId || null,
            warehouseId: toWarehouseId,
            low_stock: fromStock.low_stock || 0,
        }
    }, {
        new: true,
        upsert: true // لو مش موجود، أنشئه
    });
    // تحديث عدد المنتجات في المخزن الجديد لو اتعمل upsert
    // (ممكن تستخدم middleware أو تشيك لو الـ document جديد)
    await Warehouse_1.WarehouseModel.findByIdAndUpdate(fromWarehouseId, {
        $inc: { stock_Quantity: -quantity },
    });
    await Warehouse_1.WarehouseModel.findByIdAndUpdate(toWarehouseId, {
        $inc: { stock_Quantity: quantity },
    });
    // Populate للـ response
    const populatedFromStock = await Product_Warehouse_1.Product_WarehouseModel.findById(fromStock._id)
        .populate("productId", "name ar_name")
        .populate("productPriceId", "price code");
    const populatedToStock = await Product_Warehouse_1.Product_WarehouseModel.findById(toStock._id)
        .populate("productId", "name ar_name")
        .populate("productPriceId", "price code");
    (0, response_1.SuccessResponse)(res, {
        message: "Stock transferred successfully",
        fromStock: populatedFromStock,
        toStock: populatedToStock,
    });
};
exports.transferStock = transferStock;
// ==================== جلب كل الـ Stocks (مع دعم الـ Variations) ====================
const getAllStocks = async (req, res) => {
    const stocks = await Product_Warehouse_1.Product_WarehouseModel.find()
        .populate("productId", "name ar_name code price image")
        .populate("productPriceId", "price code")
        .populate("warehouseId", "name address")
        .lean();
    (0, response_1.SuccessResponse)(res, { stocks });
};
exports.getAllStocks = getAllStocks;
// ==================== جلب المنتجات اللي كميتها قليلة (مع دعم الـ Variations) ====================
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
        .populate("productPriceId", "price code")
        .populate("warehouseId", "name address")
        .lean();
    // تنسيق البيانات
    const formattedProducts = lowStocks.map((stock) => ({
        _id: stock._id,
        product: stock.productId,
        productVariation: stock.productPriceId, // ✅ إضافة الـ variation
        warehouse: stock.warehouseId,
        currentQuantity: stock.quantity,
        lowStockThreshold: stock.low_stock,
        shortage: stock.low_stock - stock.quantity,
        status: stock.quantity === 0 ? "Out of Stock" : "Low Stock",
    }));
    (0, response_1.SuccessResponse)(res, {
        message: "Low stock products",
        count: formattedProducts.length,
        products: formattedProducts,
    });
};
exports.getLowStockProducts = getLowStockProducts;
