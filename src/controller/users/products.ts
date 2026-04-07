import { Request, Response } from "express";
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import { ProductModel } from '../../models/schema/admin/products';
import { WarehouseModel } from '../../models/schema/admin/Warehouse';
import { CustomerModel } from '../../models/schema/admin/POS/customer';
import { SuccessResponse } from '../../utils/response';
import { NotFound } from '../../Errors/NotFound';

// 1. Get All Products (With Online Quantity & Wishlist Status)
export const getAllProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // الخطوة 1: جلب الـ IDs للمخازن الأونلاين فقط لتقليل الـ Lookups جوه الـ Pipeline
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

    // الخطوة 3: الـ Aggregation Pipeline الرئيسي
    const productsWithStatus = await ProductModel.aggregate([
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

    return SuccessResponse(res, {
        message: 'Products retrieved successfully',
        data: productsWithStatus
    }, 200);
});

// 2. Get Product By ID (With Online Quantity & Wishlist Status)
export const getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFound('Invalid Product ID');
    }

    // نفس خطوات الفلترة المسبقة للمخازن والـ Wishlist
    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select('_id');
    const onlineWarehouseIds = onlineWarehouses.map(w => w._id);

    let wishlistIds: mongoose.Types.ObjectId[] = [];
    if (req.user?.id) {
        const user = await CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(id => new mongoose.Types.ObjectId(id.toString()));
        }
    }

    const product = await ProductModel.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(id) } },
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
        throw new NotFound('Product not found');
    }

    return SuccessResponse(res, {
        message: 'Product retrieved successfully',
        data: product[0]
    }, 200);
});