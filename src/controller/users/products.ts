import { ProductModel } from '../../models/schema/admin/products';
import asyncHandler from 'express-async-handler';
import { NotFound } from '../../Errors/NotFound';
import { SuccessResponse } from '../../utils/response';
import { Request, Response } from "express";
import { CustomerModel } from '../../models/schema/admin/POS/customer';
import mongoose from 'mongoose';

// 1. Get All Products (With Wishlist Status & Quantity)
export const getAllProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    let wishlistIds: mongoose.Types.ObjectId[] = [];

    // 1. جلب قائمة الـ Wishlist لليوزر لو موجود
    if (req.user?.id) {
        const user = await CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(id => new mongoose.Types.ObjectId(id.toString()));
        }
    }

    // 2. خط الإنتاج (Aggregation Pipeline)
    const productsWithStatus = await ProductModel.aggregate([
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

    return SuccessResponse(res, {
        message: 'Products retrieved successfully',
        data: productsWithStatus
    }, 200);
});

// 2. Get Product By ID (With Wishlist Status & Quantity)
export const getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFound('Invalid Product ID');
    }

    let wishlistIds: mongoose.Types.ObjectId[] = [];
    if (req.user?.id) {
        const user = await CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(id => new mongoose.Types.ObjectId(id.toString()));
        }
    }

    const product = await ProductModel.aggregate([
        // تحديد المنتج المطلوب فقط
        { $match: { _id: new mongoose.Types.ObjectId(id) } },

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
        throw new NotFound('Product not found');
    }

    return SuccessResponse(res, {
        message: 'Product retrieved successfully',
        data: product[0] // الـ aggregate ديماً بترجع array، بناخد أول عنصر
    }, 200);
});