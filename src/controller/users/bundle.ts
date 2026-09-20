import { Request, Response } from "express";
import mongoose from "mongoose";
import { PandelModel } from "../../models/schema/admin/pandels";
import { ProductModel } from "../../models/schema/admin/products";
import {
  ProductPriceModel,
  ProductPriceOptionModel,
} from "../../models/schema/admin/product_price";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";

/**
 * Format a bundle document with all product details, variations, and savings calculations.
 */
export const formatBundleWithDetails = async (bundle: any) => {
  let originalPrice = 0;

  const productsDetails = await Promise.all(
    (bundle.products || []).map(async (p: any) => {
      // جلب المنتج
      const product = await ProductModel.findById(p.productId)
        .select("name ar_name image price")
        .lean();

      if (!product) return null;

      // جلب كل الـ Variations للمنتج
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

        // لو متاح للعميل الاختيار
        availableVariations: !isVariationFixed ? variationsWithOptions : [],
      };
    })
  );

  const validProducts = productsDetails.filter((p) => p !== null);

  const savings = originalPrice - bundle.price;
  const savingsPercentage =
    originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

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
    all_warehouses: bundle.all_warehouses,
    requiresVariationSelection: requiresVariationSelection,
    products: validProducts,
  };
};

/**
 * GET /api/store/offer (or /api/store/bundle)
 * جلب جميع العروض والـ Bundles النشطة والمتاحة للمتجر
 */
export const getAllBundles = async (req: Request, res: Response) => {
  const currentDate = new Date();

  // جلب المخازن الأونلاين
  const onlineWarehouses = await WarehouseModel.find({ Is_Online: true })
    .select("_id")
    .lean();
  const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);

  const warehouseFilter: any = [
    { all_warehouses: true },
    { all_warehouses: { $exists: false } },
  ];

  if (onlineWarehouseIds.length > 0) {
    warehouseFilter.push({ warehouse_ids: { $in: onlineWarehouseIds } });
  }

  const bundles = await PandelModel.find({
    status: true,
    startdate: { $lte: currentDate },
    enddate: { $gte: currentDate },
    $or: warehouseFilter,
  }).lean();

  const bundlesWithDetails = await Promise.all(
    bundles.map((bundle) => formatBundleWithDetails(bundle))
  );

  return SuccessResponse(res, {
    message: "Active offers and bundles retrieved successfully",
    count: bundlesWithDetails.length,
    data: bundlesWithDetails,
    offers: bundlesWithDetails,
    bundles: bundlesWithDetails,
  });
};

/**
 * GET /api/store/offer/:id (or /api/store/bundle/:id)
 * جلب تفاصيل عرض أو Bundle معين
 */
export const getBundleById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFound("Offer or Bundle ID is invalid");
  }

  const bundle = await PandelModel.findById(id).lean();

  if (!bundle) {
    throw new NotFound("Offer or Bundle not found");
  }

  const bundleWithDetails = await formatBundleWithDetails(bundle);

  return SuccessResponse(res, {
    message: "Offer retrieved successfully",
    data: bundleWithDetails,
    offer: bundleWithDetails,
    bundle: bundleWithDetails,
  });
};