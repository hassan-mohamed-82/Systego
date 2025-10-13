"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSales = exports.createSale = void 0;
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
const createSale = async (req, res) => {
    const { customer_id, warehouse_id, currency_id, sale_status = 'pending', order_tax, order_discount, shipping_cost = 0, grand_total, coupon_id, products, payment_method, gift_card_id } = req.body;
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
    // Validate coupon if provided
    if (coupon_id) {
        const coupon = await coupons_1.CouponModel.findById(coupon_id);
        if (!coupon) {
            throw new Errors_1.NotFound("Coupon not found");
        }
        if (coupon.available <= 0) {
            throw new Errors_1.NotFound("Coupon is no longer available");
        }
        if (new Date() > coupon.expired_date) {
            throw new Errors_1.NotFound("Coupon has expired");
        }
    }
    // Validate tax if provided
    if (order_tax) {
        const tax = await Taxes_1.TaxesModel.findById(order_tax);
        if (!tax)
            throw new Errors_1.NotFound("Tax not found");
        if (!tax.status)
            throw new BadRequest_1.BadRequest("Tax is inactive");
    }
    // Validate discount if provided
    if (order_discount) {
        const discount = await Discount_1.DiscountModel.findById(order_discount);
        if (!discount)
            throw new Errors_1.NotFound("Discount not found");
        if (!discount.status)
            throw new BadRequest_1.BadRequest("Discount is inactive");
    }
    for (const item of products) {
        // const product = await ProductModel.findById(item.product_id);
        // if (!product) throw new NotFound(`Product with ID ${item.product_id} not found`);
        // Check if product has options (using ProductPrice)
        if (item.options_id) {
            const productProductPriceOption = await product_price_1.ProductPriceOptionModel.find({
                option_id: item.options_id
            });
            if (!productProductPriceOption) {
                throw new Errors_1.NotFound(`Product price option with ID ${item.options_id} not found for product ${item.product_id}`);
            }
            const productPrice = await product_price_1.ProductPriceModel.findOne({
                productId: item.product_id
            });
            if (!productPrice)
                throw new Errors_1.NotFound(`Product price option with ID ${item.options_id} not found for product ${item.product_id}`);
            // Check if enough stock is available
            if (productPrice.quantity < item.quantity) {
                throw new Errors_1.NotFound(`Insufficient stock for product option ${item.options_id}. Available: ${productPrice.quantity}, Requested: ${item.quantity}`);
            }
        }
        else {
            // For products without options
            const productPrice = await product_price_1.ProductPriceModel.findOne({
                productId: item.product_id
            });
            if (!productPrice)
                throw new Errors_1.NotFound(`Product price not found for product ID ${item.product_id}`);
            if (productPrice.quantity < item.quantity) {
                throw new Errors_1.NotFound(`Insufficient stock for product ID ${item.product_id}. Available: ${productPrice.quantity}, Requested: ${item.quantity}`);
            }
        }
        if (item.quantity <= 0)
            throw new Errors_1.NotFound(`Invalid quantity for product ID ${item.product_id}`);
        if (item.price < 0)
            throw new Errors_1.NotFound(`Invalid price for product ID ${item.product_id}`);
    }
    if (gift_card_id) {
        const giftCard = await giftCard_1.GiftCardModel.findById(gift_card_id);
        if (!giftCard) {
            throw new Errors_1.NotFound("Gift card not found");
        }
        if (!giftCard.isActive) {
            throw new BadRequest_1.BadRequest("Gift card is inactive");
        }
        if (giftCard.expiration_date && new Date() > giftCard.expiration_date) {
            throw new BadRequest_1.BadRequest("Gift card has expired");
        }
        if (giftCard.amount < grand_total) {
            throw new BadRequest_1.BadRequest("Gift card balance is insufficient for this sale");
        }
    }
    const newSale = new Sale_1.SaleModel({
        customer_id,
        warehouse_id,
        currency_id,
        sale_status,
        order_tax,
        order_discount,
        shipping_cost,
        grand_total,
        coupon_id,
        gift_card_id
    });
    const savedSale = await newSale.save();
    const saleId = savedSale._id;
    if (payment_method) {
        await payment_1.PaymentModel.create([{
                sale_id: saleId,
                amount: grand_total,
                payment_method: payment_method,
                status: 'completed',
                payment_proof: null
            }]);
    }
    for (const item of products) {
        const productSale = new Sale_1.ProductSalesModel({
            sale_id: saleId,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            options_id: item.options_id
        });
        await productSale.save();
        if (item.options_id) {
            await product_price_1.ProductPriceModel.findOneAndUpdate({
                productId: item.product_id,
                _id: item.options_id
            }, {
                $inc: { quantity: -item.quantity }
            });
        }
        else {
            // Update default product price
            await product_price_1.ProductPriceModel.findOneAndUpdate({ productId: item.product_id }, {
                $inc: { quantity: -item.quantity }
            });
        }
    }
    // Update coupon availability if used
    if (coupon_id) {
        await coupons_1.CouponModel.findByIdAndUpdate(coupon_id, { $inc: { available: -1 } });
    }
    (0, response_1.SuccessResponse)(res, { message: "Sale created successfully", savedSale });
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
        .lean();
    (0, response_1.SuccessResponse)(res, { sales });
};
exports.getSales = getSales;
