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
import { PaymentMethodModel } from '../../../models/schema/admin/payment_methods';
import { BadRequest } from '../../../Errors/BadRequest';
import { GiftCardModel } from '../../../models/schema/admin/POS/giftCard';
import { PointModel } from '../../../models/schema/admin/points';
import { BankAccountModel } from '../../../models/schema/admin/Financial_Account';
import { PandelModel } from '../../../models/schema/admin/pandels';

export const createSale = async (req: Request, res: Response) => {
  const {
    customer_id,
    warehouse_id,
    currency_id,
    account_id,
    order_pending = 0,
    order_tax,
    order_discount,
    shipping_cost = 0,
    grand_total,
    coupon_id,
    products = [],
    bundles = [],
    payment_method,
    gift_card_id
  } = req.body;

  // Helper function to find product price
  const findProductPrice = async (item: any) => {
    const query = item.product_id
      ? { productId: item.product_id }
      : { code: item.product_code };
    const productPrice = await ProductPriceModel.findOne(query);
    if (!productPrice) {
      throw new NotFound(`Product not found for ID: ${item.product_id} or code: ${item.product_code}`);
    }
    return productPrice;
  };

  const isPending = order_pending === 1;

  // ========== Validations ==========

  const warehouse = await WarehouseModel.findById(warehouse_id);
  if (!warehouse) throw new NotFound("Warehouse not found");

  const customer = await CustomerModel.findById(customer_id);
  if (!customer) throw new NotFound("Customer not found");

  const paymentMethod = await PaymentMethodModel.findById(payment_method);
  if (!paymentMethod) throw new NotFound("Payment method not found");
  if (!paymentMethod.isActive) throw new BadRequest("Payment method is not active");

  if (account_id) {
    const bankAccount = await BankAccountModel.findById(account_id);
    if (!bankAccount) throw new NotFound("Bank Account not found");
    if (!bankAccount.is_default) throw new BadRequest("Bank Account is not default");
  }

  // Points payment check
  const isPointsPayment = paymentMethod.name?.toLowerCase() === 'points' ||
    paymentMethod.type?.toLowerCase() === 'points';

  // الدفع بالنقاط لازم يكون الطلب مش pending
  if (isPointsPayment && isPending) {
    throw new BadRequest("Points payment cannot be used for pending orders");
  }

  if (isPointsPayment) {
    const pointsConfig = await PointModel.findOne().sort({ createdAt: -1 });
    if (!pointsConfig) throw new BadRequest("Points system is not configured");

    const pointsRequired = Math.ceil(grand_total / pointsConfig.amount) * pointsConfig.points;
    if (!customer.total_points_earned || customer.total_points_earned < pointsRequired) {
      throw new BadRequest('Points Not enough');
    }

    await CustomerModel.findByIdAndUpdate(customer_id, {
      $inc: { total_points_earned: -pointsRequired }
    });
  }

  // Coupon validation
  if (coupon_id) {
    const coupon = await CouponModel.findById(coupon_id);
    if (!coupon) throw new NotFound("Coupon not found");
    if (coupon.available <= 0) throw new BadRequest("Coupon is no longer available");
    if (new Date() > coupon.expired_date) throw new BadRequest("Coupon has expired");
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
      throw new BadRequest(`Insufficient stock. Available: ${productPrice.quantity}, Requested: ${item.quantity}`);
    }
    if (item.quantity <= 0) throw new BadRequest("Invalid quantity for product");
    if (item.price < 0) throw new BadRequest("Invalid price for product");
  }

  // ========== Validate Bundles ==========

  const currentDate = new Date();

  for (const bundleItem of bundles) {
    const bundle = await PandelModel.findById(bundleItem.bundle_id).populate("productsId");

    if (!bundle) throw new NotFound(`Bundle not found: ${bundleItem.bundle_id}`);
    if (!bundle.status) throw new BadRequest(`Bundle is inactive: ${bundle.name}`);
    if (bundle.startdate > currentDate) throw new BadRequest(`Bundle not started yet: ${bundle.name}`);
    if (bundle.enddate < currentDate) throw new BadRequest(`Bundle has expired: ${bundle.name}`);

    // Check stock for bundle products
    const bundleProducts = bundle.productsId as any[];
    for (const product of bundleProducts) {
      const productPrice = await ProductPriceModel.findOne({ productId: product._id });

      if (!productPrice) {
        throw new NotFound(`Product price not found for: ${product.name}`);
      }

      if (productPrice.quantity < bundleItem.quantity) {
        throw new BadRequest(
          `Insufficient stock for "${product.name}" in bundle "${bundle.name}". Available: ${productPrice.quantity}, Requested: ${bundleItem.quantity}`
        );
      }
    }

    if (bundleItem.quantity <= 0) throw new BadRequest("Invalid quantity for bundle");
  }

  // ========== Create Sale ==========

  const newSale = new SaleModel({
    customer_id,
    warehouse_id,
    currency_id,
    account_id,
    order_pending,
    order_tax,
    order_discount,
    shipping_cost,
    grand_total,
    coupon_id,
    gift_card_id,
    payment_method
  });

  const savedSale = await newSale.save();
  const saleId = savedSale._id;

  // ========== Create Payment (فقط لو مش pending) ==========

  if (!isPending && payment_method && !isPointsPayment) {
    await PaymentModel.create({
      sale_id: saleId,
      amount: grand_total,
      payment_method: payment_method,
      status: 'completed',
      payment_proof: null
    });
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

    // خصم المخزون فقط لو مش pending
    if (!isPending) {
      await ProductPriceModel.findOneAndUpdate(
        { productId: productPrice.productId },
        { $inc: { quantity: -item.quantity } }
      );
    }
  }

  // ========== Process Bundles ==========

  for (const bundleItem of bundles) {
    const bundle = await PandelModel.findById(bundleItem.bundle_id).populate("productsId");
    const bundleProducts = bundle!.productsId as any[];

    await ProductSalesModel.create({
      sale_id: saleId,
      bundle_id: bundle!._id,
      quantity: bundleItem.quantity,
      price: bundle!.price,
      subtotal: bundle!.price * bundleItem.quantity,
      isBundle: true,
    });

    // خصم المخزون فقط لو مش pending
    if (!isPending) {
      for (const product of bundleProducts) {
        await ProductPriceModel.findOneAndUpdate(
          { productId: product._id },
          { $inc: { quantity: -bundleItem.quantity } }
        );
      }
    }
  }

  // ========== Update Coupon (فقط لو مش pending) ==========

  if (coupon_id && !isPending) {
    await CouponModel.findByIdAndUpdate(coupon_id, { $inc: { available: -1 } });
  }

  // ========== Update Gift Card (فقط لو مش pending) ==========

  if (gift_card_id && !isPending) {
    await GiftCardModel.findByIdAndUpdate(gift_card_id, { $inc: { amount: -grand_total } });
  }

  // ========== Calculate Points (فقط لو مش pending) ==========

  let pointsEarned = 0;
  if (!isPointsPayment && !isPending) {
    const pointsConfig = await PointModel.findOne().sort({ createdAt: -1 });

    if (pointsConfig && pointsConfig.amount > 0 && pointsConfig.points > 0) {
      pointsEarned = Math.floor(grand_total / pointsConfig.amount) * pointsConfig.points;

      if (pointsEarned > 0) {
        await CustomerModel.findByIdAndUpdate(customer_id, {
          $inc: { total_points_earned: pointsEarned }
        });
      }
    }
  }

  // ========== Response ==========

  SuccessResponse(res, {
    message: isPending
      ? "Sale created as pending - awaiting confirmation"
      : "Sale created successfully",
    sale: savedSale,
    pointsEarned,
    status: isPending ? 'pending' : 'confirmed'
  });
};

export const getSales = async (req: Request, res: Response)=> {
    const sales = await SaleModel.find()
        .populate('customer_id', 'name email phone_number')
        .populate('warehouse_id', 'name location')
        .populate('currency_id', 'code symbol')
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


