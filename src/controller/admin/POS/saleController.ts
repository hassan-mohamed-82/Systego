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
import { PaymentMethodModel } from '../../../models/schema/admin/payment_methods';
import { BadRequest } from '../../../Errors/BadRequest';
import { GiftCardModel } from '../../../models/schema/admin/POS/giftCard';
import { PointModel } from '../../../models/schema/admin/points';
import { BankAccountModel } from '../../../models/schema/admin/Financial_Account';
import { PandelModel } from '../../../models/schema/admin/pandels';
import { CashierShift } from '../../../models/schema/admin/POS/CashierShift';


export const createSale = async (req: Request, res: Response) => {
  const jwtUser = req.user;
  if (!jwtUser) throw new UnauthorizedError("Unauthorized");

  const cashierId   = jwtUser.id;
  const warehouseId = jwtUser.warehouse_id; // من التوكن

  if (!warehouseId) {
    throw new BadRequest("User warehouse is not set");
  }

  // ✅ 0) تأكد إن فيه شيفت مفتوح للكاشير ده
  const openShift = await CashierShift.findOne({
    cashier_id: cashierId,
    status: "open",
  }).sort({ start_time: -1 });

  if (!openShift) {
    throw new BadRequest("You must open a cashier shift before creating a sale");
  }

  const {
    customer_id,
    warehouse_id,
    account_id,          // Array of BankAccount IDs أو ID واحد
    order_pending = 1,   // 0: pending, 1: completed (default = completed)
    order_tax,
    order_discount,
    grand_total,
    coupon_id,
    products = [],
    bundles = [],
    gift_card_id,
  } = req.body;

  // نخلي account_id دايمًا Array
  const accountIds: string[] = account_id
    ? Array.isArray(account_id)
      ? account_id
      : [account_id]
    : [];

  const isPending = order_pending === 0; // 0 = pending, 1 = completed

  // لو الطلب Completed لازم يكون فيه على الأقل حساب بنكي واحد
  if (!isPending && accountIds.length === 0) {
    throw new BadRequest(
      "At least one bank account (account_id) is required for completed sales"
    );
  }

  // لو Completed وعايز حساب واحد بس (مفيش تقسيم مبالغ)
  if (!isPending && accountIds.length > 1) {
    throw new BadRequest(
      "Only one bank account can be selected for completed sales"
    );
  }

  // Helper function to find product price
  const findProductPrice = async (item: any) => {
    const query = item.product_id
      ? { productId: item.product_id }
      : { code: item.product_code };

    const productPrice = await ProductPriceModel.findOne(query);
    if (!productPrice) {
      throw new NotFound(
        `Product not found for ID: ${item.product_id} or code: ${item.product_code}`
      );
    }
    return productPrice;
  };

  // ========== Basic Validations ==========
  const warehouse = await WarehouseModel.findById(warehouse_id);
  if (!warehouse) throw new NotFound("Warehouse not found");

  const customer = await CustomerModel.findById(customer_id);
  if (!customer) throw new NotFound("Customer not found");

  // ===== Validate Bank Accounts (خاصة بنفس الـ warehouse و in_POS) =====
  if (accountIds.length > 0) {
    const bankAccounts = await BankAccountModel.find({
      _id: { $in: accountIds },
      status: true,
      in_POS: true,
      warehouseId: warehouseId, // لازم تكون لحسابات نفس المخزن بتاع الكاشير
    });

    if (bankAccounts.length !== accountIds.length) {
      throw new BadRequest(
        "One or more bank accounts are inactive, not allowed in POS, or do not belong to this warehouse"
      );
    }
  }

  // Coupon validation
  if (coupon_id) {
    const coupon = await CouponModel.findById(coupon_id);
    if (!coupon) throw new NotFound("Coupon not found");
    if (coupon.available <= 0)
      throw new BadRequest("Coupon is no longer available");
    if (new Date() > coupon.expired_date)
      throw new BadRequest("Coupon has expired");
  }

  // Tax validation
  if (order_tax) {
    const tax = await TaxesModel.findById(order_tax);
    if (!tax) throw new NotFound("Tax not found");
    if (!tax.status) throw new BadRequest("Tax is inactive");
  }

  // Discount validation
  if (order_discount) {
    const discount = await DiscountModel.findById(order_discount);
    if (!discount) throw new NotFound("Discount not found");
    if (!discount.status) throw new BadRequest("Discount is inactive");
  }

  // Gift card validation
  if (gift_card_id) {
    const giftCard = await GiftCardModel.findById(gift_card_id);
    if (!giftCard) throw new NotFound("Gift card not found");
    if (!giftCard.isActive) throw new BadRequest("Gift card is inactive");
    if (giftCard.expiration_date && new Date() > giftCard.expiration_date) {
      throw new BadRequest("Gift card has expired");
    }
    if (giftCard.amount < grand_total) {
      throw new BadRequest("Gift card balance is insufficient");
    }
  }

  // ========== Validate Products ==========
  for (const item of products) {
    const productPrice = await findProductPrice(item);

    if (productPrice.quantity < item.quantity) {
      throw new BadRequest(
        `Insufficient stock. Available: ${productPrice.quantity}, Requested: ${item.quantity}`
      );
    }
    if (item.quantity <= 0)
      throw new BadRequest("Invalid quantity for product");
    if (item.price < 0) throw new BadRequest("Invalid price for product");
  }

  // ========== Validate Bundles ==========
  const currentDate = new Date();

  for (const bundleItem of bundles) {
    const bundle = await PandelModel.findById(
      bundleItem.bundle_id
    ).populate("productsId");

    if (!bundle) throw new NotFound(`Bundle not found: ${bundleItem.bundle_id}`);
    if (!bundle.status)
      throw new BadRequest(`Bundle is inactive: ${bundle.name}`);
    if (bundle.startdate > currentDate)
      throw new BadRequest(`Bundle not started yet: ${bundle.name}`);
    if (bundle.enddate < currentDate)
      throw new BadRequest(`Bundle has expired: ${bundle.name}`);

    const bundleProducts = bundle.productsId as any[];

    for (const product of bundleProducts) {
      const productPrice = await ProductPriceModel.findOne({
        productId: product._id,
      });

      if (!productPrice) {
        throw new NotFound(`Product price not found for: ${product.name}`);
      }

      if (productPrice.quantity < bundleItem.quantity) {
        throw new BadRequest(
          `Insufficient stock for "${product.name}" in bundle "${bundle.name}". Available: ${productPrice.quantity}, Requested: ${bundleItem.quantity}`
        );
      }
    }

    if (bundleItem.quantity <= 0)
      throw new BadRequest("Invalid quantity for bundle");
  }

  // ========== Create Sale ==========
  const newSale = new SaleModel({
    customer_id,
    warehouse_id,
    account_id: accountIds,
    order_pending,
    order_tax,
    order_discount,
    grand_total,
    coupon_id,
    gift_card_id,
    cashier_id: cashierId,
    shift_id: openShift._id,
  });

  const savedSale = await newSale.save();
  const saleId = savedSale._id;

  // ========== لو مش pending: Payment + زيادة رصيد الحساب ==========
  let updatedAccount: any = null;

  if (!isPending && accountIds.length > 0) {
    const accountId = accountIds[0];

    // Payment record
    await PaymentModel.create({
      sale_id: saleId,
      account_id: [accountId],
      amount: grand_total,
      status: "completed",
      payment_proof: null,
    });

    // زيادة رصيد الحساب
    updatedAccount = await BankAccountModel.findOneAndUpdate(
      {
        _id: accountId,
        status: true,
        in_POS: true,
        warehouseId: warehouseId,
      },
      { $inc: { balance: grand_total } },
      { new: true }
    );

    if (!updatedAccount) {
      throw new BadRequest(
        "Bank account not found or not allowed for this warehouse"
      );
    }
  }

  // ========== Process Products ==========
  for (const item of products) {
    const productPrice = await findProductPrice(item);

    await ProductSalesModel.create({
      sale_id: saleId,
      product_id: productPrice.productId,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      options_id: item.options_id || [],
      isGift: item.isGift || false,
      isBundle: false,
    });

    if (!isPending) {
      await ProductPriceModel.findOneAndUpdate(
        { productId: productPrice.productId },
        { $inc: { quantity: -item.quantity } }
      );
    }
  }

  // ========== Process Bundles ==========
  for (const bundleItem of bundles) {
    const bundle = await PandelModel.findById(
      bundleItem.bundle_id
    ).populate("productsId");
    const bundleProducts = bundle!.productsId as any[];

    await ProductSalesModel.create({
      sale_id: saleId,
      bundle_id: bundle!._id,
      quantity: bundleItem.quantity,
      price: bundle!.price,
      subtotal: bundle!.price * bundleItem.quantity,
      isBundle: true,
    });

    if (!isPending) {
      for (const product of bundleProducts) {
        await ProductPriceModel.findOneAndUpdate(
          { productId: product._id },
          { $inc: { quantity: -bundleItem.quantity } }
        );
      }
    }
  }

  // ========== Update Coupon (لو مش pending) ==========
  if (coupon_id && !isPending) {
    await CouponModel.findByIdAndUpdate(coupon_id, {
      $inc: { available: -1 },
    });
  }

  // ========== Update Gift Card (لو مش pending) ==========
  if (gift_card_id && !isPending) {
    await GiftCardModel.findByIdAndUpdate(gift_card_id, {
      $inc: { amount: -grand_total },
    });
  }

  // ========== Response ==========
  SuccessResponse(res, {
    message: isPending
      ? "Sale created as pending - awaiting confirmation"
      : "Sale created successfully",
    sale: savedSale,
    account: updatedAccount
      ? {
          _id: updatedAccount._id,
          name: updatedAccount.name,
          balance: updatedAccount.balance,
        }
      : undefined,
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


