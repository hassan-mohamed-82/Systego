import { BadRequest } from "../../Errors/BadRequest";
import { PandelModel } from "../../models/schema/admin/pandels"
import { Request, Response } from "express";
import { ProductModel } from "../../models/schema/admin/products";
import { ProductPriceModel, ProductPriceOptionModel } from "../../models/schema/admin/product_price";
import { SuccessResponse } from "../../utils/response";

export const getAllBundles = async (req: Request, res: Response) => {
  const currentDate = new Date();

  const bundles = await PandelModel.find({
    status: true,
    startdate: { $lte: currentDate },
    enddate: { $gte: currentDate },
    $or: [
      { all_warehouses: true },
      { all_warehouses: { $exists: false } },
    ],
  }).lean();

  const bundlesWithDetails = await Promise.all(
    bundles.map(async (bundle) => {
      let originalPrice = 0;

      const productsDetails = await Promise.all(
        (bundle.products || []).map(async (p: any) => {
          // جلب المنتج
          const product = await ProductModel.findById(p.productId)
            .select("name ar_name image price")
            .lean();

          if (!product) return null;

          // جلب كل الـ Variations للمنتج ده
          const allVariations = await ProductPriceModel.find({
            productId: p.productId,
          })
            .select("price code quantity cost")
            .lean();

          // جلب الـ Options لكل Variation
          const variationsWithOptions = await Promise.all(
            allVariations.map(async (v: any) => {
              const options = await ProductPriceOptionModel.find({
                product_price_id: v._id,
              })
                .populate("option_id", "name ar_name")
                .lean();

              return {
                _id: v._id,
                price: v.price,
                code: v.code,
                quantity: v.quantity,
                options: options.map((o: any) => o.option_id),
              };
            })
          );

          const hasVariations = variationsWithOptions.length > 0;
          const isVariationFixed = !!p.productPriceId;

          let selectedVariation = null;
          let productPrice = product.price || 0;

          // لو الـ Variation محدد من الأدمن
          if (isVariationFixed && p.productPriceId) {
            const fixedVariation = variationsWithOptions.find(
              (v: any) => v._id.toString() === p.productPriceId.toString()
            );
            if (fixedVariation) {
              selectedVariation = fixedVariation;
              productPrice = fixedVariation.price || product.price || 0;
            }
          }

          // حساب السعر الأصلي
          originalPrice += productPrice * (p.quantity || 1);

          return {
            productId: p.productId,
            product: product,
            quantity: p.quantity || 1,

            // معلومات الـ Variations
            hasVariations: hasVariations,
            isVariationFixed: isVariationFixed,
            requiresSelection: hasVariations && !isVariationFixed,

            // لو محدد من الأدمن
            selectedVariation: selectedVariation,
            productPriceId: p.productPriceId || null,

            // لو مفتوح للكاشير
            availableVariations: !isVariationFixed ? variationsWithOptions : [],
          };
        })
      );

      const validProducts = productsDetails.filter((p) => p !== null);

      const savings = originalPrice - bundle.price;
      const savingsPercentage =
        originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

      // هل الـ Bundle يحتاج اختيار من الكاشير؟
      const requiresVariationSelection = validProducts.some(
        (p: any) => p?.requiresSelection
      );

      return {
        _id: bundle._id,
        name: bundle.name,
        images: bundle.images,
        price: bundle.price,
        originalPrice: originalPrice,
        savings: savings > 0 ? savings : 0,
        savingsPercentage: savingsPercentage > 0 ? savingsPercentage : 0,
        startdate: bundle.startdate,
        enddate: bundle.enddate,

        // ✅ الجديد
        requiresVariationSelection: requiresVariationSelection,
        products: validProducts,
      };
    })
  );

  return SuccessResponse(res, {
    message: "Active bundles",
    count: bundlesWithDetails.length,
    bundles: bundlesWithDetails,
  });
};