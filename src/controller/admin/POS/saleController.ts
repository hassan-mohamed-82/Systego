import { SaleModel, ProductSalesModel } from '../../../models/schema/admin/POS/Sale';
import { Request, Response } from 'express';
import { WarehouseModel } from "../../../models/schema/admin/Warehouse";
import { NotFound } from '../../../Errors';
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

export const createSale = async (req: Request, res: Response) => {
  const jwtUser = req.user;
  const cashierId = jwtUser?.id;
  const jwtWarehouseId = (jwtUser as any)?.warehouse_id;

  if (!cashierId) {
    throw new BadRequest("Unauthorized: user not found in token");
  }

  const warehouseId = jwtWarehouseId;
  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  // 1) تأكد إن فيه شيفت مفتوح للكاشير ده
  const openShift = await CashierShift.findOne({
    cashier_id: cashierId,
    status: "open",
  }).sort({ start_time: -1 });

  if (!openShift) {
    throw new BadRequest("You must open a cashier shift before creating a sale");
  }

  // 2) استقبل الداتا من البودي (بدون warehouse_id)
  const {
    customer_id,              // اختياري
    order_pending = 1,        // 0 = pending, 1 = completed
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
    total,
    grand_total,
    paid_amount,
    note,
    financials,               // Array of { account_id / id, amount }
  } = req.body;

  // 3) تحقق من الـ warehouse اللي من التوكين
  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse) {
    throw new NotFound("Warehouse not found");
  }

  // 4) لازم يبقى فيه على الأقل منتج أو باكدج
  if ((!products || products.length === 0) && (!bundles || bundles.length === 0)) {
    throw new BadRequest("At least one product or bundle is required");
  }

  if (!grand_total || grand_total <= 0) {
    throw new BadRequest("Grand total must be greater than 0");
  }

  const isPending = Number(order_pending) === 0;

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

  // 6) تجهيز / تحقق الـ financials (Split Payments)
  type FinancialLine = { account_id: string; amount: number };
  let paymentLines: FinancialLine[] = [];

  if (!isPending) {
    if (!financials || !Array.isArray(financials) || financials.length === 0) {
      throw new BadRequest("At least one payment line (financial) is required for non-pending sale");
    }

    paymentLines = financials.map((f: any) => {
      const accId = f.account_id || f.id; // لو الفرونت بيبعت id بدل account_id
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

    const totalPaid = paymentLines.reduce((sum, p) => sum + p.amount, 0);

    if (Number(totalPaid.toFixed(2)) !== Number(Number(grand_total).toFixed(2))) {
      throw new BadRequest("Sum of payments (financials) must equal grand_total");
    }

    if (paid_amount != null && Number(paid_amount) !== totalPaid) {
      throw new BadRequest("paid_amount does not match sum of financials");
    }

    // تحقق من كل حساب بنكي في نفس الـ warehouse
    for (const line of paymentLines) {
      const bankAccount = await BankAccountModel.findOne({
        _id: line.account_id,
        warehouseId: warehouseId,     // 👈 من التوكين
        status: true,
        in_POS: true,
      });

      if (!bankAccount) {
        throw new BadRequest("One of the financial accounts is not valid or not allowed in POS");
      }
    }
  }

  // 7) كوبون
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

  // 8) ضريبة
  let tax: any = null;
  if (tax_id) {
    if (!mongoose.Types.ObjectId.isValid(tax_id)) {
      throw new BadRequest("Invalid tax id");
    }

    tax = await TaxesModel.findById(tax_id);
    if (!tax) throw new NotFound("Tax not found");
    if (!tax.status) throw new BadRequest("Tax is not active");
  }

  // 9) خصم
  let discountDoc: any = null;
  if (discount_id) {
    if (!mongoose.Types.ObjectId.isValid(discount_id)) {
      throw new BadRequest("Invalid discount id");
    }

    discountDoc = await DiscountModel.findById(discount_id);
    if (!discountDoc) throw new NotFound("Discount not found");
    if (!discountDoc.status) throw new BadRequest("Discount is not active");
  }

  // 10) جيفت كارد
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

    const totalPaid = paymentLines.reduce((s, p) => s + p.amount, 0);
    if (giftCard.amount < totalPaid) {
      throw new BadRequest("Gift card does not have enough balance");
    }
  }

  // 11) ستوك المنتجات
  if (products && products.length > 0) {
    for (const p of products) {
      const { product_price_id, quantity } = p;

      if (!mongoose.Types.ObjectId.isValid(product_price_id)) {
        throw new BadRequest("Invalid product_price_id");
      }

      const priceDoc = await ProductPriceModel.findById(product_price_id);
      if (!priceDoc) {
        throw new NotFound("Product price not found");
      }

      if (priceDoc.quantity < quantity) {
        throw new BadRequest(
          `Not enough stock for product ${priceDoc._id}, available: ${priceDoc.quantity}, required: ${quantity}`
        );
      }
    }
  }

  // 12) ستوك الباندلز
  if (bundles && bundles.length > 0) {
    for (const b of bundles) {
      const { bundle_id, quantity } = b;

      if (!mongoose.Types.ObjectId.isValid(bundle_id)) {
        throw new BadRequest("Invalid bundle id");
      }

      const bundleDoc: any = await PandelModel.findById(bundle_id).populate("productsId");
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

  // 13) reference
  const reference = `SALE-${Date.now()}`;

  const accountIdsForSale = !isPending
    ? Array.from(new Set(paymentLines.map((p) => p.account_id)))
    : [];

  const totalPaidFromLines = paymentLines.reduce((s, p) => s + p.amount, 0);

  // 14) إنشاء الفاتورة
  const sale = await SaleModel.create({
    reference,
    date: new Date(),
    customer_id: customer ? customer._id : undefined,
    warehouse_id: warehouseId,           // 👈 من التوكين
    account_id: accountIdsForSale,
    order_pending,
    coupon_id: coupon ? coupon._id : undefined,
    gift_card_id: giftCard ? giftCard._id : undefined,
    tax_id: tax ? tax._id : undefined,
    discount_id: discountDoc ? discountDoc._id : undefined,
    shipping,
    tax_rate,
    tax_amount,
    discount,
    total,
    grand_total,
    paid_amount: !isPending ? totalPaidFromLines : 0,
    note,
    cashier_id: cashierId,
    shift_id: openShift._id,
  });

  // 15) ProductSales للمنتجات
  const productSalesDocs: any[] = [];

  if (products && products.length > 0) {
    for (const p of products) {
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
        product_id: product_id,
        bundle_id: undefined,
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
    for (const b of bundles) {
      const { bundle_id, quantity, price, subtotal, isGift } = b;

      const ps = await ProductSalesModel.create({
        sale_id: sale._id,
        product_id: undefined,
        bundle_id,
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

  // 17) لو مش Pending: Payments + تحديث الحسابات + ستوك + كوبون + جيفت كارد
  if (!isPending) {
    // Payment واحد فيه financials[]
    await PaymentModel.create({
      sale_id: sale._id,
      financials: paymentLines.map((p) => ({
        account_id: p.account_id,
        amount: p.amount,
      })),
      status: "completed",
    });

    // زوّد رصيد كل حساب بالمبلغ الخاص بيه
    for (const line of paymentLines) {
      await BankAccountModel.findByIdAndUpdate(line.account_id, {
        $inc: { balance: line.amount },
      });
    }

    // ستوك المنتجات
    if (products && products.length > 0) {
      for (const p of products) {
        const { product_price_id, quantity } = p;

        await ProductPriceModel.findByIdAndUpdate(product_price_id, {
          $inc: { quantity: -quantity },
        });
      }
    }

    // ستوك منتجات الباندلز
    if (bundles && bundles.length > 0) {
      for (const b of bundles) {
        const { bundle_id, quantity } = b;

        const bundleDoc: any = await PandelModel.findById(bundle_id).populate("productsId");
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

    // كوبون
    if (coupon) {
      await CouponModel.findByIdAndUpdate(coupon._id, {
        $inc: { available: -1 },
      });
    }

    // جيفت كارد
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


export const getsalePending= async (req: Request, res: Response) => {
    const sales = await SaleModel.find({ order_pending: 1 })
    .populate('customer_id', 'name email phone_number')
    .populate('warehouse_id', 'name location')
    .populate('currency_id', 'code symbol')
    .populate('order_tax', 'name rate')
    .populate('order_discount', 'name rate')
    .populate('coupon_id', 'code discount_amount')
    .populate('gift_card_id', 'code amount')
    .lean();
    SuccessResponse(res, { sales });
}


export const getsaleunPending= async (req: Request, res: Response) => {
    const sales = await SaleModel.find({ order_pending: 0 })
    .populate('customer_id', 'name email phone_number')
    .populate('warehouse_id', 'name location')
    .populate('currency_id', 'code symbol')
    .populate('order_tax', 'name rate')
    .populate('order_discount', 'name rate')
    .populate('coupon_id', 'code discount_amount')
    .populate('gift_card_id', 'code amount')
    .lean();
    SuccessResponse(res, { sales });
}


