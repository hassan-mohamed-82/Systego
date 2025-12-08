import { ProductModel } from "../models/schema/admin/products";
import { ProductPriceModel, ProductPriceOptionModel } from "../models/schema/admin/product_price";
import { VariationModel } from "../models/schema/admin/Variation"; // تأكد من المسار
import { CategoryModel } from "../models/schema/admin/category";
import { BrandModel } from "../models/schema/admin/brand";
import { NotFound } from "../Errors/NotFound";
import { SuccessResponse } from "./response";

/**
 * يبني نفس الـ structure بتاع getProduct
 * مع إمكانية الفلترة (كل المنتجات / حسب كاتيجوري / حسب براند / غيره)
 */
export async function buildProductsWithVariations(filter: any = {}) {
  // 1️⃣ المنتجات حسب الفلتر
  const products = await ProductModel.find(filter)
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

      return {
        ...product,
        prices: formattedPrices,
      };
    })
  );

  return formattedProducts;
}
