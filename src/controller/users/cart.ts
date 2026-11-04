// controllers/cart/cartController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import { CartModel } from "../../models/schema/users/Cart";
import { ProductModel } from "../../models/schema/admin/products";
import { ProductPriceModel } from "../../models/schema/admin/product_price";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { ServiceFeeModel } from "../../models/schema/admin/ServiceFee";
import { CouponModel } from "../../models/schema/admin/coupons";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { AddressModel } from "../../models/schema/users/Address";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";

/* =========================================================
   Types
========================================================= */
type StockIssueReason =
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_STOCK"
  | "VARIANT_REQUIRED";

interface StockIssue {
  productId: string;
  productName: string;
  variantId: string | null;
  variantCode: string | null;
  variantLabel: string | null; // e.g. "Color: Red / Size: L"
  options: { variation: string | null; value: string | null }[];
  requested: number;
  available: number;
  reason: StockIssueReason;
}

/* =========================================================
   Helper: Get Cart Query (user OR sessionId)
========================================================= */
const getCartQuery = (req: Request) => {
  const userId = req.user?.id;
  const sessionId = req.headers["x-session-id"] || req.body?.sessionId;

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    return { user: new mongoose.Types.ObjectId(userId) };
  }

  if (sessionId && typeof sessionId === "string" && sessionId.trim()) {
    return { sessionId: sessionId.trim() };
  }

  throw new BadRequest("Valid User ID or Session ID is required");
};

/* =========================================================
   Helper: Extract userId from query safely
========================================================= */
const getUserIdFromQuery = (query: any): mongoose.Types.ObjectId | null => {
  if (query && "user" in query && query.user) {
    return query.user;
  }
  return null;
};

/* =========================================================
   Helper: Active Discount Check
========================================================= */
const getActiveDiscount = (discount: any): any | null => {
  if (!discount) return null;
  if (discount.status !== true) return null;
  const applyIn = discount.applyIn;
  const appliesToEcommerce =
    applyIn === "E-commerce" ||
    (Array.isArray(applyIn) && applyIn.includes("E-commerce"));
  if (!appliesToEcommerce) return null;
  return discount;
};

/* =========================================================
   Helper: Compute Final Price After Discount
========================================================= */
const computeFinalPrice = (basePrice: number, discount: any): number => {
  if (!discount) return basePrice;
  if (discount.type === "percentage") {
    return Math.max(basePrice - basePrice * discount.amount, 0);
  }
  return Math.max(basePrice - discount.amount, 0);
};

/* =========================================================
   Core: Calculate Cart Totals
========================================================= */
const calculateCartTotals = async (
  cart: any,
  userId?: mongoose.Types.ObjectId | string | null,
  warehouseId?: mongoose.Types.ObjectId[],
) => {
  let totalCartPrice = 0;
  let totalTaxAmount = 0;
  let hasFreeShippingProduct = false;

  for (const item of cart.cartItems) {
    const product = item.product as any;
    const variant = item.variant as any;

    const discount = getActiveDiscount(product?.discountId);
    const basePrice = variant ? variant.price : product?.price || 0;
    const currentPrice = computeFinalPrice(basePrice, discount);
    item.price = currentPrice;

    if (product?.free_shipping) hasFreeShippingProduct = true;

    if (product?.taxesId?.status) {
      const tax = product.taxesId;
      const itemTotal = currentPrice * item.quantity;
      totalTaxAmount +=
        tax.type === "percentage"
          ? (itemTotal * tax.amount) / 100
          : tax.amount * item.quantity;
    }
    totalCartPrice += currentPrice * item.quantity;
  }

  /* -------- Service Fees -------- */
  const activeFees = await ServiceFeeModel.find({
    module: "online",
    status: true,
    $or: [
      { warehouseId: { $exists: false } },
      { warehouseId: { $in: warehouseId } },
    ],
  });
  let totalServiceFee = 0;
  activeFees.forEach((fee) => {
    totalServiceFee +=
      fee.type === "percentage"
        ? (totalCartPrice * fee.amount) / 100
        : fee.amount;
  });

  /* -------- Shipping Cost -------- */
  const shippingSettings = await ShippingSettingsModel.findOne({
    singletonKey: "default",
  });
  let shippingCost = 0;

  if (!(shippingSettings?.freeShippingEnabled || hasFreeShippingProduct)) {
    if ((shippingSettings as any)?.self?.method === "flat_rate") {
      shippingCost = Number((shippingSettings as any)?.self?.flatRate || 0);
    } else if (userId) {
      const address = await AddressModel.findOne({
        user: userId,
      }).populate("city zone");
      shippingCost = address
        ? Number(
            (address.zone as any)?.shipingCost ||
              (address.city as any)?.shipingCost ||
              0,
          )
        : 0;
    }
  }

  cart.totalCartPrice = totalCartPrice;
  cart.taxAmount = totalTaxAmount;
  cart.serviceFee = totalServiceFee;

  /* -------- Coupon Recalculation -------- */
  if (cart.coupon) {
    const coupon = await CouponModel.findById(cart.coupon);
    if (
      coupon &&
      coupon.available > 0 &&
      new Date(coupon.expired_date) > new Date()
    ) {
      if (totalCartPrice >= (coupon.minimum_amount_for_use || 0)) {
        cart.couponDiscount =
          coupon.type === "percentage"
            ? (totalCartPrice * coupon.amount) / 100
            : coupon.amount;
      } else {
        cart.coupon = undefined;
        cart.couponDiscount = 0;
      }
    } else {
      cart.coupon = undefined;
      cart.couponDiscount = 0;
    }
  }

  return { totalCartPrice, shippingCost };
};

/* =========================================================
   Helper: Available Stock Across Online Warehouses
========================================================= */
const getAvailableStock = async (
  productId: mongoose.Types.ObjectId,
  productPriceId: mongoose.Types.ObjectId | null,
  onlineWarehouseIds: mongoose.Types.ObjectId[],
): Promise<number> => {
  const stock = await Product_WarehouseModel.aggregate([
    {
      $match: {
        productId,
        warehouseId: { $in: onlineWarehouseIds },
        productPriceId,
      },
    },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);
  return stock[0]?.total || 0;
};

/* =========================================================
   Helper: Variant Info (NEW)
   يجيب كود الـ SKU + أسماء الـ options بتاعته (Color: Red / Size: L)
   عشان نعرف بالظبط أنهي فاريشن هو، حتى لو المنتج ليه 1000.
   بيشتغل على فاريشن واحد بس (اللي في الكارت) فمفيش مشكلة أداء.
========================================================= */
const getVariantInfo = async (variantId: string | null | undefined) => {
  const empty = {
    code: null as string | null,
    label: null as string | null,
    options: [] as { variation: string | null; value: string | null }[],
  };

  if (!variantId || !mongoose.Types.ObjectId.isValid(variantId)) return empty;

  const [info] = await ProductPriceModel.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(variantId) } },
    {
      $lookup: {
        from: "productpriceoptions",
        localField: "_id",
        foreignField: "product_price_id",
        as: "po",
      },
    },
    {
      $lookup: {
        from: "options",
        localField: "po.option_id",
        foreignField: "_id",
        as: "opts",
      },
    },
    {
      $lookup: {
        from: "variations",
        localField: "opts.variationId",
        foreignField: "_id",
        as: "vars",
      },
    },
    {
      $project: {
        code: 1,
        opts: { _id: 1, name: 1, ar_name: 1, variationId: 1 },
        vars: { _id: 1, name: 1, ar_name: 1 },
      },
    },
  ]);

  if (!info) return empty;

  const options = (info.opts || []).map((o: any) => {
    const v = (info.vars || []).find(
      (x: any) => String(x._id) === String(o.variationId),
    );
    return { variation: v?.name ?? null, value: o.name ?? null };
  });

  const label =
    options
      .map((o: any) => (o.variation ? `${o.variation}: ${o.value}` : o.value))
      .filter(Boolean)
      .join(" / ") ||
    info.code ||
    null;

  return { code: info.code ?? null, label, options };
};

/* =========================================================
   Helper: Resolve Variant
   - الفاريشن مبعوت → يرجّعه
   - مش مبعوت + SKU واحد → يختاره تلقائي
   - مش مبعوت + أكتر من SKU → required = true
   - مفيش SKUs → منتج بسيط
========================================================= */
const resolveVariantId = async (
  productId: string,
  productVariantId?: string,
): Promise<{ variantId?: string; required: boolean }> => {
  if (productVariantId) return { variantId: productVariantId, required: false };

  const prices = await ProductPriceModel.find({ productId })
    .select("_id")
    .lean();

  if (prices.length === 1) {
    return { variantId: prices[0]._id.toString(), required: false };
  }
  if (prices.length > 1) return { required: true };

  return { required: false };
};

/* =========================================================
   Helper: Build readable message from issues
========================================================= */
const buildIssuesMessage = (issues: StockIssue[]): string => {
  const MAX = 5;
  const parts = issues.slice(0, MAX).map((i) => {
    const name = i.variantLabel
      ? `"${i.productName}" (${i.variantLabel})`
      : `"${i.productName}"`;
    if (i.reason === "VARIANT_REQUIRED") return `${name}: variant required`;
    return `${name}: requested ${i.requested}, available ${i.available}`;
  });
  const more = issues.length > MAX ? ` (+${issues.length - MAX} more)` : "";
  return `Some items are unavailable: ${parts.join(" | ")}${more}`;
};

/* =========================================================
   1. Sync Cart
========================================================= */
export const syncCart = asyncHandler(async (req: Request, res: Response) => {
  const { items } = req.body;
  const query = getCartQuery(req);

  if (!Array.isArray(items)) {
    throw new BadRequest("items must be an array");
  }

  const onlineWarehouses = await WarehouseModel.find({
    Is_Online: true,
  }).select("_id");
  const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);

  const validatedItems = [];
  const stockIssues: StockIssue[] = []; // NEW: نجمع كل المشاكل بدل ما نقف عند أول واحدة

  for (const item of items) {
    const { productId, productVariantId, quantity } = item;

    /* ----- Validate productId ----- */
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new BadRequest(`Invalid product ID: ${productId}`);
    }

    /* ----- Validate quantity ----- */
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequest(`Invalid quantity for product ${productId}`);
    }

    const product = await ProductModel.findById(productId)
      .populate("discountId")
      .populate("categoryId", "Is_Online");

    if (!product) throw new NotFound(`Product not found: ${productId}`);
    if (!(product as any).Is_Online) {
      throw new BadRequest(`Product is not available online: ${productId}`);
    }

    const productName = (product as any).name || String(productId);

    const categoryData = (product as any).categoryId;
    const isCategoryOnline = Array.isArray(categoryData)
      ? categoryData.some((c: any) => c?.Is_Online === true)
      : categoryData?.Is_Online === true;

    if (!isCategoryOnline) {
      throw new BadRequest(
        `Product's category is not available online: "${productName}"`,
      );
    }

    /* ----- Resolve variant ----- */
    const { variantId: resolvedVariantId, required } = await resolveVariantId(
      String(productId),
      productVariantId,
    );

    if (required) {
      stockIssues.push({
        productId: String(productId),
        productName,
        variantId: null,
        variantCode: null,
        variantLabel: null,
        options: [],
        requested: quantity,
        available: 0,
        reason: "VARIANT_REQUIRED",
      });
      continue;
    }

    /* ----- Validate variant ----- */
    let variant: any = null;
    if (resolvedVariantId) {
      if (!mongoose.Types.ObjectId.isValid(resolvedVariantId)) {
        throw new BadRequest(`Invalid variant ID: ${resolvedVariantId}`);
      }
      variant = await ProductPriceModel.findById(resolvedVariantId);
      if (!variant) {
        throw new NotFound(`Product variant not found: ${resolvedVariantId}`);
      }
      if (variant.productId.toString() !== productId.toString()) {
        throw new BadRequest(
          `Variant ${resolvedVariantId} does not belong to product "${productName}"`,
        );
      }
    }

    /* ----- Check stock ----- */
    const availableStock = await getAvailableStock(
      new mongoose.Types.ObjectId(productId),
      resolvedVariantId ? new mongoose.Types.ObjectId(resolvedVariantId) : null,
      onlineWarehouseIds,
    );

    if (quantity > availableStock) {
      const info = await getVariantInfo(resolvedVariantId);
      stockIssues.push({
        productId: String(productId),
        productName,
        variantId: resolvedVariantId || null,
        variantCode: info.code,
        variantLabel: info.label,
        options: info.options,
        requested: quantity,
        available: availableStock,
        reason: availableStock === 0 ? "OUT_OF_STOCK" : "INSUFFICIENT_STOCK",
      });
      continue;
    }

    /* ----- Compute price ----- */
    const discount = getActiveDiscount((product as any).discountId);
    const basePrice = variant ? variant.price : (product as any).price || 0;
    const currentPrice = computeFinalPrice(basePrice, discount);

    validatedItems.push({
      product: productId,
      variant: resolvedVariantId || undefined,
      quantity: quantity,
      price: currentPrice,
    });
  }

  /* ----- لو فيه أي مشاكل ستوك: رجّعها كلها مرة واحدة ----- */
  if (stockIssues.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: "STOCK_ISSUES",
        message: buildIssuesMessage(stockIssues),
        items: stockIssues,
      },
    });
    return;
  }

  /* ----- Upsert cart ----- */
  await CartModel.findOneAndUpdate(
    query,
    { cartItems: validatedItems },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  /* ----- Fetch full cart ----- */
  const fullCart = await CartModel.findOne(query)
    .populate({
      path: "cartItems.product",
      select: "name ar_name image price free_shipping taxesId discountId",
      populate: [{ path: "taxesId" }, { path: "discountId" }],
    })
    .populate("cartItems.variant");

  if (!fullCart) throw new NotFound("Cart processing failed");

  const userIdForCalc = getUserIdFromQuery(query);

  const { shippingCost } = await calculateCartTotals(
    fullCart,
    userIdForCalc,
    onlineWarehouseIds,
  );
  await fullCart.save();

  SuccessResponse(
    res,
    { message: "Cart synced successfully", cart: fullCart, shippingCost },
    200,
  );
});

/* =========================================================
   2. Get Cart
   كل item دلوقتي فيه: availableStock + inStock + variantInfo
========================================================= */
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const query = getCartQuery(req);
  const cart = await CartModel.findOne(query)
    .populate({
      path: "cartItems.product",
      select: "name ar_name image price free_shipping taxesId discountId",
      populate: [{ path: "taxesId" }, { path: "discountId" }],
    })
    .populate("cartItems.variant");

  if (!cart || cart.cartItems.length === 0) {
    return SuccessResponse(res, {
      message: "Empty",
      cart: { cartItems: [] },
      shippingCost: 0,
    });
  }

  const onlineWarehouses = await WarehouseModel.find({
    Is_Online: true,
  }).select("_id");
  const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);

  const userIdForCalc = getUserIdFromQuery(query);

  const { shippingCost } = await calculateCartTotals(
    cart,
    userIdForCalc,
    onlineWarehouseIds,
  );
  await cart.save();

  const cartObj: any = cart.toObject();
  const enrichedItems = await Promise.all(
    cartObj.cartItems.map(async (item: any) => {
      const productId = item.product?._id;
      const productPriceId = item.variant?._id || null;
      const availableStock = productId
        ? await getAvailableStock(productId, productPriceId, onlineWarehouseIds)
        : 0;
      const variantInfo = productPriceId
        ? await getVariantInfo(String(productPriceId))
        : null;
      return {
        ...item,
        availableStock,
        inStock: availableStock >= item.quantity,
        variantInfo, // { code, label, options[] } أو null
      };
    }),
  );

  const responseCart = { ...cartObj, cartItems: enrichedItems };
  SuccessResponse(res, { cart: responseCart, shippingCost });
});

/* =========================================================
   3. Apply Coupon
========================================================= */
export const applyCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { couponCode } = req.body;
  const query = getCartQuery(req);
  const userIdForCalc = getUserIdFromQuery(query);

  const cart = await CartModel.findOne(query)
    .populate({
      path: "cartItems.product",
      populate: [{ path: "taxesId" }, { path: "discountId" }],
    })
    .populate("cartItems.variant");

  if (!cart) throw new NotFound("Cart is empty");

  /* ----- Remove coupon ----- */
  if (!couponCode) {
    cart.coupon = undefined;
    cart.couponDiscount = 0;
    await calculateCartTotals(cart, userIdForCalc);
    await cart.save();
    return SuccessResponse(res, {
      message: "Coupon removed successfully",
      cart,
    });
  }

  /* ----- Validate coupon ----- */
  const coupon = await CouponModel.findOne({
    coupon_code: couponCode,
    available: { $gt: 0 },
    expired_date: { $gt: new Date() },
  });

  if (!coupon) throw new BadRequest("Invalid coupon");

  const { totalCartPrice } = await calculateCartTotals(cart, userIdForCalc);

  if (totalCartPrice < (coupon.minimum_amount_for_use || 0)) {
    throw new BadRequest(`Minimum order is ${coupon.minimum_amount_for_use}`);
  }

  cart.coupon = coupon._id as any;
  cart.couponDiscount =
    coupon.type === "percentage"
      ? (totalCartPrice * coupon.amount) / 100
      : coupon.amount;

  await cart.save();
  SuccessResponse(res, { message: "Coupon applied successfully", cart });
});

/* =========================================================
   4. Clear Cart
========================================================= */
export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  await CartModel.findOneAndDelete(getCartQuery(req));
  SuccessResponse(res, { message: "Cart cleared" });
});
