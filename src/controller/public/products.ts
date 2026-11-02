import { Request, Response } from "express";
import { ProductModel } from "../../models/schema/admin/products";
import { ProductPriceModel, ProductPriceOptionModel } from "../../models/schema/admin/product_price";
import { SuccessResponse } from "../../utils/response";

/**
 * Public (no authentication) endpoint returning all products with:
 * - ar_name (Arabic name)
 * - ar_description (Arabic description)
 * - price (base price)
 * - options: array of { option_name, price } (one entry per SKU/variant)
 */
export const getPublicProducts = async (req: Request, res: Response) => {
  const products = await ProductModel.find()
    .select("_id ar_name ar_description price")
    .lean();

  const result = await Promise.all(
    products.map(async (product: any) => {
      const variations = await ProductPriceModel.find({
        productId: product._id,
      }).lean();

      const variationIds = variations.map((v: any) => v._id);

      const priceOptions =
        variationIds.length > 0
          ? await ProductPriceOptionModel.find({
              product_price_id: { $in: variationIds },
            })
              .populate({ path: "option_id", select: "name" })
              .lean()
          : [];

      const options = variations.map((v: any) => {
        const opts = (priceOptions as any[]).filter(
          (po: any) => po.product_price_id?.toString() === v._id.toString(),
        );
        const optionNames = opts
          .map((po: any) => po.option_id?.name)
          .filter(Boolean);
        return {
          option_name: optionNames.length ? optionNames.join(" / ") : null,
          price: v.price,
        };
      });

      return {
        _id: product._id,
        ar_name: product.ar_name,
        ar_description: product.ar_description,
        price: product.price,
        options,
      };
    }),
  );

  return SuccessResponse(res, {
    message: "Products retrieved successfully",
    total: result.length,
    data: result,
  });
};
