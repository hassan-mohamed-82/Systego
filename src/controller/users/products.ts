import { Request, Response } from "express";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { CustomerModel } from "../../models/schema/admin/POS/customer";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { ProductModel } from "../../models/schema/admin/products";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { DiscountModel } from "../../models/schema/admin/Discount";
import { ProductSalesModel } from "../../models/schema/admin/POS/Sale";
import { OrderModel } from "../../models/schema/users/Order";

export const buildProductAggregationPipeline = (
  productMatchStage: object,
  wishlistIds: mongoose.Types.ObjectId[],
  onlineWarehouseIds: mongoose.Types.ObjectId[]
): mongoose.PipelineStage[] => {
  return [
    { $match: { ...productMatchStage, Is_Online: true } },

    // Stock, scoped to online warehouses only, grouped per variant.
    // Left join — products with no matching rows keep an empty array
    // and fall through to quantity: 0 below, instead of disappearing.
    {
      $lookup: {
        from: "product_warehouses", // ⚠️ confirm actual collection name against Product_WarehouseModel
        let: { pid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$productId", "$$pid"] },
              warehouseId: { $in: onlineWarehouseIds },
            },
          },
          {
            $group: {
              _id: "$productPriceId",
              quantity: { $sum: "$quantity" },
            },
          },
        ],
        as: "variantStocksRaw",
      },
    },
    {
      $addFields: {
        totalQuantity: { $sum: "$variantStocksRaw.quantity" },
        variantStocks: {
          $map: {
            input: "$variantStocksRaw",
            as: "vs",
            in: { productPriceId: "$$vs._id", quantity: "$$vs.quantity" },
          },
        },
      },
    },

    // 1️⃣ Brand
    {
      $lookup: {
        from: "brands",
        localField: "brandId",
        foreignField: "_id",
        as: "brandData",
      },
    },
    { $unwind: { path: "$brandData", preserveNullAndEmptyArrays: true } },

    // Category — must be online too
    // Category — must be online too, and a product can belong to multiple
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "categoryData",
      },
    },
    {
      $addFields: {
        categoryData: {
          $filter: {
            input: "$categoryData",
            as: "c",
            cond: { $eq: ["$$c.Is_Online", true] },
          },
        },
      },
    },
    // Only keep products with at least one online category left
    { $match: { "categoryData.0": { $exists: true } } },

    // 2️⃣ Discount
    {
      $lookup: {
        from: "discounts",
        localField: "discountId",
        foreignField: "_id",
        as: "discountData",
      },
    },
    { $unwind: { path: "$discountData", preserveNullAndEmptyArrays: true } },

    // 3️⃣ A discount only counts as active if status is true AND it's
    // scoped to E-commerce — previously this just checked existence,
    // so disabled or POS-only discounts were still applied online.
    // ⚠️ Field names ("status", "applyIn") and the value "E-commerce"
    // are inferred from the original comment — confirm against the
    // actual DiscountModel schema before relying on this.
    {
      $addFields: {
        activeDiscount: {
          $cond: {
            if: {
              $and: [
                { $gt: ["$discountData", null] },
                { $eq: ["$discountData.status", true] },
                { $eq: ["$discountData.applyIn", "E-commerce"] },
              ],
            },
            then: "$discountData",
            else: null,
          },
        },
      },
    },

    {
      $lookup: {
        from: "productprices",
        localField: "_id",
        foreignField: "productId",
        as: "prices",
      },
    },
    {
      $lookup: {
        from: "productpriceoptions",
        localField: "prices._id",
        foreignField: "product_price_id",
        as: "priceOptions",
      },
    },
    {
      $lookup: {
        from: "options",
        localField: "priceOptions.option_id",
        foreignField: "_id",
        as: "rawOptions",
      },
    },
    {
      $lookup: {
        from: "variations",
        localField: "rawOptions.variationId",
        foreignField: "_id",
        as: "rawVariations",
      },
    },

    {
      $project: {
        _id: 1,
        name: "$name",
        ar_name: "$ar_name",
        description: "$description",
        image: "$image",
        gallery_product: "$gallery_product",
        main_price: "$price",
        is_featured: { $ifNull: ["$is_featured", false] },

        // 4️⃣ Discounted price for the main price
        final_price: {
          $cond: {
            if: { $gt: ["$activeDiscount", null] },
            then: {
              $cond: {
                if: { $eq: ["$activeDiscount.type", "percentage"] },
                then: {
                  $max: [
                    {
                      $subtract: [
                        "$price",
                        { $multiply: ["$price", "$activeDiscount.amount"] },
                      ],
                    },
                    0,
                  ],
                },
                else: {
                  $max: [
                    { $subtract: ["$price", "$activeDiscount.amount"] },
                    0,
                  ],
                },
              },
            },
            else: "$price",
          },
        },

        discount: {
          $cond: {
            if: { $gt: ["$activeDiscount", null] },
            then: {
              _id: "$activeDiscount._id",
              name: "$activeDiscount.name",
              type: "$activeDiscount.type",
              amount: "$activeDiscount.amount",
            },
            else: null,
          },
        },

        // Defaults to 0 for products with no stock rows in any online
        // warehouse — they're still shown, not dropped. Add
        // `{ $match: { totalQuantity: { $gt: 0 } } }` after this stage
        // if out-of-stock products should be hidden instead.
        quantity: "$totalQuantity",
        is_favorite: { $in: ["$_id", wishlistIds] },
        categories: {
          $map: {
            input: "$categoryData",
            as: "c",
            in: { _id: "$$c._id", name: "$$c.name", ar_name: "$$c.ar_name" },
          },
        },

        brand: {
          $cond: {
            if: { $gt: ["$brandData", null] },
            then: {
              _id: "$brandData._id",
              name: "$brandData.name",
              ar_name: "$brandData.ar_name",
            },
            else: null,
          },
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
                  cond: { $eq: ["$$o.variationId", "$$v._id"] },
                },
              },
            },
          },
        },
        skus: {
          $map: {
            input: "$prices",
            as: "price",
            in: {
              _id: "$$price._id",
              price: "$$price.price",

              // 5️⃣ Discounted price per SKU
              final_price: {
                $cond: {
                  if: { $gt: ["$activeDiscount", null] },
                  then: {
                    $cond: {
                      if: { $eq: ["$activeDiscount.type", "percentage"] },
                      then: {
                        $max: [
                          {
                            $subtract: [
                              "$$price.price",
                              {
                                $multiply: [
                                  "$$price.price",
                                  "$activeDiscount.amount",
                                ],
                              },
                            ],
                          },
                          0,
                        ],
                      },
                      else: {
                        $max: [
                          {
                            $subtract: [
                              "$$price.price",
                              "$activeDiscount.amount",
                            ],
                          },
                          0,
                        ],
                      },
                    },
                  },
                  else: "$$price.price",
                },
              },

              code: "$$price.code",
              gallery: "$$price.gallery",
              // Also defaults to 0 rather than being absent when a
              // variant has no stock in any online warehouse.
              quantity: {
                $let: {
                  vars: {
                    stockObj: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$variantStocks",
                            as: "vs",
                            cond: {
                              $eq: ["$$vs.productPriceId", "$$price._id"],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: { $ifNull: ["$$stockObj.quantity", 0] },
                },
              },
              option_ids: {
                $map: {
                  input: {
                    $filter: {
                      input: "$priceOptions",
                      as: "po",
                      cond: { $eq: ["$$po.product_price_id", "$$price._id"] },
                    },
                  },
                  as: "filteredPo",
                  in: "$$filteredPo.option_id",
                },
              },
            },
          },
        },
        created_at: "$createdAt",
      },
    },
  ];
};

// 🌟 Get All Products
export const getAllProducts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true })
      .select("_id")
      .lean();
    const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);

    let wishlistIds: mongoose.Types.ObjectId[] = [];
    if (req.user?.id) {
      const user = await CustomerModel.findById(req.user.id)
        .select("wishlist")
        .lean();
      if (user?.wishlist) {
        wishlistIds = user.wishlist.map(
          (id) => new mongoose.Types.ObjectId(id.toString())
        );
      }
    }

    const matchStage: any = {};
    if (req.query.is_featured === "true" || (req.query.is_featured as any) === true) {
      matchStage.is_featured = true;
    }

    const pipeline = buildProductAggregationPipeline(
      matchStage,
      wishlistIds,
      onlineWarehouseIds
    );

    pipeline.push({ $sort: { created_at: -1 } });

    const productsWithStatus = await ProductModel.aggregate(pipeline);

    return SuccessResponse(
      res,
      {
        message: "All products retrieved successfully",
        data: productsWithStatus,
      },
      200
    );
  }
);

// 🌟 Get Single Product By ID
export const getProductById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFound("Product ID is invalid");
    }

    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true })
      .select("_id")
      .lean();
    const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);

    let wishlistIds: mongoose.Types.ObjectId[] = [];
    if (req.user?.id) {
      const user = await CustomerModel.findById(req.user.id)
        .select("wishlist")
        .lean();
      if (user?.wishlist) {
        wishlistIds = user.wishlist.map(
          (wId) => new mongoose.Types.ObjectId(wId.toString())
        );
      }
    }

    const pipeline = buildProductAggregationPipeline(
      { _id: new mongoose.Types.ObjectId(id) },
      wishlistIds,
      onlineWarehouseIds
    );

    const product = await ProductModel.aggregate(pipeline);

    if (!product || product.length === 0) {
      throw new NotFound("Product not found");
    }

    return SuccessResponse(
      res,
      {
        message: "Product retrieved successfully",
        data: product[0],
      },
      200
    );
  }
);

// 🌟 Get Best Selling Products (Aggregating POS Sales and Online Orders)
export const getBestSellingProducts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      limit = "10",
      page = "1",
      category_id,
      warehouse_id,
      start_date,
      end_date,
      sort_by = "quantity", // "quantity" or "revenue"
    } = req.query as {
      limit?: string;
      page?: string;
      category_id?: string;
      warehouse_id?: string;
      start_date?: string;
      end_date?: string;
      sort_by?: string;
    };

    // 1️⃣ Date filter for sales & orders
    const dateFilter: any = {};
    if (start_date && end_date) {
      dateFilter.$gte = new Date(start_date);
      dateFilter.$lte = new Date(new Date(end_date).setHours(23, 59, 59, 999));
    } else if (start_date) {
      dateFilter.$gte = new Date(start_date);
    } else if (end_date) {
      dateFilter.$lte = new Date(new Date(end_date).setHours(23, 59, 59, 999));
    }

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // 2️⃣ POS Sales Pipeline (Completed sales only, excluding full returns)
    const saleMatch: any = {
      "sale.order_pending": 0,
      "sale.return_status": { $ne: "full" },
    };
    if (hasDateFilter) {
      saleMatch["sale.createdAt"] = dateFilter;
    }
    if (warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      saleMatch["sale.warehouse_id"] = new mongoose.Types.ObjectId(warehouse_id);
    }

    const posPipeline: mongoose.PipelineStage[] = [
      { $match: { product_id: { $ne: null } } },
      {
        $lookup: {
          from: "sales",
          localField: "sale_id",
          foreignField: "_id",
          as: "sale",
        },
      },
      { $unwind: "$sale" },
      { $match: saleMatch },
      {
        $group: {
          _id: "$product_id",
          posQuantity: { $sum: "$quantity" },
          posRevenue: { $sum: "$subtotal" },
          posOrdersCount: { $sum: 1 },
        },
      },
    ];

    // 3️⃣ Online Orders Pipeline (Excluding rejected/canceled/returned/refunded)
    const orderMatch: any = {
      status: {
        $nin: ["rejected", "canceled", "refund", "returned", "failed_to_deliver"],
      },
    };
    if (hasDateFilter) {
      orderMatch.createdAt = dateFilter;
    }
    if (warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      orderMatch.warehouse = new mongoose.Types.ObjectId(warehouse_id);
    }

    const onlinePipeline: mongoose.PipelineStage[] = [
      { $match: orderMatch },
      { $unwind: "$cartItems" },
      { $match: { "cartItems.product": { $ne: null } } },
      {
        $group: {
          _id: "$cartItems.product",
          onlineQuantity: { $sum: "$cartItems.quantity" },
          onlineRevenue: {
            $sum: {
              $multiply: [
                "$cartItems.quantity",
                { $ifNull: ["$cartItems.price", 0] },
              ],
            },
          },
          onlineOrdersCount: { $sum: 1 },
        },
      },
    ];

    // Run parallel queries
    const [posStats, onlineStats] = await Promise.all([
      ProductSalesModel.aggregate(posPipeline),
      OrderModel.aggregate(onlinePipeline),
    ]);

    // 4️⃣ Combine sales statistics into a Map
    interface ProductSalesMetric {
      totalSoldQuantity: number;
      posQuantity: number;
      onlineQuantity: number;
      totalRevenue: number;
      posRevenue: number;
      onlineRevenue: number;
      ordersCount: number;
    }

    const salesMap = new Map<string, ProductSalesMetric>();

    for (const item of posStats) {
      if (!item._id) continue;
      const idStr = item._id.toString();
      salesMap.set(idStr, {
        totalSoldQuantity: item.posQuantity || 0,
        posQuantity: item.posQuantity || 0,
        onlineQuantity: 0,
        totalRevenue: Number((item.posRevenue || 0).toFixed(2)),
        posRevenue: Number((item.posRevenue || 0).toFixed(2)),
        onlineRevenue: 0,
        ordersCount: item.posOrdersCount || 0,
      });
    }

    for (const item of onlineStats) {
      if (!item._id) continue;
      const idStr = item._id.toString();
      const existing = salesMap.get(idStr);
      if (existing) {
        existing.totalSoldQuantity += item.onlineQuantity || 0;
        existing.onlineQuantity += item.onlineQuantity || 0;
        existing.totalRevenue = Number(
          (existing.totalRevenue + (item.onlineRevenue || 0)).toFixed(2)
        );
        existing.onlineRevenue = Number((item.onlineRevenue || 0).toFixed(2));
        existing.ordersCount += item.onlineOrdersCount || 0;
      } else {
        salesMap.set(idStr, {
          totalSoldQuantity: item.onlineQuantity || 0,
          posQuantity: 0,
          onlineQuantity: item.onlineQuantity || 0,
          totalRevenue: Number((item.onlineRevenue || 0).toFixed(2)),
          posRevenue: 0,
          onlineRevenue: Number((item.onlineRevenue || 0).toFixed(2)),
          ordersCount: item.onlineOrdersCount || 0,
        });
      }
    }

    // 5️⃣ Get online warehouses & user wishlist for storefront formatting
    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true })
      .select("_id")
      .lean();
    const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);

    let wishlistIds: mongoose.Types.ObjectId[] = [];
    if (req.user?.id) {
      const user = await CustomerModel.findById(req.user.id)
        .select("wishlist")
        .lean();
      if (user?.wishlist) {
        wishlistIds = user.wishlist.map(
          (id) => new mongoose.Types.ObjectId(id.toString())
        );
      }
    }

    // 6️⃣ Build base match stage for online products
    const productMatchStage: any = {};
    if (category_id && mongoose.Types.ObjectId.isValid(category_id)) {
      productMatchStage.categoryId = new mongoose.Types.ObjectId(category_id);
    }

    const soldProductIds = Array.from(salesMap.keys()).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    if (soldProductIds.length > 0) {
      productMatchStage._id = { $in: soldProductIds };
    } else {
      productMatchStage._id = { $in: [] };
    }

    const pipeline = buildProductAggregationPipeline(
      productMatchStage,
      wishlistIds,
      onlineWarehouseIds
    );

    const products = await ProductModel.aggregate(pipeline);

    // 7️⃣ Attach sales metrics to each product
    const productsWithSales = products.map((product: any) => {
      const stats = salesMap.get(product._id.toString()) || {
        totalSoldQuantity: 0,
        posQuantity: 0,
        onlineQuantity: 0,
        totalRevenue: 0,
        posRevenue: 0,
        onlineRevenue: 0,
        ordersCount: 0,
      };

      return {
        ...product,
        sales_stats: {
          total_sold_quantity: stats.totalSoldQuantity,
          pos_sold_quantity: stats.posQuantity,
          online_sold_quantity: stats.onlineQuantity,
          total_revenue: stats.totalRevenue,
          pos_revenue: stats.posRevenue,
          online_revenue: stats.onlineRevenue,
          orders_count: stats.ordersCount,
        },
      };
    });

    // Sort by highest sales
    const isSortByRevenue = sort_by === "revenue";
    productsWithSales.sort((a: any, b: any) => {
      if (isSortByRevenue) {
        return b.sales_stats.total_revenue - a.sales_stats.total_revenue;
      }
      return (
        b.sales_stats.total_sold_quantity - a.sales_stats.total_sold_quantity
      );
    });

    // 8️⃣ Pagination
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedProducts = productsWithSales.slice(
      startIndex,
      startIndex + limitNum
    );

    return SuccessResponse(
      res,
      {
        message: "Best selling products retrieved successfully",
        total: productsWithSales.length,
        page: pageNum,
        limit: limitNum,
        data: paginatedProducts,
      },
      200
    );
  }
);
