"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductById = exports.getAllProducts = void 0;
const products_1 = require("../../models/schema/admin/products");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
const customer_1 = require("../../models/schema/admin/POS/customer");
const mongoose_1 = __importDefault(require("mongoose"));
// 1. Get All Products (With Wishlist Status & Quantity)
exports.getAllProducts = (0, express_async_handler_1.default)(async (req, res) => {
    let wishlistIds = [];
    // 1. جلب قائمة الـ Wishlist لليوزر لو موجود
    if (req.user?.id) {
        const user = await customer_1.CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(id => new mongoose_1.default.Types.ObjectId(id.toString()));
        }
    }
    // 2. خط الإنتاج (Aggregation Pipeline)
    const productsWithStatus = await products_1.ProductModel.aggregate([
        // ترتيب المنتجات للأحدث
        { $sort: { created_at: -1 } },
        // ربط وحساب الكمية من المخازن
        {
            $lookup: {
                from: "product_warehouses", // تأكد من اسم الـ collection في الداتابيز
                localField: "_id",
                foreignField: "productId",
                as: "stockEntries"
            }
        },
        // ربط القسم (Populate Category)
        {
            $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "categoryData"
            }
        },
        { $unwind: { path: "$categoryData", preserveNullAndEmptyArrays: true } },
        // إضافة حالة المفضلة وحقول القسم المختارة
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
        // تنظيف البيانات النهائية
        {
            $project: {
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
// 2. Get Product By ID (With Wishlist Status & Quantity)
exports.getProductById = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new NotFound_1.NotFound('Invalid Product ID');
    }
    let wishlistIds = [];
    if (req.user?.id) {
        const user = await customer_1.CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(id => new mongoose_1.default.Types.ObjectId(id.toString()));
        }
    }
    const product = await products_1.ProductModel.aggregate([
        // تحديد المنتج المطلوب فقط
        { $match: { _id: new mongoose_1.default.Types.ObjectId(id) } },
        // حساب الكمية
        {
            $lookup: {
                from: "product_warehouses",
                localField: "_id",
                foreignField: "productId",
                as: "stockEntries"
            }
        },
        {
            $addFields: {
                quantity: { $sum: "$stockEntries.quantity" }
            }
        },
        // ربط القسم
        {
            $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "categoryData"
            }
        },
        { $unwind: { path: "$categoryData", preserveNullAndEmptyArrays: true } },
        // الحالة النهائية
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
                stockEntries: 0,
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
        data: product[0] // الـ aggregate ديماً بترجع array، بناخد أول عنصر
    }, 200);
});
