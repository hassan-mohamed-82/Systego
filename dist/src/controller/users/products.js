"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductById = exports.getAllProducts = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const customer_1 = require("../../models/schema/admin/POS/customer");
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
// 1. Get All Products (Aggregated from Product_Warehouse)
exports.getAllProducts = (0, express_async_handler_1.default)(async (req, res) => {
    // الخطوة 1: جلب الـ IDs للمخازن الأونلاين فقط
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
    // الخطوة 3: الـ Aggregation تبدأ من سجلات المخازن مباشرة مع التجميع
    const productsWithStatus = await Product_Warehouse_1.Product_WarehouseModel.aggregate([
        // فلترة المخازن الأونلاين أولاً
        {
            $match: {
                warehouseId: { $in: onlineWarehouseIds }
            }
        },
        // التجميع لمنع التكرار (Grouping by Product ID)
        {
            $group: {
                _id: "$productId",
                totalQuantity: { $sum: "$quantity" }, // جمع الكمية من كل المخازن الأونلاين
                productPriceId: { $first: "$productPriceId" }
            }
        },
        // ربط بيانات المنتج الأساسية
        {
            $lookup: {
                from: "products",
                localField: "_id", // الـ _id هنا هو الـ productId بعد الـ group
                foreignField: "_id",
                as: "productInfo"
            }
        },
        { $unwind: "$productInfo" },
        // ربط بيانات القسم (Category)
        {
            $lookup: {
                from: "categories",
                localField: "productInfo.categoryId",
                foreignField: "_id",
                as: "categoryData"
            }
        },
        { $unwind: { path: "$categoryData", preserveNullAndEmptyArrays: true } },
        // تشكيل البيانات النهائية وتصحيح شكل الـ Category
        {
            $addFields: {
                is_favorite: { $in: ["$_id", wishlistIds] },
                category: {
                    _id: "$categoryData._id",
                    name: "$categoryData.name",
                    ar_name: "$categoryData.ar_name"
                }
            }
        },
        // تنظيف الحقول للعرض
        {
            $project: {
                _id: 1,
                name: "$productInfo.name",
                ar_name: "$productInfo.ar_name",
                price: "$productInfo.price",
                image: "$productInfo.image",
                quantity: "$totalQuantity",
                is_favorite: 1,
                category: 1,
                created_at: "$productInfo.created_at"
            }
        },
        { $sort: { created_at: -1 } }
    ]);
    return (0, response_1.SuccessResponse)(res, {
        message: 'Products aggregated from warehouses successfully',
        data: productsWithStatus
    }, 200);
});
// 2. Get Single Product By ID (Aggregated from Warehouse)
exports.getProductById = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params; // معرف المنتج (Product ID)
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new NotFound_1.NotFound('Invalid Product ID');
    }
    const onlineWarehouses = await Warehouse_1.WarehouseModel.find({ Is_Online: true }).select('_id');
    const onlineWarehouseIds = onlineWarehouses.map(w => w._id);
    let wishlistIds = [];
    if (req.user?.id) {
        const user = await customer_1.CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(wId => new mongoose_1.default.Types.ObjectId(wId.toString()));
        }
    }
    const product = await Product_Warehouse_1.Product_WarehouseModel.aggregate([
        // البحث بـ productId داخل سجلات المخازن الأونلاين
        {
            $match: {
                productId: new mongoose_1.default.Types.ObjectId(id),
                warehouseId: { $in: onlineWarehouseIds }
            }
        },
        // تجميع الكمية الإجمالية للمنتج
        {
            $group: {
                _id: "$productId",
                totalQuantity: { $sum: "$quantity" }
            }
        },
        // جلب بيانات المنتج
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        { $unwind: "$productInfo" },
        // جلب بيانات القسم
        {
            $lookup: {
                from: "categories",
                localField: "productInfo.categoryId",
                foreignField: "_id",
                as: "categoryData"
            }
        },
        { $unwind: { path: "$categoryData", preserveNullAndEmptyArrays: true } },
        // إضافة حالة المفضلة وتنسيق القسم كـ Object
        {
            $addFields: {
                is_favorite: { $in: ["$_id", wishlistIds] },
                category: {
                    _id: "$categoryData._id",
                    name: "$categoryData.name",
                    ar_name: "$categoryData.ar_name"
                }
            }
        },
        // عرض النتيجة النهائية
        {
            $project: {
                _id: 1,
                name: "$productInfo.name",
                ar_name: "$productInfo.ar_name",
                price: "$productInfo.price",
                image: "$productInfo.image",
                quantity: "$totalQuantity",
                is_favorite: 1,
                category: 1
            }
        }
    ]);
    if (!product || product.length === 0) {
        throw new NotFound_1.NotFound('Product not found in online stock');
    }
    return (0, response_1.SuccessResponse)(res, {
        message: 'Product details retrieved successfully',
        data: product[0]
    }, 200);
});
