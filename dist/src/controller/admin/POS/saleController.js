"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalesByStatus = exports.getAllSales = exports.getSaleById = exports.updateSaleStatus = exports.getSales = exports.createSale = void 0;
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
const createSale = async (req, res) => {
    const { customer_id, warehouse_id, currency_id, account_id, sale_status = 'pending', order_tax, order_discount, shipping_cost = 0, grand_total, coupon_id, products, payment_method, gift_card_id } = req.body;
    // Helper function to find product price safely
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
    // Validate required entities
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
    if (account_id) {
        const bankAccount = await Financial_Account_1.BankAccountModel.findById(account_id);
        if (!bankAccount)
            throw new Errors_1.NotFound("Bank Account not found");
        if (!bankAccount.is_default)
            throw new BadRequest_1.BadRequest("Bank Account is not default");
    }
    // Check if points payment
    const isPointsPayment = paymentMethod.name?.toLowerCase() === 'points' ||
        paymentMethod.type?.toLowerCase() === 'points';
    // Handle points payment
    if (isPointsPayment) {
        const pointsConfig = await points_1.PointModel.findOne().sort({ createdAt: -1 });
        if (!pointsConfig) {
            throw new BadRequest_1.BadRequest("Points system is not configured");
        }
        const pointsRequired = Math.ceil(grand_total / pointsConfig.amount) * pointsConfig.points;
        if (!customer.total_points_earned || customer.total_points_earned < pointsRequired) {
            throw new BadRequest_1.BadRequest('Points Not enough');
        }
        await customer_1.CustomerModel.findByIdAndUpdate(customer_id, {
            $inc: {
                total_points_earned: -pointsRequired
            }
        });
    }
    // Validate coupon
    if (coupon_id) {
        const coupon = await coupons_1.CouponModel.findById(coupon_id);
        if (!coupon)
            throw new Errors_1.NotFound("Coupon not found");
        if (coupon.available <= 0)
            throw new Errors_1.NotFound("Coupon is no longer available");
        if (new Date() > coupon.expired_date)
            throw new Errors_1.NotFound("Coupon has expired");
    }
    // Validate tax
    if (order_tax) {
        const tax = await Taxes_1.TaxesModel.findById(order_tax);
        if (!tax)
            throw new Errors_1.NotFound("Tax not found");
        if (!tax.status)
            throw new BadRequest_1.BadRequest("Tax is inactive");
    }
    // Validate discount
    if (order_discount) {
        const discount = await Discount_1.DiscountModel.findById(order_discount);
        if (!discount)
            throw new Errors_1.NotFound("Discount not found");
        if (!discount.status)
            throw new BadRequest_1.BadRequest("Discount is inactive");
    }
    // Validate gift card
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
            throw new BadRequest_1.BadRequest("Gift card balance is insufficient for this sale");
        }
    }
    // Validate products and inventory
    for (const item of products) {
        const productPrice = await findProductPrice(item);
        if (productPrice.quantity < item.quantity) {
            throw new Errors_1.NotFound(`Insufficient stock for product. Available: ${productPrice.quantity}, Requested: ${item.quantity}`);
        }
        if (item.quantity <= 0)
            throw new BadRequest_1.BadRequest(`Invalid quantity for product`);
        if (item.price < 0)
            throw new BadRequest_1.BadRequest(`Invalid price for product`);
    }
    // Create sale
    const newSale = new Sale_1.SaleModel({
        customer_id,
        warehouse_id,
        currency_id,
        account_id,
        sale_status,
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
    // Create payment record if not points payment
    if (payment_method && !isPointsPayment) {
        await payment_1.PaymentModel.create([{
                sale_id: saleId,
                amount: grand_total,
                payment_method: payment_method,
                status: 'completed',
                payment_proof: null
            }]);
    }
    // Process products
    for (const item of products) {
        const productPrice = await findProductPrice(item);
        const productSale = new Sale_1.ProductSalesModel({
            sale_id: saleId,
            product_id: productPrice.productId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            options_id: item.options_id || [],
            isGift: item.isGift || false
        });
        await productSale.save();
        // Update inventory
        await product_price_1.ProductPriceModel.findOneAndUpdate({ productId: productPrice.productId }, { $inc: { quantity: -item.quantity } });
    }
    // Update coupon availability
    if (coupon_id) {
        await coupons_1.CouponModel.findByIdAndUpdate(coupon_id, { $inc: { available: -1 } });
    }
    // Update gift card balance
    if (gift_card_id) {
        await giftCard_1.GiftCardModel.findByIdAndUpdate(gift_card_id, { $inc: { amount: -grand_total } });
    }
    // Add points earned if not using points payment
    let pointsEarned = 0;
    if (!isPointsPayment) {
        const pointsConfig = await points_1.PointModel.findOne().sort({ createdAt: -1 });
        if (pointsConfig && pointsConfig.amount > 0 && pointsConfig.points > 0) {
            pointsEarned = Math.floor(grand_total / pointsConfig.amount) * pointsConfig.points;
            if (pointsEarned > 0) {
                await customer_1.CustomerModel.findByIdAndUpdate(customer_id, {
                    $inc: {
                        total_points_earned: pointsEarned
                    }
                });
            }
        }
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Sale created successfully",
        sale: savedSale,
        pointsEarned
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
// update status sale
const updateSaleStatus = async (req, res) => {
    const { saleId } = req.params;
    const { sale_status } = req.body;
    const sale = await Sale_1.SaleModel.findById(saleId);
    if (!sale)
        throw new Errors_1.NotFound("Sale not found");
    sale.sale_status = sale_status || sale.sale_status;
    await sale.save();
    (0, response_1.SuccessResponse)(res, { message: "Sale status updated successfully" });
};
exports.updateSaleStatus = updateSaleStatus;
const getSaleById = async (req, res) => {
    const { saleId } = req.params;
    const sale = await Sale_1.SaleModel.findById(saleId)
        .populate('customer_id', 'name email phone_number')
        .populate('warehouse_id', 'name location')
        .populate('currency_id', 'code symbol')
        .populate('order_tax', 'name rate')
        .populate('order_discount', 'name rate')
        .populate('coupon_id', 'code discount_amount')
        .populate('gift_card_id', 'code amount')
        .lean();
    if (!sale)
        throw new Errors_1.NotFound("Sale not found");
    const products = await Sale_1.ProductSalesModel.find({ sale_id: saleId })
        .select('product_id quantity price subtotal')
        .populate('product_id', 'name')
        .lean();
    (0, response_1.SuccessResponse)(res, { sale, products });
};
exports.getSaleById = getSaleById;
const getAllSales = async (req, res) => {
    const sales = await Sale_1.SaleModel.find()
        .select('grand_total')
        .populate('customer_id', 'name');
    (0, response_1.SuccessResponse)(res, { sales });
};
exports.getAllSales = getAllSales;
// get sales by status 
const getSalesByStatus = async (req, res) => {
    const { status } = req.params;
    const sales = await Sale_1.SaleModel.find({ sale_status: status })
        .select('grand_total')
        .populate('customer_id', 'name');
    (0, response_1.SuccessResponse)(res, { sales });
};
exports.getSalesByStatus = getSalesByStatus;
