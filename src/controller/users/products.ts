import { Request, Response } from "express";
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import { WarehouseModel } from '../../models/schema/admin/Warehouse';
import { CustomerModel } from '../../models/schema/admin/POS/customer';
import { Product_WarehouseModel } from '../../models/schema/admin/Product_Warehouse';
import { SuccessResponse } from '../../utils/response';
import { NotFound } from '../../Errors/NotFound';

// 💡 دالة مساعدة لبناء الـ Pipeline لمنع تكرار الكود وتحسين الأداء
// 💡 تحديث الدالة المساعدة لدمج أسماء الـ Options والـ Variations كـ Flat Lookup سريع
const buildProductAggregationPipeline = (
    matchStage: object,
    wishlistIds: mongoose.Types.ObjectId[]
): mongoose.PipelineStage[] => {
    return [
        { $match: matchStage },
        {
            $group: {
                _id: { productId: "$productId", productPriceId: "$productPriceId" },
                quantity: { $sum: "$quantity" }
            }
        },
        {
            $group: {
                _id: "$_id.productId",
                totalQuantity: { $sum: "$quantity" },
                variantStocks: {
                    $push: {
                        productPriceId: "$_id.productPriceId",
                        quantity: "$quantity"
                    }
                }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        { $unwind: "$productInfo" },
        { $match: { "productInfo.Is_Online": true } },

        // 1️⃣ جلب بيانات البراند (Brand) المربوط بالمنتج
        {
            $lookup: {
                from: "brands", // تأكد من اسم الكوليكشن عندك في الداتابيز (غالباً brands)
                localField: "productInfo.brandId",
                foreignField: "_id",
                as: "brandData"
            }
        },
        // بنعمل $unwind مع preserveNullAndEmptyArrays عشان لو منتج ملوش براند الـ pipeline ميعطلش ويقع
        { $unwind: { path: "$brandData", preserveNullAndEmptyArrays: true } },

        {
            $lookup: {
                from: "categories",
                localField: "productInfo.categoryId",
                foreignField: "_id",
                as: "categoryData"
            }
        },
        { $unwind: "$categoryData" },
        { $match: { "categoryData.Is_Online": true } },

        {
            $lookup: {
                from: "productprices",
                localField: "_id",
                foreignField: "productId",
                as: "prices"
            }
        },
        {
            $lookup: {
                from: "productpriceoptions",
                localField: "prices._id",
                foreignField: "product_price_id",
                as: "priceOptions"
            }
        },
        {
            $lookup: {
                from: "options",
                localField: "priceOptions.option_id",
                foreignField: "_id",
                as: "rawOptions"
            }
        },
        {
            $lookup: {
                from: "variations",
                localField: "rawOptions.variationId",
                foreignField: "_id",
                as: "rawVariations"
            }
        },

        // 2️⃣ إظهار بيانات البراند في الـ Project النهائي
        {
            $project: {
                _id: 1,
                name: "$productInfo.name",
                ar_name: "$productInfo.ar_name",
                description: "$productInfo.description",
                image: "$productInfo.image",
                gallery_product: "$productInfo.gallery_product",
                main_price: "$productInfo.price",
                quantity: "$totalQuantity",
                is_favorite: { $in: ["$_id", wishlistIds] },
                category: {
                    _id: "$categoryData._id",
                    name: "$categoryData.name",
                    ar_name: "$categoryData.ar_name"
                },

                // ⭐ هنا بنرجع بيانات البراند كاملة ومنظمة للـ Front-end
                brand: {
                    $cond: {
                        if: { $gt: ["$brandData", null] }, // لو فيه براند رجع بياناته
                        then: {
                            _id: "$brandData._id",
                            name: "$brandData.name",
                            ar_name: "$brandData.ar_name" // لو عندك عربي وضفتها في الـ schema
                        },
                        else: null // لو مفيش براند هيرجع null
                    }
                },

                variations: {
                    $map: {
                        input: "$rawVariations",
                        as: "v",
                        in: {
                            _id: "$$v._id",
                            name: "$$v.name",
                            ar_name: "$$v.ar_name",
                            options: {
                                $filter: {
                                    input: "$rawOptions",
                                    as: "o",
                                    cond: { $eq: ["$$o.variationId", "$$v._id"] }
                                }
                            }
                        }
                    }
                },
                skus: {
                    $map: {
                        input: "$prices",
                        as: "price",
                        in: {
                            _id: "$$price._id",
                            price: "$$price.price",
                            code: "$$price.code",
                            gallery: "$$price.gallery",
                            quantity: {
                                $let: {
                                    vars: {
                                        stockObj: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$variantStocks",
                                                        as: "vs",
                                                        cond: { $eq: ["$$vs.productPriceId", "$$price._id"] }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    },
                                    in: { $ifNull: ["$$stockObj.quantity", 0] }
                                }
                            },
                            option_ids: {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: "$priceOptions",
                                            as: "po",
                                            cond: { $eq: ["$$po.product_price_id", "$$price._id"] }
                                        }
                                    },
                                    as: "filteredPo",
                                    in: "$$filteredPo.option_id"
                                }
                            }
                        }
                    }
                },
                created_at: "$productInfo.createdAt"
            }
        }
    ];
};
// 🌟 Get All Products
export const getAllProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select('_id').lean();
    const onlineWarehouseIds = onlineWarehouses.map(w => w._id);

    let wishlistIds: mongoose.Types.ObjectId[] = [];
    if (req.user?.id) {
        const user = await CustomerModel.findById(req.user.id).select('wishlist').lean();
        if (user?.wishlist) {
            wishlistIds = user.wishlist.map(id => new mongoose.Types.ObjectId(id.toString()));
        }
    }

    // بناء الـ Pipeline وتمرير الـ Match الخاص بالمخازن
    const matchStage = { warehouseId: { $in: onlineWarehouseIds } };
    const pipeline = buildProductAggregationPipeline(matchStage, wishlistIds);

    // إضافة الـ Sort في نهاية الـ Pipeline بناءً على تاريخ الإنشاء
    pipeline.push({ $sort: { created_at: -1 } });

    const productsWithStatus = await Product_WarehouseModel.aggregate(pipeline);

    return SuccessResponse(res, {
        message: 'All products retrieved successfully',
        data: productsWithStatus
    }, 200);
});

// 🌟 Get Single Product By ID
export const getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFound('Product ID is invalid');
    }

    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select('_id').lean();
    const onlineWarehouseIds = onlineWarehouses.map(w => w._id);

    let wishlistIds: mongoose.Types.ObjectId[] = [];
    if (req.user?.id) {
        const user = await CustomerModel.findById(req.user.id).select('wishlist').lean();
        if (user?.wishlist) {
            wishlistIds = user.wishlist.map(wId => new mongoose.Types.ObjectId(wId.toString()));
        }
    }

    // بناء الـ Pipeline وتمرير الـ Match الخاص بالمنتج والمخازن معاً لتقليل البيانات المستخرجة من أول خطوة
    const matchStage = {
        productId: new mongoose.Types.ObjectId(id),
        warehouseId: { $in: onlineWarehouseIds }
    };

    const pipeline = buildProductAggregationPipeline(matchStage, wishlistIds);
    const product = await Product_WarehouseModel.aggregate(pipeline);

    if (!product || product.length === 0) {
        throw new NotFound('Product not found');
    }

    return SuccessResponse(res, {
        message: 'Product retrieved successfully',
        data: product[0]
    }, 200);
});