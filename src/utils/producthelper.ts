// src/utils/buildProductsWithVariations.ts

import { ProductModel } from "../models/schema/admin/products";
import { ProductPriceModel, ProductPriceOptionModel } from "../models/schema/admin/product_price";
import { VariationModel } from "../models/schema/admin/Variation";
import { Product_WarehouseModel } from "../models/schema/admin/Product_Warehouse";
interface BuildProductsOptions {
  filter?: any;
  warehouseId?: string;
}

export async function buildProductsWithVariations(options: BuildProductsOptions = {}) {
  const { filter = {}, warehouseId } = options;

  let productFilter = { ...filter };

  // ✅ لو فيه warehouseId، هات بس المنتجات الموجودة في المخزن
  let warehouseProductsMap: Map<string, number> = new Map();

  if (warehouseId) {
    const warehouseProducts = await Product_WarehouseModel.find({
      warehouseId: warehouseId,
      quantity: { $gt: 0 },
    }).select("productId quantity");

    // Map للوصول السريع للكمية
    warehouseProducts.forEach((wp) => {
      warehouseProductsMap.set(wp.productId.toString(), wp.quantity ?? 0);
    });

    const productIds = warehouseProducts.map((wp) => wp.productId);
    productFilter._id = { $in: productIds };
  }

  // 1️⃣ المنتجات حسب الفلتر
  const products = await ProductModel.find(productFilter)
    .populate("categoryId")
    .populate("brandId")
    .populate("taxesId")
    .lean();

  // 2️⃣ كل الـ Variations مرة واحدة
  const variations = await VariationModel.find().lean();

  // 3️⃣ نحضّر الـ products بالـ prices + options
  const formattedProducts = await Promise.all(
    products.map(async (product) => {
      // أسعار المنتج (ProductPrice)
      const prices = await ProductPriceModel.find({ productId: product._id }).lean();

      const formattedPrices = await Promise.all(
        prices.map(async (price) => {
          // options لكل price
          const options = await ProductPriceOptionModel.find({
            product_price_id: price._id,
          })
            .populate({
              path: "option_id",
              select: "_id name variationId",
            })
            .lean();

          // نجمع الـ options حسب الـ variation (Color, Size, ...)
          const groupedOptions: Record<string, any[]> = {};

          for (const po of options) {
            const option = po.option_id as any;
            if (!option?._id) continue;

            const variation = variations.find(
              (v) => v._id.toString() === option.variationId?.toString()
            );

            if (variation) {
              if (!groupedOptions[variation.name]) {
                groupedOptions[variation.name] = [];
              }
              groupedOptions[variation.name].push(option);
            }
          }

          const variationsArray = Object.keys(groupedOptions).map((varName) => ({
            name: varName,
            options: groupedOptions[varName],
          }));

          return {
            ...price,
            variations: variationsArray,
          };
        })
      );

      // ✅ الكمية من المخزن لو موجود warehouseId
      const quantity = warehouseId
        ? warehouseProductsMap.get(product._id.toString()) ?? 0
        : product.quantity;

      return {
        ...product,
        quantity, // ✅ الكمية الصحيحة
        prices: formattedPrices,
      };
    })
  );

  return formattedProducts;
}
