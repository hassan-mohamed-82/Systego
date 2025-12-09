"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getsaleunPending = exports.getsalePending = exports.getAllSales = exports.getSales = exports.createSale = void 0;
const Sale_1 = require("../../../models/schema/admin/POS/Sale");
const Warehouse_1 = require("../../../models/schema/admin/Warehouse");
const Errors_1 = require("../../../Errors");
const customer_1 = require("../../../models/schema/admin/POS/customer");
const response_1 = require("../../../utils/response");
const coupons_1 = require("../../../models/schema/admin/coupons");
const Taxes_1 = require("../../../models/schema/admin/Taxes");
const Discount_1 = require("../../../models/schema/admin/Discount");
const product_price_1 = require("../../../models/schema/admin/product_price");
const payment_1 = require("../../../models/schema/admin/POS/payment");
const payment_methods_1 = require("../../../models/schema/admin/payment_methods");
const BadRequest_1 = require("../../../Errors/BadRequest");
const giftCard_1 = require("../../../models/schema/admin/POS/giftCard");
const points_1 = require("../../../models/schema/admin/points");
const Financial_Account_1 = require("../../../models/schema/admin/Financial_Account");
const pandels_1 = require("../../../models/schema/admin/pandels");
const createSale = async (req, res) => {
    const { customer_id, warehouse_id, account_id, // Array of BankAccount IDs
    order_pending = 0, // ✅ 0: pending, 1: completed
    order_tax, order_discount, grand_total, coupon_id, products = [], bundles = [], payment_method, gift_card_id, } = req.body;
    // نخلي account_id دايمًا Array عشان يمشي مع الـ Schema
    const accountIds = account_id
        ? Array.isArray(account_id)
            ? account_id
            : [account_id]
        : [];
    // Helper function to find product price
    const findProductPrice = async (item) => {
        const query = item.product_id
            ? { productId: item.product_id }
            : { code: item.product_code };
        const productPrice = await product_price_1.ProductPriceModel.findOne(query);
        if (!productPrice) {
            throw new Errors_1.NotFound(`Product not found for ID: ${item.product_id} or code: ${item.product_code}`);
        }
        return productPrice;
    };
    // ✅ بما إن القيم 0 و 1 بس
    // 0 = pending, 1 = completed
    const isPending = order_pending === 0;
    // ========== Basic Validations ==========
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouse_id);
    if (!warehouse)
        throw new Errors_1.NotFound("Warehouse not found");
    const customer = await customer_1.CustomerModel.findById(customer_id);
    if (!customer)
        throw new Errors_1.NotFound("Customer not found");
    const paymentMethod = await payment_methods_1.PaymentMethodModel.findById(payment_method);
    if (!paymentMethod)
        throw new Errors_1.NotFound("Payment method not found");
    if (!paymentMethod.isActive)
        throw new BadRequest_1.BadRequest("Payment method is not active");
    // ===== Validate Bank Accounts: لازم status = true && in_POS = true =====
    if (accountIds.length > 0) {
        const bankAccounts = await Financial_Account_1.BankAccountModel.find({
            _id: { $in: accountIds },
            status: true,
            in_POS: true,
        });
        if (bankAccounts.length !== accountIds.length) {
            throw new BadRequest_1.BadRequest("One or more bank accounts are inactive or not allowed in POS");
        }
        // لو محتاج تربط بالحسابات الخاصة بالمخزن نفسه، فعّل ده:
        /*
        const wrongWarehouseAccount = bankAccounts.find(
          (acc: any) => acc.warhouseId?.toString() !== warehouse_id.toString()
        );
        if (wrongWarehouseAccount) {
          throw new BadRequest(
            `Bank Account ${wrongWarehouseAccount.name || wrongWarehouseAccount._id} does not belong to this warehouse`
          );
        }
        */
    }
    // Points payment check
    const isPointsPayment = paymentMethod.name?.toLowerCase() === "points" ||
        paymentMethod.type?.toLowerCase() === "points";
    // الدفع بالنقاط لازم يكون الطلب مش pending
    if (isPointsPayment && isPending) {
        throw new BadRequest_1.BadRequest("Points payment cannot be used for pending orders");
    }
    if (isPointsPayment) {
        const pointsConfig = await points_1.PointModel.findOne().sort({ createdAt: -1 });
        if (!pointsConfig)
            throw new BadRequest_1.BadRequest("Points system is not configured");
        const pointsRequired = Math.ceil(grand_total / pointsConfig.amount) * pointsConfig.points;
        if (!customer.total_points_earned ||
            customer.total_points_earned < pointsRequired) {
            throw new BadRequest_1.BadRequest("Points Not enough");
        }
        await customer_1.CustomerModel.findByIdAndUpdate(customer_id, {
            $inc: { total_points_earned: -pointsRequired },
        });
    }
    // Coupon validation
    if (coupon_id) {
        const coupon = await coupons_1.CouponModel.findById(coupon_id);
        if (!coupon)
            throw new Errors_1.NotFound("Coupon not found");
        if (coupon.available <= 0)
            throw new BadRequest_1.BadRequest("Coupon is no longer available");
        if (new Date() > coupon.expired_date)
            throw new BadRequest_1.BadRequest("Coupon has expired");
    }
    // Tax validation
    if (order_tax) {
        const tax = await Taxes_1.TaxesModel.findById(order_tax);
        if (!tax)
            throw new Errors_1.NotFound("Tax not found");
        if (!tax.status)
            throw new BadRequest_1.BadRequest("Tax is inactive");
    }
    // Discount validation
    if (order_discount) {
        const discount = await Discount_1.DiscountModel.findById(order_discount);
        if (!discount)
            throw new Errors_1.NotFound("Discount not found");
        if (!discount.status)
            throw new BadRequest_1.BadRequest("Discount is inactive");
    }
    // Gift card validation
    if (gift_card_id) {
        const giftCard = await giftCard_1.GiftCardModel.findById(gift_card_id);
        if (!giftCard)
            throw new Errors_1.NotFound("Gift card not found");
        if (!giftCard.isActive)
            throw new BadRequest_1.BadRequest("Gift card is inactive");
        if (giftCard.expiration_date && new Date() > giftCard.expiration_date) {
            throw new BadRequest_1.BadRequest("Gift card has expired");
        }
        if (giftCard.amount < grand_total) {
            throw new BadRequest_1.BadRequest("Gift card balance is insufficient");
        }
    }
    // ========== Validate Products ==========
    for (const item of products) {
        const productPrice = await findProductPrice(item);
        if (productPrice.quantity < item.quantity) {
            throw new BadRequest_1.BadRequest(`Insufficient stock. Available: ${productPrice.quantity}, Requested: ${item.quantity}`);
        }
        if (item.quantity <= 0)
            throw new BadRequest_1.BadRequest("Invalid quantity for product");
        if (item.price < 0)
            throw new BadRequest_1.BadRequest("Invalid price for product");
    }
    // ========== Validate Bundles ==========
    const currentDate = new Date();
    for (const bundleItem of bundles) {
        const bundle = await pandels_1.PandelModel.findById(bundleItem.bundle_id).populate("productsId");
        if (!bundle)
            throw new Errors_1.NotFound(`Bundle not found: ${bundleItem.bundle_id}`);
        if (!bundle.status)
            throw new BadRequest_1.BadRequest(`Bundle is inactive: ${bundle.name}`);
        if (bundle.startdate > currentDate)
            throw new BadRequest_1.BadRequest(`Bundle not started yet: ${bundle.name}`);
        if (bundle.enddate < currentDate)
            throw new BadRequest_1.BadRequest(`Bundle has expired: ${bundle.name}`);
        const bundleProducts = bundle.productsId;
        for (const product of bundleProducts) {
            const productPrice = await product_price_1.ProductPriceModel.findOne({
                productId: product._id,
            });
            if (!productPrice) {
                throw new Errors_1.NotFound(`Product price not found for: ${product.name}`);
            }
            if (productPrice.quantity < bundleItem.quantity) {
                throw new BadRequest_1.BadRequest(`Insufficient stock for "${product.name}" in bundle "${bundle.name}". Available: ${productPrice.quantity}, Requested: ${bundleItem.quantity}`);
            }
        }
        if (bundleItem.quantity <= 0)
            throw new BadRequest_1.BadRequest("Invalid quantity for bundle");
    }
    // ========== Create Sale ==========
    const newSale = new Sale_1.SaleModel({
        customer_id,
        warehouse_id,
        account_id: accountIds,
        order_pending,
        order_tax,
        order_discount,
        grand_total,
        coupon_id,
        gift_card_id,
        payment_method,
    });
    const savedSale = await newSale.save();
    const saleId = savedSale._id;
    // ========== Create Payment (لو مش pending و مش points) ==========
    if (!isPending && payment_method && !isPointsPayment) {
        await payment_1.PaymentModel.create({
            sale_id: saleId,
            amount: grand_total,
            payment_method: payment_method,
            status: "completed",
            payment_proof: null,
        });
    }
    // ========== Process Products ==========
    for (const item of products) {
        const productPrice = await findProductPrice(item);
        await Sale_1.ProductSalesModel.create({
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
            await product_price_1.ProductPriceModel.findOneAndUpdate({ productId: productPrice.productId }, { $inc: { quantity: -item.quantity } });
        }
    }
    // ========== Process Bundles ==========
    for (const bundleItem of bundles) {
        const bundle = await pandels_1.PandelModel.findById(bundleItem.bundle_id).populate("productsId");
        const bundleProducts = bundle.productsId;
        await Sale_1.ProductSalesModel.create({
            sale_id: saleId,
            bundle_id: bundle._id,
            quantity: bundleItem.quantity,
            price: bundle.price,
            subtotal: bundle.price * bundleItem.quantity,
            isBundle: true,
        });
        if (!isPending) {
            for (const product of bundleProducts) {
                await product_price_1.ProductPriceModel.findOneAndUpdate({ productId: product._id }, { $inc: { quantity: -bundleItem.quantity } });
            }
        }
    }
    // ========== Update Coupon (لو مش pending) ==========
    if (coupon_id && !isPending) {
        await coupons_1.CouponModel.findByIdAndUpdate(coupon_id, {
            $inc: { available: -1 },
        });
    }
    // ========== Update Gift Card (لو مش pending) ==========
    if (gift_card_id && !isPending) {
        await giftCard_1.GiftCardModel.findByIdAndUpdate(gift_card_id, {
            $inc: { amount: -grand_total },
        });
    }
    // ========== Calculate Points (لو مش pending و مش points payment) ==========
    let pointsEarned = 0;
    if (!isPointsPayment && !isPending) {
        const pointsConfig = await points_1.PointModel.findOne().sort({ createdAt: -1 });
        if (pointsConfig && pointsConfig.amount > 0 && pointsConfig.points > 0) {
            pointsEarned =
                Math.floor(grand_total / pointsConfig.amount) * pointsConfig.points;
            if (pointsEarned > 0) {
                await customer_1.CustomerModel.findByIdAndUpdate(customer_id, {
                    $inc: { total_points_earned: pointsEarned },
                });
            }
        }
    }
    // ========== Response ==========
    (0, response_1.SuccessResponse)(res, {
        message: isPending
            ? "Sale created as pending - awaiting confirmation"
            : "Sale created successfully",
        sale: savedSale,
        pointsEarned,
        status: isPending ? "pending" : "confirmed",
    });
};
exports.createSale = createSale;
const getSales = async (req, res) => {
    const sales = await Sale_1.SaleModel.find()
        .populate('customer_id', 'name email phone_number')
        .populate('warehouse_id', 'name location')
        .populate('currency_id', 'code symbol')
        .populate('order_tax', 'name rate')
        .populate('order_discount', 'name rate')
        .populate('coupon_id', 'code discount_amount')
        .populate('gift_card_id', 'code amount')
        //.populate('payment_method', 'name')
        .lean();
    (0, response_1.SuccessResponse)(res, { sales });
};
exports.getSales = getSales;
const getAllSales = async (req, res) => {
    const sales = await Sale_1.SaleModel.find()
        .select('grand_total')
        .populate('customer_id', 'name');
    (0, response_1.SuccessResponse)(res, { sales });
};
exports.getAllSales = getAllSales;
const getsalePending = async (req, res) => {
    const sales = await Sale_1.SaleModel.find({ order_pending: 1 })
        .populate('customer_id', 'name email phone_number')
        .populate('warehouse_id', 'name location')
        .populate('currency_id', 'code symbol')
        .populate('order_tax', 'name rate')
        .populate('order_discount', 'name rate')
        .populate('coupon_id', 'code discount_amount')
        .populate('gift_card_id', 'code amount')
        .lean();
    (0, response_1.SuccessResponse)(res, { sales });
};
exports.getsalePending = getsalePending;
const getsaleunPending = async (req, res) => {
    const sales = await Sale_1.SaleModel.find({ order_pending: 0 })
        .populate('customer_id', 'name email phone_number')
        .populate('warehouse_id', 'name location')
        .populate('currency_id', 'code symbol')
        .populate('order_tax', 'name rate')
        .populate('order_discount', 'name rate')
        .populate('coupon_id', 'code discount_amount')
        .populate('gift_card_id', 'code amount')
        .lean();
    (0, response_1.SuccessResponse)(res, { sales });
};
exports.getsaleunPending = getsaleunPending;
