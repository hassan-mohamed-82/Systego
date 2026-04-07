"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductById = exports.getAllProducts = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const products_1 = require("../../models/schema/admin/products");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const customer_1 = require("../../models/schema/admin/POS/customer");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
// 1. Get All Products (With Online Quantity & Wishlist Status)
exports.getAllProducts = (0, express_async_handler_1.default)(async (req, res) => {
    // الخطوة 1: جلب الـ IDs للمخازن الأونلاين فقط لتقليل الـ Lookups جوه الـ Pipeline
    const onlineWarehouses = await Warehouse_1.WarehouseModel.find({ Is_Online: true }).select('_id');
    const onlineWarehouseIds = onlineWarehouses.map(w => w._id);
    // الخطوة 2: جلب قائمة الـ Wishlist للمستخدم الحالي
    let wishlistIds = [];
    if (req.user?.id) {
        const user = await customer_1.CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(id => new mongoose_1.default.Types.ObjectId(id.toString()));
        }
    }
    // الخطوة 3: الـ Aggregation Pipeline الرئيسي
    const productsWithStatus = await products_1.ProductModel.aggregate([
        // ترتيب المنتجات (الأحدث أولاً)
        { $sort: { created_at: -1 } },
        // حساب الكمية من مخازن الأونلاين فقط
        {
            $lookup: {
                from: "product_warehouses",
                let: { productId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$productId", "$$productId"] },
                                    { $in: ["$warehouseId", onlineWarehouseIds] } // فلترة مباشرة بالـ IDs
                                ]
                            }
                        }
                    }
                ],
                as: "onlineStocks"
            }
        },
        {
            $addFields: {
                quantity: { $sum: "$onlineStocks.quantity" }
            }
        },
        // ربط وجلب بيانات القسم (Category)
        {
            $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "categoryData"
            }
        },
        { $unwind: { path: "$categoryData", preserveNullAndEmptyArrays: true } },
        // إضافة حالة المفضلة وتنسيق شكل القسم
        {
            $addFields: {
                is_favorite: { $in: ["$_id", wishlistIds] },
                categoryId: {
                    _id: "$categoryData._id",
                    name: "$categoryData.name",
                    ar_name: "$categoryData.ar_name"
                }
            }
        },
        // إخفاء الحقول الوسيطة والزائدة
        {
            $project: {
                onlineStocks: 0,
                categoryData: 0,
                __v: 0
            }
        }
    ]);
    return (0, response_1.SuccessResponse)(res, {
        message: 'Products retrieved successfully',
        data: productsWithStatus
    }, 200);
});
// 2. Get Product By ID (With Online Quantity & Wishlist Status)
exports.getProductById = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new NotFound_1.NotFound('Invalid Product ID');
    }
    // نفس خطوات الفلترة المسبقة للمخازن والـ Wishlist
    const onlineWarehouses = await Warehouse_1.WarehouseModel.find({ Is_Online: true }).select('_id');
    const onlineWarehouseIds = onlineWarehouses.map(w => w._id);
    let wishlistIds = [];
    if (req.user?.id) {
        const user = await customer_1.CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(id => new mongoose_1.default.Types.ObjectId(id.toString()));
        }
    }
    const product = await products_1.ProductModel.aggregate([
        { $match: { _id: new mongoose_1.default.Types.ObjectId(id) } },
        {
            $lookup: {
                from: "product_warehouses",
                let: { productId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$productId", "$$productId"] },
                                    { $in: ["$warehouseId", onlineWarehouseIds] }
                                ]
                            }
                        }
                    }
                ],
                as: "onlineStocks"
            }
        },
        {
            $addFields: {
                quantity: { $sum: "$onlineStocks.quantity" }
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "categoryData"
            }
        },
        { $unwind: { path: "$categoryData", preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                is_favorite: { $in: ["$_id", wishlistIds] },
                categoryId: {
                    _id: "$categoryData._id",
                    name: "$categoryData.name",
                    ar_name: "$categoryData.ar_name"
                }
            }
        },
        {
            $project: {
                onlineStocks: 0,
                categoryData: 0,
                __v: 0
            }
        }
    ]);
    if (!product || product.length === 0) {
        throw new NotFound_1.NotFound('Product not found');
    }
    return (0, response_1.SuccessResponse)(res, {
        message: 'Product retrieved successfully',
        data: product[0]
    }, 200);
});
