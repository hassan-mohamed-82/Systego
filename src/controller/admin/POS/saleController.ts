import {
  SaleModel,
  ProductSalesModel,
} from "../../../models/schema/admin/POS/Sale";
import { Request, Response } from "express";
import { WarehouseModel } from "../../../models/schema/admin/Warehouse";
import { NotFound, UnauthorizedError } from "../../../Errors";
import { CustomerModel } from "../../../models/schema/admin/POS/customer";
import { SuccessResponse } from "../../../utils/response";
import { CouponModel } from "../../../models/schema/admin/coupons";
import { TaxesModel } from "../../../models/schema/admin/Taxes";
import { DiscountModel } from "../../../models/schema/admin/Discount";
import {
  ProductPriceModel,
  ProductPriceOptionModel,
} from "../../../models/schema/admin/product_price";
import { PaymentModel } from "../../../models/schema/admin/POS/payment";
import { BadRequest } from "../../../Errors/BadRequest";
import { GiftCardModel } from "../../../models/schema/admin/POS/giftCard";
import { BankAccountModel } from "../../../models/schema/admin/Financial_Account";
import { PandelModel } from "../../../models/schema/admin/pandels";
import { CashierShift } from "../../../models/schema/admin/POS/CashierShift";
import mongoose from "mongoose";
import { ProductModel } from "../../../models/schema/admin/products";
import { UserModel } from "../../../models/schema/admin/User";
import bcrypt from "bcryptjs";
import { Product_WarehouseModel } from "../../../models/schema/admin/Product_Warehouse";
import { ServiceFeeModel } from "../../../models/schema/admin/ServiceFee";
import { CashierModel } from "../../../models/schema/admin/cashier";

// ✅ Dynamic store info - بيجيب اسم البراند من السوبر أدمن (صاحب البزنس)
const getStoreInfo = async (userId: string) => {
  // 1. جيب اسم البراند من الـ superadmin (صاحب البزنس)
  const superAdmin = await UserModel.findOne({ role: "superadmin" })
    .select("company_name phone address warehouse_id")
    .lean();

  if (superAdmin?.company_name) {
    return {
      name: superAdmin.company_name,
      phone: superAdmin.phone || "",
      address: superAdmin.address || "",
    };
  }

  // Fallback: لو السوبر أدمن مفيش عنده company_name، جيب من الـ Warehouse بتاعه
  if (superAdmin?.warehouse_id) {
    const warehouse = await WarehouseModel.findById(superAdmin.warehouse_id)
      .select("name phone address")
      .lean();
    if (warehouse) {
      return {
        name: warehouse.name,
        phone: warehouse.phone || "",
        address: warehouse.address || "",
      };
    }
  }

  // Fallback أخير: لو مفيش superadmin أصلاً، جرب اليوزر الحالي
  const user = await UserModel.findById(userId)
    .select("company_name phone address warehouse_id")
    .lean();

  if (user?.company_name) {
    return {
      name: user.company_name,
      phone: user.phone || "",
      address: user.address || "",
    };
  }

  if (user?.warehouse_id) {
    const warehouse = await WarehouseModel.findById(user.warehouse_id)
      .select("name phone address")
      .lean();
    if (warehouse) {
      return {
        name: warehouse.name,
        phone: warehouse.phone || "",
        address: warehouse.address || "",
      };
    }
  }

  return { name: "", phone: "", address: "" };
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

// ═══════════════════════════════════════════════════════════════════════
// createSale — FIXED VERSION (real Mongoose)
// Same fixes as the ORM version, PLUS: this version uses real transactions
// and atomic conditional stock decrements, since real Mongoose supports
// both. That closes the TOCTOU race that the ORM version could only flag
// as a future-plan TODO.
// Fixes are marked "// ✅ FIX #N". Confirmed schema conventions noted where
// relevant.
// ═══════════════════════════════════════════════════════════════════════

const toCents = (n: number) => Math.round(Number(n) * 100);

export const createSale = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const cashierId = jwtUser?.id;
  const warehouseId = jwtUser?.warehouse_id;

  if (!cashierId) {
    throw new BadRequest("Unauthorized: user not found in token");
  }

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const openShift = await CashierShift.findOne({
    cashierman_id: cashierId,
    status: "open",
  }).sort({ start_time: -1 });

  if (!openShift) {
    throw new BadRequest(
      "You must open a cashier shift before creating a sale",
    );
  }

  const {
    customer_id,
    order_pending = 0,
    gift_card_id,
    gift_card_amount = 0, // ✅ FIX #3: explicit amount to apply from the gift card
    service_fee_ids = [],
    order_tax,
    order_discount,
    products,
    bundles,
    shipping = 0,
    tax_rate = 0,
    discount = 0, // backward-compat fallback only, order_discount doc takes priority (FIX #2)
    note,
    financials,
    coupon_code,
    Due = 0,
  } = req.body;

  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse) {
    throw new NotFound("Warehouse not found");
  }

  if (
    (!products || products.length === 0) &&
    (!bundles || bundles.length === 0)
  ) {
    throw new BadRequest("At least one product or bundle is required");
  }

  const normalizedOrderPending = Number(order_pending) === 0 ? 0 : 1;
  const isPending = normalizedOrderPending === 1;
  const isDue = Number(Due) === 1;

  // ✅ FIX #12: order_pending and Due can't both be true
  if (isPending && isDue) {
    throw new BadRequest(
      "A sale cannot be both pending (order_pending=1) and due (Due=1) at the same time",
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ PROCESS PRODUCTS & APPLY WHOLESALE PRICE
  // ✅ FIX #4: same ratio formula in both branches (see note below)
  // ✅ FIX #5: quantity is Number()-converted once and used consistently
  // ═══════════════════════════════════════════════════════════
  const processedProducts: any[] = [];
  let productsTotal = 0;

  if (products && products.length > 0) {
    for (const p of products as any[]) {
      const {
        product_id,
        product_price_id,
        quantity,
        discount: lineDiscount = 0,
        discount_type: lineDiscountType = "fixed",
      } = p;
      const qty = Number(quantity); // ✅ FIX #5

      let finalPrice = 0;
      let originalPrice = 0;
      let isWholesale = false;

      if (product_price_id) {
        const priceDoc = await ProductPriceModel.findById(product_price_id);
        if (!priceDoc) {
          throw new NotFound(`Product price ${product_price_id} not found`);
        }

        originalPrice = priceDoc.price || 0;
        finalPrice = originalPrice;

        if (product_id) {
          const product = await ProductModel.findById(product_id);
          if (product) {
            const minQty = product.start_quantaty || 0;
            const wholesalePrice = product.whole_price;

            if (
              wholesalePrice &&
              wholesalePrice > 0 &&
              minQty > 0 &&
              qty >= minQty
            ) {
              const discountRatio = wholesalePrice / (product.price || 1);
              finalPrice =
                Math.round(originalPrice * discountRatio * 100) / 100;
              isWholesale = true;
            }
          }
        }
      } else if (product_id) {
        const product = await ProductModel.findById(product_id);
        if (!product) {
          throw new NotFound(`Product ${product_id} not found`);
        }

        originalPrice = product.price || 0;
        finalPrice = originalPrice;

        const minQtyForWholesale = product.start_quantaty || 0;
        const wholesalePrice = product.whole_price;

        if (
          wholesalePrice &&
          wholesalePrice > 0 &&
          minQtyForWholesale > 0 &&
          qty >= minQtyForWholesale
        ) {
          // ✅ FIX #4: same ratio formula as the variation branch (collapses
          // to finalPrice = wholesalePrice here since originalPrice === product.price)
          const discountRatio = wholesalePrice / (product.price || 1);
          finalPrice = Math.round(originalPrice * discountRatio * 100) / 100;
          isWholesale = true;
        }
      }

      if (finalPrice === 0) {
        finalPrice = Number(p.price) || 0;
        originalPrice = finalPrice;
      }

      let appliedDiscount = 0;
      if (Number(lineDiscount) > 0) {
        if (lineDiscountType === "percentage") {
          appliedDiscount = finalPrice * (Number(lineDiscount) / 100);
        } else {
          appliedDiscount = Number(lineDiscount);
        }
        finalPrice = Math.max(0, finalPrice - appliedDiscount);
      }

      const finalSubtotal = finalPrice * qty;

      processedProducts.push({
        product_id: p.product_id,
        product_price_id: p.product_price_id,
        quantity: qty,
        price: finalPrice,
        subtotal: finalSubtotal,
        original_price: originalPrice,
        discount: Number(lineDiscount),
        discount_type: lineDiscountType,
        is_wholesale: isWholesale,
        options_id: p.options_id,
        isGift: p.isGift,
      });

      if (!p.isGift) {
        productsTotal += finalSubtotal;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ PROCESS BUNDLES
  // ✅ FIX #5: quantity Number()-converted and used consistently
  // ═══════════════════════════════════════════════════════════
  const processedBundles: any[] = [];
  let bundlesTotal = 0;

  if (bundles && bundles.length > 0) {
    for (const b of bundles as any[]) {
      const {
        bundle_id,
        quantity,
        selected_variations,
        isGift,
        discount: lineDiscount = 0,
        discount_type: lineDiscountType = "fixed",
      } = b;
      const qty = Number(quantity); // ✅ FIX #5

      if (!mongoose.Types.ObjectId.isValid(bundle_id)) {
        throw new BadRequest("Invalid bundle id");
      }

      const bundleDoc = await PandelModel.findById(bundle_id).lean();
      if (!bundleDoc) {
        throw new NotFound("Bundle not found");
      }

      const bundleWarehouseIds = Array.isArray((bundleDoc as any).warehouse_ids)
        ? (bundleDoc as any).warehouse_ids.map((id: any) => String(id))
        : [];
      const bundleIsAvailableInWarehouse =
        (bundleDoc as any).all_warehouses !== false ||
        bundleWarehouseIds.includes(String(warehouseId));

      if (!bundleIsAvailableInWarehouse) {
        throw new BadRequest(
          `Bundle "${(bundleDoc as any).name}" is not assigned to warehouse ${warehouseId}`,
        );
      }

      const bundleProductsProcessed: any[] = [];

      for (const bundleProduct of (bundleDoc as any).products || []) {
        const productId = bundleProduct.productId;
        let productPriceId = bundleProduct.productPriceId;
        const productQty = bundleProduct.quantity || 1;

        if (!productPriceId && selected_variations) {
          const selectedVar = selected_variations.find(
            (sv: any) => sv.productId?.toString() === productId?.toString(),
          );
          if (selectedVar?.productPriceId) {
            productPriceId = selectedVar.productPriceId;
          }
        }

        const requiredQty = qty * productQty; // ✅ FIX #5

        if (productPriceId) {
          const priceDoc = await ProductPriceModel.findById(productPriceId);
          if (!priceDoc) {
            throw new NotFound(`Product variation ${productPriceId} not found`);
          }

          const variationWarehouseStock = await Product_WarehouseModel.findOne({
            productId: productId,
            productPriceId: productPriceId,
            warehouseId: warehouseId,
          });

          if (!variationWarehouseStock) {
            const product = await ProductModel.findById(productId)
              .select("name")
              .lean();
            throw new BadRequest(
              `Bundle "${bundleDoc.name}" - variation for "${(product as any)?.name || productId}" is not assigned to this warehouse`,
            );
          }

          if ((variationWarehouseStock.quantity ?? 0) < requiredQty) {
            const product = await ProductModel.findById(productId)
              .select("name")
              .lean();
            throw new BadRequest(
              `Not enough stock for "${(product as any)?.name || "product"}" variation in bundle "${bundleDoc.name}". Available: ${variationWarehouseStock.quantity}, Required: ${requiredQty}`,
            );
          }
        } else {
          const warehouseStock = await Product_WarehouseModel.findOne({
            productId: productId,
            warehouseId: warehouseId,
          });

          if (!warehouseStock) {
            const product = await ProductModel.findById(productId)
              .select("name")
              .lean();
            throw new BadRequest(
              `Bundle "${bundleDoc.name}" is not available in this warehouse because product "${(product as any)?.name || productId}" is not assigned to warehouse stock`,
            );
          }

          if ((warehouseStock.quantity ?? 0) < requiredQty) {
            const product = await ProductModel.findById(productId)
              .select("name")
              .lean();
            throw new BadRequest(
              `Not enough stock for "${(product as any)?.name || "product"}" in bundle "${bundleDoc.name}". Available: ${warehouseStock.quantity}, Required: ${requiredQty}`,
            );
          }
        }

        bundleProductsProcessed.push({
          productId,
          productPriceId,
          quantity: productQty,
        });
      }

      let finalBundlePrice = bundleDoc.price;
      let appliedDiscount = 0;

      if (Number(lineDiscount) > 0) {
        if (lineDiscountType === "percentage") {
          appliedDiscount = finalBundlePrice * (Number(lineDiscount) / 100);
        } else {
          appliedDiscount = Number(lineDiscount);
        }
        finalBundlePrice = Math.max(0, finalBundlePrice - appliedDiscount);
      }

      const bundleSubtotal = finalBundlePrice * qty; // ✅ FIX #5

      processedBundles.push({
        bundle_id,
        quantity: qty, // ✅ FIX #5
        price: finalBundlePrice,
        subtotal: bundleSubtotal,
        original_price: bundleDoc.price,
        discount: Number(lineDiscount),
        discount_type: lineDiscountType,
        isGift: !!isGift,
        products: bundleProductsProcessed,
      });

      if (!isGift) {
        bundlesTotal += bundleSubtotal;
      }
    }
  }

  const subtotal = productsTotal + bundlesTotal;

  // ═══════════════════════════════════════════════════════════
  // Customer Validation
  // ═══════════════════════════════════════════════════════════
  let customer: any = null;
  if (customer_id) {
    if (!mongoose.Types.ObjectId.isValid(customer_id)) {
      throw new BadRequest("Invalid customer id");
    }
    customer = await CustomerModel.findById(customer_id);
    if (!customer) {
      throw new NotFound("Customer not found");
    }
  }

  if (isDue && !customer) {
    throw new BadRequest("Customer is required for due sales");
  }

  // ═══════════════════════════════════════════════════════════
  // Coupon / Tax / Discount / Gift Card doc validation
  // ✅ FIX #1 & #2: these are now actually converted into monetary amounts
  // and fed into finalGrandTotal below, instead of validated-then-discarded
  // ═══════════════════════════════════════════════════════════
  let coupon: any = null;
  if (coupon_code) {
    coupon = await CouponModel.findOne({ coupon_code: coupon_code });
    if (!coupon) throw new NotFound("Coupon not found");
    if (coupon.available <= 0) throw new BadRequest("Coupon is out of stock");
    if (coupon.expired_date && coupon.expired_date < new Date()) {
      throw new BadRequest("Coupon is expired");
    }
    // ✅ FIX #1 (schema-confirmed): enforce minimum_amount_for_use
    if (
      coupon.minimum_amount_for_use &&
      subtotal < coupon.minimum_amount_for_use
    ) {
      throw new BadRequest(
        `Coupon requires a minimum order amount of ${coupon.minimum_amount_for_use} (current subtotal: ${subtotal.toFixed(2)})`,
      );
    }
  }

  let tax: any = null;
  if (order_tax) {
    if (!mongoose.Types.ObjectId.isValid(order_tax)) {
      throw new BadRequest("Invalid order_tax id");
    }
    tax = await TaxesModel.findById(order_tax);
    if (!tax) throw new NotFound("Tax not found");
    if (!tax.status) throw new BadRequest("Tax is not active");
  }

  let discountDoc: any = null;
  if (order_discount) {
    if (!mongoose.Types.ObjectId.isValid(order_discount)) {
      throw new BadRequest("Invalid order_discount id");
    }
    discountDoc = await DiscountModel.findById(order_discount);
    if (!discountDoc) throw new NotFound("Discount not found");
    if (!discountDoc.status) throw new BadRequest("Discount is not active");
  }

  let giftCard: any = null;
  if (gift_card_id) {
    if (!mongoose.Types.ObjectId.isValid(gift_card_id)) {
      throw new BadRequest("Invalid gift card id");
    }
    giftCard = await GiftCardModel.findById(gift_card_id);
    if (!giftCard) throw new NotFound("Gift card not found");
    if (!giftCard.status) throw new BadRequest("Gift card is not active");
    if (giftCard.expired_date && giftCard.expired_date < new Date()) {
      throw new BadRequest("Gift card is expired");
    }
  }

  // ✅ FIX #3: gift_card_amount must be backed by a valid gift card and
  // can't exceed its balance — instead of deducting the whole payment total.
  const requestedGiftCardAmount = Number(gift_card_amount) || 0;
  if (requestedGiftCardAmount > 0) {
    if (!giftCard) {
      throw new BadRequest(
        "gift_card_amount was provided without a valid gift_card_id",
      );
    }
    if (requestedGiftCardAmount > giftCard.amount) {
      throw new BadRequest(
        `Gift card balance (${giftCard.amount}) is less than the requested amount (${requestedGiftCardAmount})`,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ CALCULATE FINAL GRAND TOTAL
  // ═══════════════════════════════════════════════════════════
  const normalizedServiceFeeIds = Array.isArray(service_fee_ids)
    ? service_fee_ids
        .filter((id: unknown) => !!id)
        .map((id: unknown) => String(id))
    : [];

  const uniqueServiceFeeIds = Array.from(new Set(normalizedServiceFeeIds));

  uniqueServiceFeeIds.forEach((id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequest(`Invalid service fee id: ${id}`);
    }
  });

  const serviceFeeDocs = uniqueServiceFeeIds.length
    ? await ServiceFeeModel.find({
        _id: { $in: uniqueServiceFeeIds },
        status: true,
        module: "pos",
        $or: [{ warehouseId }, { warehouseId: null }],
      }).lean()
    : [];

  if (serviceFeeDocs.length !== uniqueServiceFeeIds.length) {
    throw new BadRequest(
      "One or more selected service fees are invalid for this warehouse or module",
    );
  }

  const appliedServiceFees = serviceFeeDocs.map((fee: any) => {
    const calculatedAmount =
      fee.type === "percentage"
        ? roundCurrency((subtotal * Number(fee.amount || 0)) / 100)
        : roundCurrency(Number(fee.amount || 0));

    return {
      service_fee_id: fee._id,
      title: fee.title,
      type: fee.type,
      rate: Number(fee.amount || 0),
      amount: calculatedAmount,
      module: fee.module,
      warehouseId: fee.warehouseId || null,
    };
  });

  const serviceFeeTotal = roundCurrency(
    appliedServiceFees.reduce((sum, fee) => sum + fee.amount, 0),
  );

  // ✅ FIX #2 (schema-confirmed): DiscountModel percentage `amount` is a
  // FRACTION (0.1 = 10%) — subtotal * amount, NOT subtotal * amount / 100.
  let discountAmount = 0;
  if (discountDoc) {
    discountAmount =
      discountDoc.type === "percentage"
        ? roundCurrency(subtotal * Number(discountDoc.amount || 0))
        : roundCurrency(Number(discountDoc.amount || 0));
  } else if (Number(discount) > 0) {
    discountAmount = roundCurrency(Number(discount)); // legacy fallback, flat amount
  }

  // ✅ FIX #1 (schema-confirmed): CouponModel type is "percentage" | "flat",
  // and its percentage `amount` is a WHOLE NUMBER (10 = 10%) — different
  // convention from Discount/Tax.
  let couponAmount = 0;
  if (coupon) {
    couponAmount =
      coupon.type === "percentage"
        ? roundCurrency((subtotal * Number(coupon.amount || 0)) / 100)
        : roundCurrency(Number(coupon.amount || 0)); // "flat"
  }

  // ✅ FIX #2 (schema-confirmed): TaxesModel follows the SAME fraction
  // convention as Discount (0.1 = 10%) — subtotal * amount, no / 100.
  // Raw tax_rate fallback stays whole-number based.
  let taxAmountCalc = 0;
  if (tax) {
    taxAmountCalc =
      tax.type === "percentage"
        ? roundCurrency(subtotal * Number(tax.amount || 0))
        : roundCurrency(Number(tax.amount || 0));
  } else {
    taxAmountCalc = roundCurrency((subtotal * Number(tax_rate)) / 100);
  }

  const rawGrandTotal =
    subtotal -
    discountAmount -
    couponAmount -
    requestedGiftCardAmount +
    serviceFeeTotal +
    taxAmountCalc +
    Number(shipping);

  // ✅ FIX #10: clamp negative totals instead of letting them flow downstream
  const finalGrandTotal = roundCurrency(Math.max(0, rawGrandTotal));
  const finalGrandTotalCents = toCents(finalGrandTotal);

  // ═══════════════════════════════════════════════════════════
  // ✅ Financials Validation
  // ✅ FIX (main bug): exact integer-cents comparison — no tolerance
  // window that a small/zero grand_total could sneak through. Financials
  // are only required (and only allowed) when the total is actually > 0.
  // ═══════════════════════════════════════════════════════════
  type FinancialLine = { account_id: string; amount: number };
  let paymentLines: FinancialLine[] = [];
  let totalPaidFromLines = 0;

  if (!isPending && !isDue) {
    if (finalGrandTotalCents > 0) {
      const finArr = financials as any[];

      if (!finArr || !Array.isArray(finArr) || finArr.length === 0) {
        throw new BadRequest(
          "Financials are required for completed sale (order_pending = 0)",
        );
      }

      paymentLines = finArr.map((f: any) => {
        const accId = f.account_id || f.id;
        const amt = Number(f.amount);

        if (!accId || !mongoose.Types.ObjectId.isValid(accId)) {
          throw new BadRequest("Invalid account_id in financials");
        }
        if (!amt || amt <= 0) {
          throw new BadRequest("Each payment line must have amount > 0");
        }

        return { account_id: accId, amount: amt };
      });

      totalPaidFromLines = paymentLines.reduce((sum, p) => sum + p.amount, 0);

      if (toCents(totalPaidFromLines) !== finalGrandTotalCents) {
        throw new BadRequest(
          `Sum of payments (${totalPaidFromLines.toFixed(2)}) must equal grand_total (${finalGrandTotal.toFixed(2)})`,
        );
      }

      for (const line of paymentLines) {
        const bankAccount = await BankAccountModel.findOne({
          _id: line.account_id,
          warehouseId: warehouseId,
          status: true,
          in_POS: true,
        });

        if (!bankAccount) {
          throw new BadRequest(
            "One of the financial accounts is not valid or not allowed in POS",
          );
        }
      }
    } else if (Array.isArray(financials) && financials.length > 0) {
      throw new BadRequest(
        "Grand total is 0 — no financials should be submitted for a fully-covered sale",
      );
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ STOCK PRE-CHECK (informational only)
  // This gives a fast, descriptive error before we open a transaction.
  // It does NOT guarantee correctness under concurrency by itself — that's
  // what the atomic conditional decrements inside the transaction below
  // are for. Think of this as a friendly early exit, not the safety net.
  // ═══════════════════════════════════════════════════════════
  for (const p of processedProducts) {
    const { product_price_id, product_id, quantity } = p;

    if (product_price_id) {
      if (!mongoose.Types.ObjectId.isValid(product_price_id)) {
        throw new BadRequest("Invalid product_price_id");
      }
      const priceDoc = await ProductPriceModel.findById(product_price_id);
      if (!priceDoc) {
        throw new NotFound("Product price (variation) not found");
      }

      const variationWarehouseStock = await Product_WarehouseModel.findOne({
        productId: product_id,
        productPriceId: product_price_id,
        warehouseId: warehouseId,
      });

      if (!variationWarehouseStock) {
        throw new BadRequest(`Product variation is not assigned to warehouse`);
      }

      if ((variationWarehouseStock.quantity ?? 0) < quantity) {
        throw new BadRequest(
          `Not enough stock for variation in warehouse, available: ${variationWarehouseStock.quantity ?? 0}, required: ${quantity}`,
        );
      }
    } else {
      if (!product_id || !mongoose.Types.ObjectId.isValid(product_id)) {
        throw new BadRequest("Invalid product_id");
      }

      const warehouseStock = await Product_WarehouseModel.findOne({
        productId: product_id,
        warehouseId: warehouseId,
      });

      if (!warehouseStock) {
        throw new BadRequest(
          `Product ${product_id} is not assigned to warehouse ${warehouseId}`,
        );
      }

      if ((warehouseStock.quantity ?? 0) < quantity) {
        throw new BadRequest(
          `Not enough stock in warehouse, available: ${warehouseStock.quantity ?? 0}, required: ${quantity}`,
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ FIX #8/#9/#10/#11: everything that mutates data now runs inside a
  // real Mongoose transaction. Stock decrements use findOneAndUpdate with
  // a `quantity: { $gte: required }` filter — atomic check-and-decrement
  // in one operation, so two concurrent sales can no longer both pass a
  // separate check and then both decrement past zero.
  // ═══════════════════════════════════════════════════════════
  const accountIdsForSale =
    !isPending && !isDue && paymentLines.length > 0
      ? Array.from(new Set(paymentLines.map((p) => p.account_id)))
      : [];

  const paidAmountForDb = !isPending && !isDue ? totalPaidFromLines : 0;
  const remainingAmount = isDue ? finalGrandTotal : 0;

  const session = await mongoose.startSession();
  let sale: any;

  try {
    await session.withTransaction(async () => {
      const created = await SaleModel.create(
        [
          {
            date: new Date(),
            customer_id: customer ? customer._id : undefined,
            Due_customer_id: isDue && customer ? customer._id : undefined,
            Due: isDue ? 1 : 0,
            warehouse_id: warehouseId,
            account_id: accountIdsForSale,
            order_pending: normalizedOrderPending,
            coupon_code: coupon ? coupon.coupon_code : "",
            applied_coupon: coupon ? true : false,
            coupon_amount: couponAmount, // ✅ FIX #1
            gift_card_id: giftCard ? giftCard._id : undefined,
            gift_card_amount: requestedGiftCardAmount, // ✅ FIX #3
            order_tax: tax ? tax._id : undefined,
            order_discount: discountDoc ? discountDoc._id : undefined,
            discount_amount: discountAmount, // ✅ FIX #2
            service_fees: appliedServiceFees,
            service_fee_total: serviceFeeTotal,
            shipping,
            tax_rate,
            tax_amount: taxAmountCalc,
            discount: discountAmount,
            total: subtotal,
            grand_total: finalGrandTotal,
            paid_amount: paidAmountForDb,
            remaining_amount: remainingAmount,
            note,
            cashier_id: cashierId,
            shift_id: openShift._id,
          },
        ],
        { session },
      );
      sale = created[0];

      for (const p of processedProducts) {
        await ProductSalesModel.create(
          [
            {
              sale_id: sale._id,
              product_id: p.product_id,
              bundle_id: undefined,
              product_price_id: p.product_price_id,
              quantity: p.quantity,
              price: p.price,
              subtotal: p.subtotal,
              original_price: p.original_price,
              discount: p.discount,
              discount_type: p.discount_type,
              is_wholesale: p.is_wholesale,
              options_id: p.options_id,
              isGift: !!p.isGift,
              isBundle: false,
            },
          ],
          { session },
        );
      }

      for (const b of processedBundles) {
        await ProductSalesModel.create(
          [
            {
              sale_id: sale._id,
              product_id: undefined,
              bundle_id: b.bundle_id,
              product_price_id: undefined,
              quantity: b.quantity,
              price: b.price,
              subtotal: b.subtotal,
              original_price: b.original_price,
              discount: b.discount,
              discount_type: b.discount_type,
              options_id: [],
              isGift: !!b.isGift,
              isBundle: true,
            },
          ],
          { session },
        );
      }

      if (!isPending) {
        if (!isDue && paymentLines.length > 0) {
          await PaymentModel.create(
            [
              {
                sale_id: sale._id,
                financials: paymentLines.map((p) => ({
                  account_id: p.account_id,
                  amount: p.amount,
                })),
              },
            ],
            { session },
          );

          for (const line of paymentLines) {
            await BankAccountModel.findByIdAndUpdate(
              line.account_id,
              { $inc: { balance: line.amount } },
              { session },
            );
          }
        }

        // ✅ Atomic, race-safe stock decrement for products
        for (const p of processedProducts) {
          if (p.product_price_id) {
            const updated = await Product_WarehouseModel.findOneAndUpdate(
              {
                productId: p.product_id,
                productPriceId: p.product_price_id,
                warehouseId,
                quantity: { $gte: p.quantity },
              },
              { $inc: { quantity: -p.quantity } },
              { session, new: true },
            );
            if (!updated) {
              throw new BadRequest(
                `Not enough stock for variation of product ${p.product_id} (concurrent sale likely took the remaining stock)`,
              );
            }

            await ProductPriceModel.findByIdAndUpdate(
              p.product_price_id,
              { $inc: { quantity: -p.quantity } },
              { session },
            );

            await WarehouseModel.findByIdAndUpdate(
              warehouseId,
              { $inc: { stock_Quantity: -p.quantity } },
              { session },
            );
          } else if (p.product_id) {
            const updated = await Product_WarehouseModel.findOneAndUpdate(
              {
                productId: p.product_id,
                warehouseId,
                quantity: { $gte: p.quantity },
              },
              { $inc: { quantity: -p.quantity } },
              { session, new: true },
            );
            if (!updated) {
              throw new BadRequest(
                `Not enough stock for product ${p.product_id} (concurrent sale likely took the remaining stock)`,
              );
            }

            await WarehouseModel.findByIdAndUpdate(
              warehouseId,
              { $inc: { stock_Quantity: -p.quantity } },
              { session },
            );

            await ProductModel.findByIdAndUpdate(
              p.product_id,
              { $inc: { quantity: -p.quantity } },
              { session },
            );
          }
        }

        // ✅ Atomic, race-safe stock decrement for bundle contents
        for (const b of processedBundles) {
          for (const bp of b.products) {
            const deductQty = b.quantity * bp.quantity;

            if (bp.productPriceId) {
              const updated = await Product_WarehouseModel.findOneAndUpdate(
                {
                  productId: bp.productId,
                  productPriceId: bp.productPriceId,
                  warehouseId,
                  quantity: { $gte: deductQty },
                },
                { $inc: { quantity: -deductQty } },
                { session, new: true },
              );
              if (!updated) {
                throw new BadRequest(
                  `Not enough stock for a variation inside bundle ${b.bundle_id} (concurrent sale likely took the remaining stock)`,
                );
              }

              await ProductPriceModel.findByIdAndUpdate(
                bp.productPriceId,
                { $inc: { quantity: -deductQty } },
                { session },
              );

              await WarehouseModel.findByIdAndUpdate(
                warehouseId,
                { $inc: { stock_Quantity: -deductQty } },
                { session },
              );
            } else {
              const updated = await Product_WarehouseModel.findOneAndUpdate(
                {
                  productId: bp.productId,
                  warehouseId,
                  quantity: { $gte: deductQty },
                },
                { $inc: { quantity: -deductQty } },
                { session, new: true },
              );
              if (!updated) {
                throw new BadRequest(
                  `Not enough stock for a product inside bundle ${b.bundle_id} (concurrent sale likely took the remaining stock)`,
                );
              }

              await WarehouseModel.findByIdAndUpdate(
                warehouseId,
                { $inc: { stock_Quantity: -deductQty } },
                { session },
              );

              await ProductModel.findByIdAndUpdate(
                bp.productId,
                { $inc: { quantity: -deductQty } },
                { session },
              );
            }
          }
        }

        // ✅ Atomic coupon decrement, also guarded against a race
        // draining `available` below zero between two concurrent sales.
        if (!isDue && coupon) {
          const couponUpdated = await CouponModel.findOneAndUpdate(
            { _id: coupon._id, available: { $gte: 1 } },
            { $inc: { available: -1 } },
            { session, new: true },
          );
          if (!couponUpdated) {
            throw new BadRequest(
              "Coupon just ran out of stock — please retry without it",
            );
          }
        }

        // ✅ FIX #3: deduct exactly the requested gift card amount, atomically
        if (!isDue && giftCard && requestedGiftCardAmount > 0) {
          const giftCardUpdated = await GiftCardModel.findOneAndUpdate(
            { _id: giftCard._id, amount: { $gte: requestedGiftCardAmount } },
            { $inc: { amount: -requestedGiftCardAmount } },
            { session, new: true },
          );
          if (!giftCardUpdated) {
            throw new BadRequest(
              "Gift card balance changed concurrently — please retry",
            );
          }
        }
      }
    });
  } finally {
    session.endSession();
  }
  
  const fullSale = await SaleModel.findById(sale._id)
    .populate("customer_id", "name email phone_number")
    .populate("Due_customer_id", "name email phone_number")
    .populate("warehouse_id", "name location")
    .populate("order_tax", "name amount type")
    .populate("order_discount", "name amount type")
    .populate("gift_card_id", "code amount")
    .populate("cashier_id", "name email")
    .populate("shift_id", "start_time status")
    .populate("account_id", "name type balance")
    .lean();

  const fullItems = await ProductSalesModel.find({ sale_id: sale._id })
    .populate(
      "product_id",
      "name ar_name image price whole_price start_quantaty",
    )
    .populate("product_price_id", "price code quantity")
    .populate("bundle_id", "name price")
    .populate("options_id", "name ar_name price")
    .lean();

  const formattedItems = fullItems.map((item: any) => {
    if (item.isGift) {
      const { price, subtotal, ...rest } = item;
      return rest;
    }
    return item;
  });

  const currentMachineId = openShift.cashier_id;
  const cashierMachine = await CashierModel.findById(currentMachineId);

  let printerSettings = null;
  if (cashierMachine) {
    printerSettings = {
      printer_type: cashierMachine.printer_type || "USB",
      printer_IP: cashierMachine.printer_IP || null,
      printer_port: cashierMachine.printer_port || null,
      Printer_name: cashierMachine.Printer_name || null,
    };
  }

  const storeInfo = await getStoreInfo(cashierId);

  return SuccessResponse(res, {
    message: isDue
      ? `Due sale created. Amount owed: ${remainingAmount}`
      : "Sale created successfully",
    store: storeInfo,
    printer_settings: printerSettings,
    sale: fullSale,
    items: formattedItems,
    service_fees: appliedServiceFees,
    wholesale_applied: processedProducts.some((p) => p.is_wholesale),
    pricing_details: {
      products_total: productsTotal,
      bundles_total: bundlesTotal,
      subtotal: subtotal,
      service_fee_total: serviceFeeTotal,
      tax_amount: taxAmountCalc,
      shipping: Number(shipping),
      grand_total: finalGrandTotal,
    },
  });
};

export const getAllSales = async (req: Request, res: Response) => {
  const sales = await SaleModel.find({ order_pending: 0 }) // ✅ المكتملة بس
    .select(
      "reference grand_total service_fee_total paid_amount remaining_amount Due order_pending date createdAt",
    )
    .populate("customer_id", "name")
    .populate("Due_customer_id", "name")
    .populate("warehouse_id", "name")
    .populate("cashier_id", "name")
    .sort({ createdAt: -1 })
    .lean();

  SuccessResponse(res, { sales });
};

export const getSales = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid sale id");
  }

  const sale = await SaleModel.findById(id)
    .populate("customer_id", "name email phone_number")
    .populate("Due_customer_id", "name email phone_number")
    .populate("warehouse_id", "name location")
    .populate("order_tax", "name amount type")
    .populate("order_discount", "name amount type")
    .populate("gift_card_id", "code amount")
    .populate("cashier_id", "name email")
    .populate("shift_id", "start_time status")
    .populate("account_id", "name type balance")
    .lean();

  if (!sale) {
    throw new NotFound("Sale not found");
  }

  const items = await ProductSalesModel.find({ sale_id: sale._id })
    .populate("product_id", "name ar_name image price")
    .populate("product_price_id", "price code quantity")
    .populate("bundle_id", "name price")
    .populate("options_id", "name ar_name price")
    .lean();

  // ✅ إخفاء السعر للهدايا فقط
  const processedItems = items.map((item: any) => {
    if (item.isGift) {
      if (item.product_id && !item.isBundle) {
        return {
          ...item,
          price: null,
          subtotal: null,
          discount: null,
          original_price: null,
          product_id: { ...item.product_id, price: null },
          product_price_id: item.product_price_id
            ? { ...item.product_price_id, price: null }
            : null,
          options_id:
            item.options_id?.map((opt: any) => ({ ...opt, price: null })) || [],
        };
      }

      if (item.bundle_id && item.isBundle) {
        return {
          ...item,
          price: null,
          subtotal: null,
          discount: null,
          original_price: null,
          bundle_id: { ...item.bundle_id, price: null },
        };
      }
    }
    return item;
  });

  SuccessResponse(res, { sale, items: processedItems });
};

export const getsalePending = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const cashierId = jwtUser?.id;
  const warehouseId = jwtUser?.warehouse_id;

  if (!cashierId) {
    throw new BadRequest("Unauthorized: user not found in token");
  }

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  // ✅ هات الشيفت المفتوح الحالي
  const openShift = await CashierShift.findOne({
    cashierman_id: cashierId,
    status: "open",
  }).sort({ start_time: -1 });

  if (!openShift) {
    return SuccessResponse(res, { sales: [] });
  }

  // ✅ هات الـ pending sales بتاعة الشيفت ده بس
  const sales = await SaleModel.find({
    order_pending: 1,
    shift_id: openShift._id,
    cashier_id: cashierId,
    warehouse_id: warehouseId,
  })
    .populate("customer_id", "name email phone_number")
    .populate("warehouse_id", "name location")
    .populate("order_tax", "name rate")
    .populate("order_discount", "name rate")
    .populate("gift_card_id", "code amount")
    .sort({ createdAt: -1 })
    .lean();

  if (!sales.length) {
    return SuccessResponse(res, { sales: [] });
  }

  const saleIds = sales.map((s) => s._id);

  const items = await ProductSalesModel.find({
    sale_id: { $in: saleIds },
  })
    .populate("product_id", "name ar_name image price")
    .populate("product_price_id", "price code")
    .populate("bundle_id", "name price")
    .lean();

  const itemsBySaleId: Record<string, any[]> = {};
  for (const item of items) {
    const key = item.sale_id.toString();
    if (!itemsBySaleId[key]) itemsBySaleId[key] = [];
    itemsBySaleId[key].push(item);
  }

  const salesWithItems = sales.map((s) => ({
    ...s,
    items: itemsBySaleId[s._id.toString()] || [],
  }));

  return SuccessResponse(res, { sales: salesWithItems });
};

export const getShiftCompletedSales = async (req: Request, res: Response) => {
  const { password } = req.body;
  const jwtUser = req.user as any;

  if (!jwtUser) throw new UnauthorizedError("Unauthorized");

  const userId = jwtUser.id;

  // 1) هات اليوزر (مع الباسورد عشان نقدر نشيك الحقيقي)
  const user = await UserModel.findById(userId).select("+password_hash +role");
  if (!user) throw new NotFound("User not found");

  const fakePassword = process.env.SHIFT_REPORT_PASSWORD;

  let mode: "real" | "fake" | null = null;

  // 👇 الأول: جرّب الباسورد الحقيقي
  if (password && (await bcrypt.compare(password, user.password_hash))) {
    mode = "real";
  } else if (fakePassword && password === fakePassword) {
    // تاني: جرّب الباسورد الفيك من الـ env
    mode = "fake";
  }

  if (!mode) {
    throw new BadRequest("Wrong password");
  }

  // 2) آخر شيفت مفتوح لليوزر ده
  const shift = await CashierShift.findOne({
    cashierman_id: user._id,
    status: "open",
  }).sort({ start_time: -1 });

  if (!shift) throw new NotFound("No open cashier shift found");

  // 3) كل المبيعات الـ completed في الشيفت ده
  const sales = await SaleModel.find({
    order_pending: 0,
    shift_id: shift._id,
    cashier_id: user._id,
  })
    .populate("customer_id", "name email phone_number")
    .populate("warehouse_id", "name location")
    .populate("order_tax", "name rate")
    .populate("order_discount", "name rate")
    .populate("gift_card_id", "code amount")
    .lean();

  if (!sales.length) {
    return SuccessResponse(res, {
      message: "No completed sales in this shift",
      mode,
      shift,
      sales: [],
    });
  }

  const saleIds = sales.map((s) => s._id);

  const items = await ProductSalesModel.find({
    sale_id: { $in: saleIds },
  })
    .populate("product_id", "name ar_name image price")
    .populate("product_price_id", "price code")
    .populate("bundle_id", "name price")
    .lean();

  const itemsBySaleId: Record<string, any[]> = {};
  for (const item of items) {
    const key = item.sale_id.toString();
    if (!itemsBySaleId[key]) itemsBySaleId[key] = [];
    itemsBySaleId[key].push(item);
  }

  const salesWithItems = sales.map((s) => ({
    ...s,
    items: itemsBySaleId[s._id.toString()] || [],
  }));

  // 4) لو mode = fake → رجّع 20% بس من الأوردرات
  if (mode === "fake") {
    const percentage = 0.2;
    const totalCount = salesWithItems.length;
    const sampleCount = Math.max(1, Math.floor(totalCount * percentage));

    const shuffled = [...salesWithItems].sort(() => 0.5 - Math.random());
    const sampledSales = shuffled.slice(0, sampleCount);

    return SuccessResponse(res, {
      message: "Completed sales sample for current shift",
      shift,
      total_sales_in_shift: totalCount,
      sampled_percentage: 20,
      sales: sampledSales,
    });
  }

  // 5) لو mode = real → رجّع كل الأوردرات
  return SuccessResponse(res, {
    message: "Completed sales for current shift",
    shift,
    sales: salesWithItems,
  });
};

export const getSalePendingById = async (req: Request, res: Response) => {
  const { sale_id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(sale_id)) {
    throw new BadRequest("Invalid sale id");
  }

  const sale = await SaleModel.findOne({
    _id: sale_id,
    order_pending: { $in: [1, "1", true] },
  })
    .populate("customer_id", "name email phone_number address")
    .populate("warehouse_id", "name ar_name")
    .populate("cashier_id", "name email")
    .populate("gift_card_id", "code balance")
    .populate("order_tax", "name rate")
    .populate("order_discount", "name discount_type discount_value")
    .lean();

  if (!sale) {
    throw new NotFound("Pending sale not found");
  }

  const items = await ProductSalesModel.find({ sale_id: sale._id })
    .populate({
      path: "product_id",
      select: "name ar_name image price code quantity categoryId brandId",
      populate: [
        { path: "categoryId", select: "name ar_name" },
        { path: "brandId", select: "name ar_name" },
      ],
    })
    .populate({
      path: "product_price_id",
      select: "price code quantity options",
      populate: {
        path: "productId",
        select: "name ar_name image",
      },
    })
    .populate({
      path: "bundle_id",
      select: "name ar_name price productsId",
      populate: {
        path: "productsId",
        select: "name ar_name price",
      },
    })
    .populate({
      path: "options_id",
      select: "name ar_name price variationId",
      populate: {
        path: "variationId",
        select: "name ar_name",
      },
    })
    .lean();

  const products: any[] = [];
  const bundles: any[] = [];

  for (const item of items) {
    if (item.isBundle) {
      bundles.push({
        _id: item._id,
        bundle: item.bundle_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        isGift: !!item.isGift,
      });
    } else {
      products.push({
        _id: item._id,
        product: item.product_id,
        product_price: item.product_price_id,
        options: item.options_id || [],
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        isGift: !!item.isGift,
      });
    }
  }

  const payloadForCreateSale = {
    customer_id: (sale.customer_id as any)?._id || null,
    order_pending: 0,
    coupon_id: sale.coupon_id || null,
    applied_coupon: sale.applied_coupon || false,
    gift_card_id: (sale.gift_card_id as any)?._id || null,
    tax_id: (sale.order_tax as any)?._id || null,
    discount_id: (sale.order_discount as any)?._id || null,
    shipping: sale.shipping || 0,
    tax_rate: sale.tax_rate || 0,
    tax_amount: sale.tax_amount || 0,
    service_fee_total: sale.service_fee_total || 0,
    service_fees: sale.service_fees || [],
    discount: sale.discount || 0,
    total: sale.total || sale.grand_total,
    grand_total: sale.grand_total,
    note: sale.note || "",
    products: products.map((p) => ({
      product_id: p.product?._id,
      product_price_id: p.product_price?._id,
      quantity: p.quantity,
      price: p.price,
      subtotal: p.subtotal,
      isGift: p.isGift,
      options_id: p.options?.map((opt: any) => opt._id) || [],
    })),
    bundles: bundles.map((b) => ({
      bundle_id: b.bundle?._id,
      quantity: b.quantity,
      price: b.price,
      subtotal: b.subtotal,
      isGift: b.isGift,
    })),
  };

  return SuccessResponse(res, {
    sale: {
      _id: sale._id,
      reference: sale.reference,
      date: sale.date,
      subtotal: sale.total,
      tax_amount: sale.tax_amount,
      tax_rate: sale.tax_rate,
      discount: sale.discount,
      shipping: sale.shipping,
      grand_total: sale.grand_total,
      note: sale.note,
      order_pending: sale.order_pending,
      customer: sale.customer_id || null,
      warehouse: sale.warehouse_id || null,
      cashier: sale.cashier_id || null,
      coupon_code: sale.coupon_id || "",
      applied_coupon: sale.applied_coupon || false,
      gift_card: sale.gift_card_id || null,
      tax: sale.order_tax || null,
      discount_info: sale.order_discount || null,
      service_fees: sale.service_fees || [],
      service_fee_total: sale.service_fee_total || 0,
      created_at: sale.createdAt,
    },
    products,
    bundles,
    summary: {
      total_products: products.length,
      total_bundles: bundles.length,
      total_items: products.length + bundles.length,
      total_quantity: [...products, ...bundles].reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
    },
    payloadForCreateSale,
  });
};

export const getDueSales = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;

  const dueSales = await SaleModel.find({
    Due: 1,
    remaining_amount: { $gt: 0 },
    warehouse_id: warehouseId,
  })
    .populate("Due_customer_id", "name email phone_number")
    .populate("customer_id", "name email phone_number")
    .sort({ createdAt: -1 })
    .lean();

  const totalDue = dueSales.reduce(
    (sum, sale) => sum + (sale.remaining_amount || 0),
    0,
  );

  return SuccessResponse(res, {
    message: "Due sales fetched successfully",
    count: dueSales.length,
    total_due: totalDue,
    sales: dueSales,
  });
};
// ═══════════════════════════════════════════════════════════
// PAY DUE
// ═══════════════════════════════════════════════════════════
export const payDue = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const cashierId = jwtUser?.id;
  const warehouseId = jwtUser?.warehouse_id;

  if (!cashierId) {
    throw new BadRequest("Unauthorized: user not found in token");
  }

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const { customer_id, amount, financials } = req.body;

  if (!customer_id || !mongoose.Types.ObjectId.isValid(customer_id)) {
    throw new BadRequest("Valid customer_id is required");
  }

  if (!amount || Number(amount) <= 0) {
    throw new BadRequest("Amount must be greater than 0");
  }

  const paymentAmount = Number(amount);

  const customer = await CustomerModel.findById(customer_id);
  if (!customer) {
    throw new NotFound("Customer not found");
  }

  const dueSales = await SaleModel.find({
    Due_customer_id: customer_id,
    Due: 1,
    remaining_amount: { $gt: 0 },
    warehouse_id: warehouseId,
  }).sort({ createdAt: 1 });

  if (dueSales.length === 0) {
    throw new BadRequest("This customer has no pending dues");
  }

  const totalDue = dueSales.reduce(
    (sum, sale) => sum + (sale.remaining_amount || 0),
    0,
  );

  if (paymentAmount > totalDue) {
    throw new BadRequest(
      `Payment amount (${paymentAmount}) exceeds total due (${totalDue})`,
    );
  }

  if (!financials || !Array.isArray(financials) || financials.length === 0) {
    throw new BadRequest("Financials are required");
  }

  type FinancialLine = { account_id: string; amount: number };
  const paymentLines: FinancialLine[] = financials.map((f: any) => {
    const accId = f.account_id || f.id;
    const amt = Number(f.amount);

    if (!accId || !mongoose.Types.ObjectId.isValid(accId)) {
      throw new BadRequest("Invalid account_id in financials");
    }
    if (!amt || amt <= 0) {
      throw new BadRequest("Each payment line must have amount > 0");
    }

    return { account_id: accId, amount: amt };
  });

  const totalFinancials = paymentLines.reduce((sum, p) => sum + p.amount, 0);

  if (Number(totalFinancials.toFixed(2)) !== Number(paymentAmount.toFixed(2))) {
    throw new BadRequest(
      `Sum of financials (${totalFinancials}) must equal amount (${paymentAmount})`,
    );
  }

  for (const line of paymentLines) {
    const bankAccount = await BankAccountModel.findOne({
      _id: line.account_id,
      warehouseId: warehouseId,
      status: true,
      in_POS: true,
    });

    if (!bankAccount) {
      throw new BadRequest(`Account ${line.account_id} is not valid for POS`);
    }
  }

  let remainingPayment = paymentAmount;
  const paidSales: Array<{
    sale_id: string;
    reference: string;
    paid_amount: number;
    was_remaining: number;
    now_remaining: number;
    is_fully_paid: boolean;
  }> = [];

  for (const sale of dueSales) {
    if (remainingPayment <= 0) break;

    const saleRemaining = sale.remaining_amount || 0;
    const payForThisSale = Math.min(remainingPayment, saleRemaining);

    const newPaidAmount = (sale.paid_amount || 0) + payForThisSale;
    const newRemainingAmount = saleRemaining - payForThisSale;
    const isFullyPaid = newRemainingAmount <= 0;

    const newAccountIds = [
      ...new Set([
        ...(sale.account_id || []).map(String),
        ...paymentLines.map((p) => p.account_id),
      ]),
    ];

    await SaleModel.findByIdAndUpdate(sale._id, {
      paid_amount: newPaidAmount,
      remaining_amount: Math.max(0, newRemainingAmount),
      Due: isFullyPaid ? 0 : 1,
      Due_customer_id: isFullyPaid ? null : sale.Due_customer_id,
      account_id: newAccountIds,
    });

    await PaymentModel.create({
      sale_id: sale._id,
      customer_id: customer_id,
      financials: paymentLines.map((p) => ({
        account_id: p.account_id,
        amount: (p.amount / paymentAmount) * payForThisSale,
      })),
      amount: payForThisSale,
    });

    paidSales.push({
      sale_id: sale._id.toString(),
      reference: sale.reference || "",
      paid_amount: payForThisSale,
      was_remaining: saleRemaining,
      now_remaining: Math.max(0, newRemainingAmount),
      is_fully_paid: isFullyPaid,
    });

    remainingPayment -= payForThisSale;
  }

  for (const line of paymentLines) {
    await BankAccountModel.findByIdAndUpdate(line.account_id, {
      $inc: { balance: line.amount },
    });
  }

  const remainingDues = await SaleModel.find({
    Due_customer_id: customer_id,
    Due: 1,
    remaining_amount: { $gt: 0 },
  });

  const newTotalDue = remainingDues.reduce(
    (sum, sale) => sum + (sale.remaining_amount || 0),
    0,
  );

  return SuccessResponse(res, {
    message:
      newTotalDue === 0
        ? "All dues fully paid!"
        : `Payment successful. Remaining: ${newTotalDue}`,
    customer: {
      id: customer._id,
      name: customer.name,
    },
    payment_summary: {
      amount_paid: paymentAmount,
      previous_total_due: totalDue,
      current_total_due: newTotalDue,
      sales_affected: paidSales.length,
    },
    paid_sales: paidSales,
  });
};

export const applyCoupon = async (req: Request, res: Response) => {
  const { coupon_code, grand_total } = req.body;
  if (!coupon_code) throw new BadRequest("Please provide all required fields");
  const coupon = await CouponModel.findOne({ coupon_code });
  if (!coupon) throw new NotFound("Coupon not found");
  if (coupon.available <= 0) throw new BadRequest("Coupon is not available");
  if (coupon.expired_date < new Date())
    throw new BadRequest("Coupon is expired");
  if (
    coupon.minimum_amount_for_use > 0 &&
    coupon.minimum_amount_for_use > grand_total
  )
    throw new BadRequest("Coupon is not applicable for this sale");
  return SuccessResponse(res, {
    message: "Coupon applied successfully",
    coupon,
  });
};
