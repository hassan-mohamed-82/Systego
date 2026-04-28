import { Request, Response } from "express";
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import { ProductModel } from '../../models/schema/admin/products';
import { WarehouseModel } from '../../models/schema/admin/Warehouse';
import { CustomerModel } from '../../models/schema/admin/POS/customer';
import { Product_WarehouseModel } from '../../models/schema/admin/Product_Warehouse';
import { SuccessResponse } from '../../utils/response';
import { NotFound } from '../../Errors/NotFound';

// get all products using aggregation pipeline
export const getAllProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // getting the online warehouses ids
    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select('_id');
    const onlineWarehouseIds = onlineWarehouses.map(w => w._id);

    // getting the user wishlist ids if the user is logged in
    let wishlistIds: mongoose.Types.ObjectId[] = [];
    if (req.user?.id) {
        const user = await CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(id => new mongoose.Types.ObjectId(id.toString()));
        }
    }

    const productsWithStatus = await Product_WarehouseModel.aggregate([
        // filtering by warehouse id and online warehouses
        { $match: { warehouseId: { $in: onlineWarehouseIds } } },

        // grouping by product id and variant id to sum the quantity from all online warehouses
        {
            $group: {
                _id: { productId: "$productId", productPriceId: "$productPriceId" },
                quantity: { $sum: "$quantity" }
            }
        },

        // regrouping by product id to collect variants and total quantity
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

        // getting the product info
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

        // getting the category
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

        // getting the prices
        {
            $lookup: {
                from: "productprices",
                localField: "_id",
                foreignField: "productId",
                as: "prices"
            }
        },

        // getting the variations names
        {
            $lookup: {
                from: "productpriceoptions",
                let: { priceIds: "$prices._id" },
                pipeline: [
                    { $match: { $expr: { $in: ["$product_price_id", "$$priceIds"] } } },
                    {
                        $lookup: {
                            from: "options",
                            localField: "option_id",
                            foreignField: "_id",
                            as: "opt"
                        }
                    },
                    { $unwind: "$opt" },
                    {
                        $lookup: {
                            from: "variations",
                            localField: "opt.variationId",
                            foreignField: "_id",
                            as: "var"
                        }
                    },
                    { $unwind: "$var" },
                    {
                        $group: {
                            _id: { 
                                product_price_id: "$product_price_id", 
                                variation_id: "$var._id" 
                            },
                            name: { $first: "$var.name" },
                            ar_name: { $first: "$var.ar_name" },
                            options: {
                                $push: {
                                    _id: "$opt._id",
                                    variationId: "$opt.variationId",
                                    name: "$opt.name",
                                    ar_name: "$opt.ar_name"
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: "$_id.variation_id",
                            product_price_id: "$_id.product_price_id",
                            name: 1,
                            ar_name: 1,
                            options: 1
                        }
                    }
                ],
                as: "allOptionsDetails"
            }
        },

        // merging the final data with the prices
        {
            $addFields: {
                is_favorite: { $in: ["$_id", wishlistIds] },
                category: {
                    _id: "$categoryData._id",
                    name: "$categoryData.name",
                    ar_name: "$categoryData.ar_name"
                },
                // merging the prices with their variations
                formattedPrices: {
                    $map: {
                        input: "$prices",
                        as: "price",
                        in: {
                            _id: "$$price._id",
                            price: "$$price.price",
                            price_after_discount: "$$price.price_after_discount",
                            sku: "$$price.sku",
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
                            variations: {
                                $filter: {
                                    input: "$allOptionsDetails",
                                    as: "opt",
                                    cond: { $eq: ["$$opt.product_price_id", "$$price._id"] }
                                }
                            }
                        }
                    }
                }
            }
        },
        // selecting the final fields for the response
        {
            $project: {
                _id: 1,
                name: "$productInfo.name",
                ar_name: "$productInfo.ar_name",
                image: "$productInfo.image",
                gallery_product: "$productInfo.gallery_product",
                main_price: "$productInfo.price",
                quantity: "$totalQuantity",
                is_favorite: 1,
                category: 1,
                prices: "$formattedPrices",
                created_at: "$productInfo.created_at"
            }
        },
        { $sort: { created_at: -1 } }
    ]);

    return SuccessResponse(res, {
        message: 'All products with retrieved successfully',
        data: productsWithStatus
    }, 200);
});

// get single product by id using aggregation pipeline
export const getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFound('Product ID is invalid');
    }

    // getting the online warehouses ids
    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select('_id');
    const onlineWarehouseIds = onlineWarehouses.map(w => w._id);

    // getting the user wishlist ids if the user is logged in
    let wishlistIds: mongoose.Types.ObjectId[] = [];
    if (req.user?.id) {
        const user = await CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(wId => new mongoose.Types.ObjectId(wId.toString()));
        }
    }

    const product = await Product_WarehouseModel.aggregate([
        // filtering by product id and online warehouses
        {
            $match: {
                productId: new mongoose.Types.ObjectId(id),
                warehouseId: { $in: onlineWarehouseIds }
            }
        },

        // grouping by product id and variant id to sum the quantity from all online warehouses
        {
            $group: {
                _id: { productId: "$productId", productPriceId: "$productPriceId" },
                quantity: { $sum: "$quantity" }
            }
        },

        // regrouping by product id to collect variants and total quantity
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

        // getting the product info
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

        // getting the category
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

        // getting the prices
        {
            $lookup: {
                from: "productprices",
                localField: "_id",
                foreignField: "productId",
                as: "prices"
            }
        },

        // getting the prices variations using sub-pipeline
        {
            $lookup: {
                from: "productpriceoptions",
                let: { priceIds: "$prices._id" },
                pipeline: [
                    { $match: { $expr: { $in: ["$product_price_id", "$$priceIds"] } } },
                    {
                        $lookup: {
                            from: "options",
                            localField: "option_id",
                            foreignField: "_id",
                            as: "opt"
                        }
                    },
                    { $unwind: "$opt" },
                    {
                        $lookup: {
                            from: "variations",
                            localField: "opt.variationId",
                            foreignField: "_id",
                            as: "var"
                        }
                    },
                    { $unwind: "$var" },
                    {
                        $group: {
                            _id: { 
                                product_price_id: "$product_price_id", 
                                variation_id: "$var._id" 
                            },
                            name: { $first: "$var.name" },
                            ar_name: { $first: "$var.ar_name" },
                            options: {
                                $push: {
                                    _id: "$opt._id",
                                    variationId: "$opt.variationId",
                                    name: "$opt.name",
                                    ar_name: "$opt.ar_name"
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: "$_id.variation_id",
                            product_price_id: "$_id.product_price_id",
                            name: 1,
                            ar_name: 1,
                            options: 1
                        }
                    }
                ],
                as: "allOptionsDetails"
            }
        },

        // merging the final data with the prices
        {
            $addFields: {
                is_favorite: { $in: ["$_id", wishlistIds] },
                category: {
                    _id: "$categoryData._id",
                    name: "$categoryData.name",
                    ar_name: "$categoryData.ar_name"
                },
                // merge the prices with their variations
                formattedPrices: {
                    $map: {
                        input: "$prices",
                        as: "price",
                        in: {
                            _id: "$$price._id",
                            price: "$$price.price",
                            price_after_discount: "$$price.price_after_discount",
                            sku: "$$price.sku",
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
                            variations: {
                                $filter: {
                                    input: "$allOptionsDetails",
                                    as: "opt",
                                    cond: { $eq: ["$$opt.product_price_id", "$$price._id"] }
                                }
                            }
                        }
                    }
                }
            }
        },
        // selecting the final fields for the response
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
                is_favorite: 1,
                category: 1,
                prices: "$formattedPrices"
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