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
const BadRequest_1 = require("../../../Errors/BadRequest");
const giftCard_1 = require("../../../models/schema/admin/POS/giftCard");
const Financial_Account_1 = require("../../../models/schema/admin/Financial_Account");
const pandels_1 = require("../../../models/schema/admin/pandels");
const CashierShift_1 = require("../../../models/schema/admin/POS/CashierShift");
const createSale = async (req, res) => {
    const jwtUser = req.user;
    if (!jwtUser)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const cashierId = jwtUser.id;
    const warehouseId = jwtUser.warehouse_id; // من التوكن
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("User warehouse is not set");
    }
    // ✅ 0) تأكد إن فيه شيفت مفتوح للكاشير ده
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashier_id: cashierId,
        status: "open",
    }).sort({ start_time: -1 });
    if (!openShift) {
        throw new BadRequest_1.BadRequest("You must open a cashier shift before creating a sale");
    }
    const { customer_id, warehouse_id, account_id, // Array of BankAccount IDs أو ID واحد
    order_pending = 1, // 0: pending, 1: completed (default = completed)
    order_tax, order_discount, grand_total, coupon_id, products = [], bundles = [], gift_card_id, } = req.body;
    // نخلي account_id دايمًا Array
    const accountIds = account_id
        ? Array.isArray(account_id)
            ? account_id
            : [account_id]
        : [];
    const isPending = order_pending === 0; // 0 = pending, 1 = completed
    // لو الطلب Completed لازم يكون فيه على الأقل حساب بنكي واحد
    if (!isPending && accountIds.length === 0) {
        throw new BadRequest_1.BadRequest("At least one bank account (account_id) is required for completed sales");
    }
    // لو Completed وعايز حساب واحد بس (مفيش تقسيم مبالغ)
    if (!isPending && accountIds.length > 1) {
        throw new BadRequest_1.BadRequest("Only one bank account can be selected for completed sales");
    }
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
    // ========== Basic Validations ==========
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouse_id);
    if (!warehouse)
        throw new Errors_1.NotFound("Warehouse not found");
    const customer = await customer_1.CustomerModel.findById(customer_id);
    if (!customer)
        throw new Errors_1.NotFound("Customer not found");
    // ===== Validate Bank Accounts (خاصة بنفس الـ warehouse و in_POS) =====
    if (accountIds.length > 0) {
        const bankAccounts = await Financial_Account_1.BankAccountModel.find({
            _id: { $in: accountIds },
            status: true,
            in_POS: true,
            warehouseId: warehouseId, // لازم تكون لحسابات نفس المخزن بتاع الكاشير
        });
        if (bankAccounts.length !== accountIds.length) {
            throw new BadRequest_1.BadRequest("One or more bank accounts are inactive, not allowed in POS, or do not belong to this warehouse");
        }
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
        cashier_id: cashierId,
        shift_id: openShift._id,
    });
    const savedSale = await newSale.save();
    const saleId = savedSale._id;
    // ========== لو مش pending: Payment + زيادة رصيد الحساب ==========
    let updatedAccount = null;
    if (!isPending && accountIds.length > 0) {
        const accountId = accountIds[0];
        // Payment record
        await payment_1.PaymentModel.create({
            sale_id: saleId,
            account_id: [accountId],
            amount: grand_total,
            status: "completed",
            payment_proof: null,
        });
        // زيادة رصيد الحساب
        updatedAccount = await Financial_Account_1.BankAccountModel.findOneAndUpdate({
            _id: accountId,
            status: true,
            in_POS: true,
            warehouseId: warehouseId,
        }, { $inc: { balance: grand_total } }, { new: true });
        if (!updatedAccount) {
            throw new BadRequest_1.BadRequest("Bank account not found or not allowed for this warehouse");
        }
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
    // ========== Response ==========
    (0, response_1.SuccessResponse)(res, {
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
exports.createSale = createSale;
const getSales = async (req, res) => {
    const sales = await Sale_1.SaleModel.find()
        .populate('customer_id', 'name email phone_number')
        .populate('warehouse_id', 'name location')
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
