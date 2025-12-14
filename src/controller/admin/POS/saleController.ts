import { SaleModel, ProductSalesModel } from '../../../models/schema/admin/POS/Sale';
import { Request, Response } from 'express';
import { WarehouseModel } from "../../../models/schema/admin/Warehouse";
import { NotFound, UnauthorizedError } from '../../../Errors';
import { CustomerModel } from '../../../models/schema/admin/POS/customer';
import { SuccessResponse } from '../../../utils/response';
import { CouponModel } from '../../../models/schema/admin/coupons';
import { TaxesModel } from '../../../models/schema/admin/Taxes';
import { DiscountModel } from '../../../models/schema/admin/Discount';
import { ProductPriceModel } from '../../../models/schema/admin/product_price';
import { PaymentModel } from '../../../models/schema/admin/POS/payment';
import { BadRequest } from '../../../Errors/BadRequest';
import { GiftCardModel } from '../../../models/schema/admin/POS/giftCard';
import { BankAccountModel } from '../../../models/schema/admin/Financial_Account';
import { PandelModel } from '../../../models/schema/admin/pandels';
import { CashierShift } from '../../../models/schema/admin/POS/CashierShift';
import mongoose from 'mongoose';
import { ProductModel } from '../../../models/schema/admin/products';
import { UserModel } from '../../../models/schema/admin/User';
import bcrypt from "bcryptjs";


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

  // 1) تأكد إن فيه شيفت مفتوح للكاشير ده
  const openShift = await CashierShift.findOne({
    cashierman_id: cashierId,
    status: "open",
  }).sort({ start_time: -1 });

  if (!openShift) {
    throw new BadRequest("You must open a cashier shift before creating a sale");
  }

  // 2) استقبل الداتا من الـ body
  const {
    customer_id,

    // 0 = completed, 1 = pending
    order_pending = 1,   // 👈 نخلي الديفولت Pending أحسن
    coupon_id,
    gift_card_id,
    tax_id,
    discount_id,
    products,
    bundles,
    shipping = 0,
    tax_rate = 0,
    tax_amount = 0,
    discount = 0,
    grand_total,
    note,
    financials, // [{ account_id / id, amount }]
  } = req.body;

  // تحقق من قيمة order_pending
  const pendingFlag = Number(order_pending);
  if (![0, 1].includes(pendingFlag)) {
    throw new BadRequest("order_pending must be 0 (completed) or 1 (pending)");
  }
  const isPending = pendingFlag === 1;
  const normalizedOrderPending = isPending ? 1 : 0;

  // 3) تحقق من الـ warehouse
  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse) {
    throw new NotFound("Warehouse not found");
  }

  // 4) لازم منتج أو باكدج واحد على الأقل
  if ((!products || products.length === 0) && (!bundles || bundles.length === 0)) {
    throw new BadRequest("At least one product or bundle is required");
  }

  if (!grand_total || grand_total <= 0) {
    throw new BadRequest("Grand total must be greater than 0");
  }

  // 5) customer اختياري
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

  // 6) تجهيز / تحقق الـ financials – بس لو الفاتورة Completed
  type FinancialLine = { account_id: string; amount: number };
  let paymentLines: FinancialLine[] = [];
  let totalPaidFromLines = 0;

  if (!isPending) {
    const finArr = financials as any[];

    // ✅ لو الأوردر Completed ومفيش financials → Error صريح
    if (!finArr || !Array.isArray(finArr) || finArr.length === 0) {
      throw new BadRequest(
        "Financials are required for completed sale (order_pending = 0)"
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

      return {
        account_id: accId,
        amount: amt,
      };
    });

    totalPaidFromLines = paymentLines.reduce((sum, p) => sum + p.amount, 0);

    if (
      Number(totalPaidFromLines.toFixed(2)) !==
      Number(Number(grand_total).toFixed(2))
    ) {
      throw new BadRequest("Sum of payments (financials) must equal grand_total");
    }

    // تأكد أن كل الحسابات في نفس الـ warehouse ومسموح بيها في الـ POS
    for (const line of paymentLines) {
      const bankAccount = await BankAccountModel.findOne({
        _id: line.account_id,
        warehouseId: warehouseId,   // لو عندك الحقل اسمه warehouse_id عدله هنا
        status: true,
        in_POS: true,
      });

      if (!bankAccount) {
        throw new BadRequest(
          "One of the financial accounts is not valid or not allowed in POS"
        );
      }
    }
  }

  // 7) كوبون (لو موجود)
  let coupon: any = null;
  if (coupon_id) {
    if (!mongoose.Types.ObjectId.isValid(coupon_id)) {
      throw new BadRequest("Invalid coupon id");
    }

    coupon = await CouponModel.findById(coupon_id);
    if (!coupon) throw new NotFound("Coupon not found");
    if (!coupon.status) throw new BadRequest("Coupon is not active");
    if (coupon.available <= 0) throw new BadRequest("Coupon is out of stock");

    if (coupon.expired_date && coupon.expired_date < new Date()) {
      throw new BadRequest("Coupon is expired");
    }
  }

  // 8) ضريبة (لو موجودة)
  let tax: any = null;
  if (tax_id) {
    if (!mongoose.Types.ObjectId.isValid(tax_id)) {
      throw new BadRequest("Invalid tax id");
    }

    tax = await TaxesModel.findById(tax_id);
    if (!tax) throw new NotFound("Tax not found");
    if (!tax.status) throw new BadRequest("Tax is not active");
  }

  // 9) خصم (لو موجود)
  let discountDoc: any = null;
  if (discount_id) {
    if (!mongoose.Types.ObjectId.isValid(discount_id)) {
      throw new BadRequest("Invalid discount id");
    }

    discountDoc = await DiscountModel.findById(discount_id);
    if (!discountDoc) throw new NotFound("Discount not found");
    if (!discountDoc.status) throw new BadRequest("Discount is not active");
  }

  // 10) جيفت كارد (لو موجود)
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

    if (!isPending && totalPaidFromLines > 0 && giftCard.amount < totalPaidFromLines) {
      throw new BadRequest("Gift card does not have enough balance");
    }
  }

  // 11) ستوك المنتجات (بـ variation أو من غير)
  if (products && products.length > 0) {
    for (const p of products as any[]) {
      const { product_price_id, product_id, quantity } = p;

      if (product_price_id) {
        if (!mongoose.Types.ObjectId.isValid(product_price_id)) {
          throw new BadRequest("Invalid product_price_id");
        }

        const priceDoc = await ProductPriceModel.findById(product_price_id);
        if (!priceDoc) {
          throw new NotFound("Product price (variation) not found");
        }

        if (priceDoc.quantity < quantity) {
          throw new BadRequest(
            `Not enough stock for product variation ${priceDoc._id}, available: ${priceDoc.quantity}, required: ${quantity}`
          );
        }
      } else {
        if (!product_id || !mongoose.Types.ObjectId.isValid(product_id)) {
          throw new BadRequest("Invalid product_id for non-variation product");
        }

        const productDoc = await ProductModel.findById(product_id);
        if (!productDoc) {
          throw new NotFound("Product not found");
        }

        if (productDoc.quantity < quantity) {
          throw new BadRequest(
            `Not enough stock for product ${productDoc._id}, available: ${productDoc.quantity}, required: ${quantity}`
          );
        }
      }
    }
  }

  // 12) ستوك الباندلز
  if (bundles && bundles.length > 0) {
    for (const b of bundles as any[]) {
      const { bundle_id, quantity } = b;

      if (!mongoose.Types.ObjectId.isValid(bundle_id)) {
        throw new BadRequest("Invalid bundle id");
      }

      const bundleDoc: any = await PandelModel.findById(bundle_id).populate(
        "productsId"
      );
      if (!bundleDoc) {
        throw new NotFound("Bundle not found");
      }

      const bundleProducts = (bundleDoc.productsId || []) as any[];

      for (const pPrice of bundleProducts) {
        const requiredQty = quantity;

        if (pPrice.quantity < requiredQty) {
          throw new BadRequest(
            `Not enough stock for product in bundle ${bundleDoc.name}, product ${pPrice._id}, required: ${requiredQty}, available: ${pPrice.quantity}`
          );
        }
      }
    }
  }

  const accountIdsForSale = !isPending
    ? Array.from(new Set(paymentLines.map((p) => p.account_id)))
    : [];

  // 14) إنشاء الفاتورة
  const sale = await SaleModel.create({
    date: new Date(),

    customer_id: customer ? customer._id : undefined,
    warehouse_id: warehouseId,

    account_id: accountIdsForSale,
    order_pending: normalizedOrderPending,

    coupon_id: coupon ? coupon._id : undefined,
    gift_card_id: giftCard ? giftCard._id : undefined,

    order_tax: tax ? tax._id : undefined,
    order_discount: discountDoc ? discountDoc._id : undefined,

    shipping,
    tax_rate,
    tax_amount,
    discount,

    total: grand_total,                // 👈 كل الأرقام على grand_total
    grand_total,
    paid_amount: !isPending ? grand_total : 0,

    note,
    cashier_id: cashierId,
    shift_id: openShift._id,
  });

  // 15) ProductSales للمنتجات
  const productSalesDocs: any[] = [];

  if (products && products.length > 0) {
    for (const p of products as any[]) {
      const {
        product_price_id,
        product_id,
        quantity,
        price,
        subtotal,
        options_id,
        isGift,
      } = p;

      const ps = await ProductSalesModel.create({
        sale_id: sale._id,
        product_id,
        bundle_id: undefined,
        product_price_id,
        quantity,
        price,
        subtotal,
        options_id,
        isGift: !!isGift,
        isBundle: false,
      });

      productSalesDocs.push(ps);
    }
  }

  // 16) ProductSales للباندلز
  if (bundles && bundles.length > 0) {
    for (const b of bundles as any[]) {
      const { bundle_id, quantity, price, subtotal, isGift } = b;

      const ps = await ProductSalesModel.create({
        sale_id: sale._id,
        product_id: undefined,
        bundle_id,
        product_price_id: undefined,
        quantity,
        price,
        subtotal,
        options_id: [],
        isGift: !!isGift,
        isBundle: true,
      });

      productSalesDocs.push(ps);
    }
  }

  // 17) لو Completed: Payments + تحديث الحسابات + ستوك + كوبون + جيفت كارد
  if (!isPending) {
    await PaymentModel.create({
      sale_id: sale._id,
      financials: paymentLines.map((p) => ({
        account_id: p.account_id,
        amount: p.amount,
      })),
      status: "completed",
    });

    for (const line of paymentLines) {
      await BankAccountModel.findByIdAndUpdate(line.account_id, {
        $inc: { balance: line.amount },
      });
    }

    if (products && products.length > 0) {
      for (const p of products as any[]) {
        const { product_price_id, product_id, quantity } = p;

        if (product_price_id) {
          await ProductPriceModel.findByIdAndUpdate(product_price_id, {
            $inc: { quantity: -quantity },
          });
        } else {
          await ProductModel.findByIdAndUpdate(product_id, {
            $inc: { quantity: -quantity },
          });
        }
      }
    }

    if (bundles && bundles.length > 0) {
      for (const b of bundles as any[]) {
        const { bundle_id, quantity } = b;

        const bundleDoc: any = await PandelModel.findById(bundle_id).populate(
          "productsId"
        );
        if (!bundleDoc) continue;

        const bundleProducts = (bundleDoc.productsId || []) as any[];

        for (const pPrice of bundleProducts) {
          const requiredQty = quantity;

          await ProductPriceModel.findByIdAndUpdate(pPrice._id, {
            $inc: { quantity: -requiredQty },
          });
        }
      }
    }

    if (coupon) {
      await CouponModel.findByIdAndUpdate(coupon._id, {
        $inc: { available: -1 },
      });
    }

    if (giftCard && totalPaidFromLines > 0) {
      await GiftCardModel.findByIdAndUpdate(giftCard._id, {
        $inc: { amount: -totalPaidFromLines },
      });
    }
  }

  return SuccessResponse(res, {
    message: "Sale created successfully",
    sale,
    items: productSalesDocs,
  });
};


export const getSales = async (req: Request, res: Response)=> {
    const sales = await SaleModel.find()
        .populate('customer_id', 'name email phone_number')
        .populate('warehouse_id', 'name location')
        .populate('order_tax', 'name rate')
        .populate('order_discount', 'name rate')
        .populate('coupon_id', 'code discount_amount')
        .populate('gift_card_id', 'code amount')
        //.populate('payment_method', 'name')
        .lean();
    SuccessResponse(res, { sales });
}

export const getAllSales = async (req: Request, res: Response) => {
    const sales = await SaleModel.find()
    .select('grand_total')
    .populate('customer_id', 'name')
    SuccessResponse(res, { sales });
}


export const getsalePending = async (req: Request, res: Response) => {
   // 1) هات كل الـ sales الـ pending
  const sales = await SaleModel.find({ order_pending: 1 }) // 1 = pending
    .populate("customer_id", "name email phone_number")
    .populate("warehouse_id", "name location")
    .populate("order_tax", "name rate")
    .populate("order_discount", "name rate")
    .populate("coupon_id", "code discount_amount")
    .populate("gift_card_id", "code amount")
    .lean();

  if (!sales.length) {
    return SuccessResponse(res, { sales: [] });
  }

  // 2) كل الـ IDs بتاعة الـ sales
  const saleIds = sales.map((s) => s._id);

  // 3) هات كل الـ items (ProductSales) اللي تابعة للـ sales دي
  const items = await ProductSalesModel.find({
    sale_id: { $in: saleIds },
  })
    .populate("product_id", "name ar_name image price")         // تفاصيل المنتج
    .populate("product_price_id", "price code")                 // تفاصيل الـ variation (لو موجود)
    .populate("bundle_id", "name price")                        // لو هو bundle
    .lean();

  // 4) جمّع الـ items حسب sale_id
  const itemsBySaleId: Record<string, any[]> = {};
  for (const item of items) {
    const key = item.sale_id.toString();
    if (!itemsBySaleId[key]) itemsBySaleId[key] = [];
    itemsBySaleId[key].push(item);
  }

  // 5) رجّع الـ sales ومعاها items
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

  // 1) هات اليوزر وتأكد من الباسورد
  const user = await UserModel.findById(userId).select(
    "+password_hash +role"
  );
  if (!user) throw new NotFound("User not found");

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new BadRequest("Wrong password");

  // 2) آخر شيفت مفتوح لليوزر ده
  const shift = await CashierShift.findOne({
    cashierman_id: user._id,
    status: "open",
  }).sort({ start_time: -1 });

  if (!shift) throw new NotFound("No open cashier shift found");

  // 3) هات كل المبيعات الـ completed في الشيفت ده
  const sales = await SaleModel.find({
    order_pending: 0,
    shift_id: shift._id,
    cashier_id: user._id,
  })
    .populate("customer_id", "name email phone_number")
    .populate("warehouse_id", "name location")
    .populate("order_tax", "name rate")
    .populate("order_discount", "name rate")
    .populate("coupon_id", "code discount_amount")
    .populate("gift_card_id", "code amount")
    .lean();

  if (!sales.length) {
    return SuccessResponse(res, {
      message: "No completed sales in this shift",
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

  return SuccessResponse(res, {
    message: "Completed sales for current shift",
    shift,
    sales: salesWithItems,
  });
};

export const getShiftCompletedSalesFa = async (req: Request, res: Response) => {
  const { password } = req.body; // باسورد فيك
  const jwtUser = req.user as any;

  if (!jwtUser) throw new UnauthorizedError("Unauthorized");

  const fakePassword = process.env.SHIFT_REPORT_PASSWORD;
  if (!fakePassword) {
    throw new BadRequest(" password is not configured");
  }

  if (password !== fakePassword) {
    throw new BadRequest("Wrong password");
  }

  const userId = jwtUser.id;

  // 1) هات اليوزر (مش بنشيك الباسورد الحقيقي هنا)
  const user = await UserModel.findById(userId).select("_id");
  if (!user) throw new NotFound("User not found");

  // 2) آخر شيفت مفتوح لليوزر ده
  const shift = await CashierShift.findOne({
    cashierman_id: user._id,
    status: "open",
  }).sort({ start_time: -1 });

  if (!shift) throw new NotFound("No open cashier shift found");

  // 3) هات كل المبيعات الـ completed في الشيفت ده
  const sales = await SaleModel.find({
    order_pending: 0,
    shift_id: shift._id,
    cashier_id: user._id,
  })
    .populate("customer_id", "name email phone_number")
    .populate("warehouse_id", "name location")
    .populate("order_tax", "name rate")
    .populate("order_discount", "name rate")
    .populate("coupon_id", "code discount_amount")
    .populate("gift_card_id", "code amount")
    .lean();

  if (!sales.length) {
    return SuccessResponse(res, {
      message: "No completed sales in this shift",
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

  // 4) اختار 20% بس من الأوردرات (عشوائيًا)
  const percentage = 0.2;
  const totalCount = salesWithItems.length;
  const sampleCount = Math.max(1, Math.floor(totalCount * percentage));

  // Shuffle بسيط
  const shuffled = [...salesWithItems].sort(() => 0.5 - Math.random());
  const sampledSales = shuffled.slice(0, sampleCount);

  return SuccessResponse(res, {
    message: "Completed sales for current shift",
    shift,
    total_sales_in_shift: totalCount,
    sampled_percentage: 20,
    sales: sampledSales,
  });
};



export const getSalePendingById = async (req: Request, res: Response) => {
  const { sale_id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(sale_id)) {
    throw new BadRequest("Invalid sale id");
  }

  const sale: any = await SaleModel.findOne({
    _id: sale_id,
    order_pending: 1, // 1 = pending
  }).lean();

  if (!sale) {
    throw new NotFound("Pending sale not found");
  }

  const items = await ProductSalesModel.find({ sale_id: sale._id }).lean();

  const products: any[] = [];
  const bundles: any[] = [];

  for (const item of items) {
    if (item.isBundle) {
      bundles.push({
        bundle_id: item.bundle_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        isGift: !!item.isGift,
      });
    } else {
      products.push({
        product_id: item.product_id,
        product_price_id: item.product_price_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        isGift: !!item.isGift,
        options_id: (item as any).options_id || [],
      });
    }
  }

  const payloadForCreateSale = {
    customer_id: sale.customer_id,
    order_pending: 1, // من الفرونت تقدر تغيّرها 1 أو 0
    coupon_id: sale.coupon_id,
    gift_card_id: sale.gift_card_id,
    tax_id: sale.order_tax,
    discount_id: sale.order_discount,

    shipping: sale.shipping || 0,
    tax_rate: sale.tax_rate || 0,
    tax_amount: sale.tax_amount || 0,
    discount: sale.discount || 0,
    total: sale.total || sale.grand_total,
    grand_total: sale.grand_total,
    note: sale.note || "",

    products,
    bundles,
  };

  return SuccessResponse(res, {
    sale,
    products,
    bundles,
    payloadForCreateSale,
  });
};
