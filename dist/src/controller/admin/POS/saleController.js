"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
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
const mongoose_1 = __importDefault(require("mongoose"));
const createSale = async (req, res) => {
    const jwtUser = req.user;
    const cashierId = jwtUser?.id;
    const jwtWarehouseId = jwtUser?.warehouse_id;
    if (!cashierId) {
        throw new BadRequest_1.BadRequest("Unauthorized: user not found in token");
    }
    const warehouseId = jwtWarehouseId;
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    // 1) تأكد إن فيه شيفت مفتوح للكاشير ده
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashier_id: cashierId,
        status: "open",
    }).sort({ start_time: -1 });
    if (!openShift) {
        throw new BadRequest_1.BadRequest("You must open a cashier shift before creating a sale");
    }
    // 2) استقبل الداتا من البودي (بدون warehouse_id)
    const { customer_id, // اختياري
    order_pending = 1, // 0 = pending, 1 = completed
    coupon_id, gift_card_id, tax_id, discount_id, products, bundles, shipping = 0, tax_rate = 0, tax_amount = 0, discount = 0, total, grand_total, paid_amount, note, financials, // Array of { account_id / id, amount }
     } = req.body;
    // 3) تحقق من الـ warehouse اللي من التوكين
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
    if (!warehouse) {
        throw new Errors_1.NotFound("Warehouse not found");
    }
    // 4) لازم يبقى فيه على الأقل منتج أو باكدج
    if ((!products || products.length === 0) && (!bundles || bundles.length === 0)) {
        throw new BadRequest_1.BadRequest("At least one product or bundle is required");
    }
    if (!grand_total || grand_total <= 0) {
        throw new BadRequest_1.BadRequest("Grand total must be greater than 0");
    }
    const isPending = Number(order_pending) === 0;
    // 5) customer اختياري
    let customer = null;
    if (customer_id) {
        if (!mongoose_1.default.Types.ObjectId.isValid(customer_id)) {
            throw new BadRequest_1.BadRequest("Invalid customer id");
        }
        customer = await customer_1.CustomerModel.findById(customer_id);
        if (!customer) {
            throw new Errors_1.NotFound("Customer not found");
        }
    }
    let paymentLines = [];
    if (!isPending) {
        if (!financials || !Array.isArray(financials) || financials.length === 0) {
            throw new BadRequest_1.BadRequest("At least one payment line (financial) is required for non-pending sale");
        }
        paymentLines = financials.map((f) => {
            const accId = f.account_id || f.id; // لو الفرونت بيبعت id بدل account_id
            const amt = Number(f.amount);
            if (!accId || !mongoose_1.default.Types.ObjectId.isValid(accId)) {
                throw new BadRequest_1.BadRequest("Invalid account_id in financials");
            }
            if (!amt || amt <= 0) {
                throw new BadRequest_1.BadRequest("Each payment line must have amount > 0");
            }
            return {
                account_id: accId,
                amount: amt,
            };
        });
        const totalPaid = paymentLines.reduce((sum, p) => sum + p.amount, 0);
        if (Number(totalPaid.toFixed(2)) !== Number(Number(grand_total).toFixed(2))) {
            throw new BadRequest_1.BadRequest("Sum of payments (financials) must equal grand_total");
        }
        if (paid_amount != null && Number(paid_amount) !== totalPaid) {
            throw new BadRequest_1.BadRequest("paid_amount does not match sum of financials");
        }
        // تحقق من كل حساب بنكي في نفس الـ warehouse
        for (const line of paymentLines) {
            const bankAccount = await Financial_Account_1.BankAccountModel.findOne({
                _id: line.account_id,
                warehouseId: warehouseId, // 👈 من التوكين
                status: true,
                in_POS: true,
            });
            if (!bankAccount) {
                throw new BadRequest_1.BadRequest("One of the financial accounts is not valid or not allowed in POS");
            }
        }
    }
    // 7) كوبون
    let coupon = null;
    if (coupon_id) {
        if (!mongoose_1.default.Types.ObjectId.isValid(coupon_id)) {
            throw new BadRequest_1.BadRequest("Invalid coupon id");
        }
        coupon = await coupons_1.CouponModel.findById(coupon_id);
        if (!coupon)
            throw new Errors_1.NotFound("Coupon not found");
        if (!coupon.status)
            throw new BadRequest_1.BadRequest("Coupon is not active");
        if (coupon.available <= 0)
            throw new BadRequest_1.BadRequest("Coupon is out of stock");
        if (coupon.expired_date && coupon.expired_date < new Date()) {
            throw new BadRequest_1.BadRequest("Coupon is expired");
        }
    }
    // 8) ضريبة
    let tax = null;
    if (tax_id) {
        if (!mongoose_1.default.Types.ObjectId.isValid(tax_id)) {
            throw new BadRequest_1.BadRequest("Invalid tax id");
        }
        tax = await Taxes_1.TaxesModel.findById(tax_id);
        if (!tax)
            throw new Errors_1.NotFound("Tax not found");
        if (!tax.status)
            throw new BadRequest_1.BadRequest("Tax is not active");
    }
    // 9) خصم
    let discountDoc = null;
    if (discount_id) {
        if (!mongoose_1.default.Types.ObjectId.isValid(discount_id)) {
            throw new BadRequest_1.BadRequest("Invalid discount id");
        }
        discountDoc = await Discount_1.DiscountModel.findById(discount_id);
        if (!discountDoc)
            throw new Errors_1.NotFound("Discount not found");
        if (!discountDoc.status)
            throw new BadRequest_1.BadRequest("Discount is not active");
    }
    // 10) جيفت كارد
    let giftCard = null;
    if (gift_card_id) {
        if (!mongoose_1.default.Types.ObjectId.isValid(gift_card_id)) {
            throw new BadRequest_1.BadRequest("Invalid gift card id");
        }
        giftCard = await giftCard_1.GiftCardModel.findById(gift_card_id);
        if (!giftCard)
            throw new Errors_1.NotFound("Gift card not found");
        if (!giftCard.status)
            throw new BadRequest_1.BadRequest("Gift card is not active");
        if (giftCard.expired_date && giftCard.expired_date < new Date()) {
            throw new BadRequest_1.BadRequest("Gift card is expired");
        }
        const totalPaid = paymentLines.reduce((s, p) => s + p.amount, 0);
        if (giftCard.amount < totalPaid) {
            throw new BadRequest_1.BadRequest("Gift card does not have enough balance");
        }
    }
    // 11) ستوك المنتجات
    if (products && products.length > 0) {
        for (const p of products) {
            const { product_price_id, quantity } = p;
            if (!mongoose_1.default.Types.ObjectId.isValid(product_price_id)) {
                throw new BadRequest_1.BadRequest("Invalid product_price_id");
            }
            const priceDoc = await product_price_1.ProductPriceModel.findById(product_price_id);
            if (!priceDoc) {
                throw new Errors_1.NotFound("Product price not found");
            }
            if (priceDoc.quantity < quantity) {
                throw new BadRequest_1.BadRequest(`Not enough stock for product ${priceDoc._id}, available: ${priceDoc.quantity}, required: ${quantity}`);
            }
        }
    }
    // 12) ستوك الباندلز
    if (bundles && bundles.length > 0) {
        for (const b of bundles) {
            const { bundle_id, quantity } = b;
            if (!mongoose_1.default.Types.ObjectId.isValid(bundle_id)) {
                throw new BadRequest_1.BadRequest("Invalid bundle id");
            }
            const bundleDoc = await pandels_1.PandelModel.findById(bundle_id).populate("productsId");
            if (!bundleDoc) {
                throw new Errors_1.NotFound("Bundle not found");
            }
            const bundleProducts = (bundleDoc.productsId || []);
            for (const pPrice of bundleProducts) {
                const requiredQty = quantity;
                if (pPrice.quantity < requiredQty) {
                    throw new BadRequest_1.BadRequest(`Not enough stock for product in bundle ${bundleDoc.name}, product ${pPrice._id}, required: ${requiredQty}, available: ${pPrice.quantity}`);
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
    const sale = await Sale_1.SaleModel.create({
        reference,
        date: new Date(),
        customer_id: customer ? customer._id : undefined,
        warehouse_id: warehouseId, // 👈 من التوكين
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
    const productSalesDocs = [];
    if (products && products.length > 0) {
        for (const p of products) {
            const { product_price_id, product_id, quantity, price, subtotal, options_id, isGift, } = p;
            const ps = await Sale_1.ProductSalesModel.create({
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
            const ps = await Sale_1.ProductSalesModel.create({
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
        await payment_1.PaymentModel.create({
            sale_id: sale._id,
            financials: paymentLines.map((p) => ({
                account_id: p.account_id,
                amount: p.amount,
            })),
            status: "completed",
        });
        // زوّد رصيد كل حساب بالمبلغ الخاص بيه
        for (const line of paymentLines) {
            await Financial_Account_1.BankAccountModel.findByIdAndUpdate(line.account_id, {
                $inc: { balance: line.amount },
            });
        }
        // ستوك المنتجات
        if (products && products.length > 0) {
            for (const p of products) {
                const { product_price_id, quantity } = p;
                await product_price_1.ProductPriceModel.findByIdAndUpdate(product_price_id, {
                    $inc: { quantity: -quantity },
                });
            }
        }
        // ستوك منتجات الباندلز
        if (bundles && bundles.length > 0) {
            for (const b of bundles) {
                const { bundle_id, quantity } = b;
                const bundleDoc = await pandels_1.PandelModel.findById(bundle_id).populate("productsId");
                if (!bundleDoc)
                    continue;
                const bundleProducts = (bundleDoc.productsId || []);
                for (const pPrice of bundleProducts) {
                    const requiredQty = quantity;
                    await product_price_1.ProductPriceModel.findByIdAndUpdate(pPrice._id, {
                        $inc: { quantity: -requiredQty },
                    });
                }
            }
        }
        // كوبون
        if (coupon) {
            await coupons_1.CouponModel.findByIdAndUpdate(coupon._id, {
                $inc: { available: -1 },
            });
        }
        // جيفت كارد
        if (giftCard && totalPaidFromLines > 0) {
            await giftCard_1.GiftCardModel.findByIdAndUpdate(giftCard._id, {
                $inc: { amount: -totalPaidFromLines },
            });
        }
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Sale created successfully",
        sale,
        items: productSalesDocs,
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
