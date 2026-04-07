import { Request, Response } from "express";
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import { ProductModel } from '../../models/schema/admin/products';
import { WarehouseModel } from '../../models/schema/admin/Warehouse';
import { CustomerModel } from '../../models/schema/admin/POS/customer';
import { Product_WarehouseModel } from '../../models/schema/admin/Product_Warehouse';
import { SuccessResponse } from '../../utils/response';
import { NotFound } from '../../Errors/NotFound';

// 1. Get All Products (Aggregated from Product_Warehouse)
export const getAllProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // الخطوة 1: جلب الـ IDs للمخازن الأونلاين فقط
    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select('_id');
    const onlineWarehouseIds = onlineWarehouses.map(w => w._id);

    // الخطوة 2: جلب قائمة الـ Wishlist للمستخدم الحالي
    let wishlistIds: mongoose.Types.ObjectId[] = [];
    if (req.user?.id) {
        const user = await CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(id => new mongoose.Types.ObjectId(id.toString()));
        }
    }

    // الخطوة 3: الـ Aggregation تبدأ من سجلات المخازن مباشرة مع التجميع
    const productsWithStatus = await Product_WarehouseModel.aggregate([
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

    return SuccessResponse(res, {
        message: 'Products aggregated from warehouses successfully',
        data: productsWithStatus
    }, 200);
});

// 2. Get Single Product By ID (Aggregated from Warehouse)
export const getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params; // معرف المنتج (Product ID)
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFound('Invalid Product ID');
    }

    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select('_id');
    const onlineWarehouseIds = onlineWarehouses.map(w => w._id);

    let wishlistIds: mongoose.Types.ObjectId[] = [];
    if (req.user?.id) {
        const user = await CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(wId => new mongoose.Types.ObjectId(wId.toString()));
        }
    }

    const product = await Product_WarehouseModel.aggregate([
        // البحث بـ productId داخل سجلات المخازن الأونلاين
        { 
            $match: { 
                productId: new mongoose.Types.ObjectId(id),
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
        throw new NotFound('Product not found in online stock');
    }

    return SuccessResponse(res, {
        message: 'Product details retrieved successfully',
        data: product[0]
    }, 200);
});