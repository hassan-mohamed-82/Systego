"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyCoupon = exports.payDue = exports.getDueSales = exports.getSalePendingById = exports.getShiftCompletedSales = exports.getsalePending = exports.getSales = exports.getAllSales = exports.createSale = void 0;
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
const products_1 = require("../../../models/schema/admin/products");
const User_1 = require("../../../models/schema/admin/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Product_Warehouse_1 = require("../../../models/schema/admin/Product_Warehouse");
const ServiceFee_1 = require("../../../models/schema/admin/ServiceFee");
const STORE_INFO = {
    name: "SYSTEGO",
    phone: "01134567",
    address: "Cairo, Egypt",
};
const roundCurrency = (value) => Math.round(value * 100) / 100;
const createSale = async (req, res) => {
    const jwtUser = req.user;
    const cashierId = jwtUser?.id;
    const warehouseId = jwtUser?.warehouse_id;
    if (!cashierId) {
        throw new BadRequest_1.BadRequest("Unauthorized: user not found in token");
    }
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: cashierId,
        status: "open",
    }).sort({ start_time: -1 });
    if (!openShift) {
        throw new BadRequest_1.BadRequest("You must open a cashier shift before creating a sale");
    }
    const { customer_id, order_pending = 0, gift_card_id, service_fee_ids = [], order_tax, order_discount, products, bundles, shipping = 0, tax_rate = 0, discount = 0, note, financials, coupon_code, applied_coupon, Due = 0, } = req.body;
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
    if (!warehouse) {
        throw new Errors_1.NotFound("Warehouse not found");
    }
    if ((!products || products.length === 0) &&
        (!bundles || bundles.length === 0)) {
        throw new BadRequest_1.BadRequest("At least one product or bundle is required");
    }
    const normalizedOrderPending = Number(order_pending) === 0 ? 0 : 1;
    const isPending = normalizedOrderPending === 1;
    const isDue = Number(Due) === 1;
    // ═══════════════════════════════════════════════════════════
    // ✅ PROCESS PRODUCTS & APPLY WHOLESALE PRICE
    // ═══════════════════════════════════════════════════════════
    const processedProducts = [];
    let productsTotal = 0;
    if (products && products.length > 0) {
        for (const p of products) {
            const { product_id, product_price_id, quantity, discount = 0, discount_type = "fixed" } = p;
            let finalPrice = 0;
            let originalPrice = 0;
            let isWholesale = false;
            if (product_price_id) {
                const priceDoc = await product_price_1.ProductPriceModel.findById(product_price_id);
                if (!priceDoc) {
                    throw new Errors_1.NotFound(`Product price ${product_price_id} not found`);
                }
                originalPrice = priceDoc.price || 0;
                finalPrice = originalPrice;
                if (product_id) {
                    const product = await products_1.ProductModel.findById(product_id);
                    if (product) {
                        const minQty = product.start_quantaty || 0;
                        const wholesalePrice = product.whole_price;
                        if (wholesalePrice && wholesalePrice > 0 && minQty > 0 && quantity >= minQty) {
                            const discountRatio = wholesalePrice / (product.price || 1);
                            finalPrice = Math.round(originalPrice * discountRatio * 100) / 100;
                            isWholesale = true;
                        }
                    }
                }
            }
            else if (product_id) {
                const product = await products_1.ProductModel.findById(product_id);
                if (!product) {
                    throw new Errors_1.NotFound(`Product ${product_id} not found`);
                }
                originalPrice = product.price || 0;
                finalPrice = originalPrice;
                const minQtyForWholesale = product.start_quantaty || 0;
                const wholesalePrice = product.whole_price;
                if (wholesalePrice &&
                    wholesalePrice > 0 &&
                    minQtyForWholesale > 0 &&
                    quantity >= minQtyForWholesale) {
                    finalPrice = wholesalePrice;
                    isWholesale = true;
                }
            }
            if (finalPrice === 0) {
                finalPrice = Number(p.price) || 0;
                originalPrice = finalPrice;
            }
            // Apply product-specific discount
            let appliedDiscount = 0;
            if (Number(discount) > 0) {
                if (discount_type === "percentage") {
                    appliedDiscount = finalPrice * (Number(discount) / 100);
                }
                else {
                    appliedDiscount = Number(discount);
                }
                finalPrice = Math.max(0, finalPrice - appliedDiscount);
            }
            const finalSubtotal = finalPrice * quantity;
            processedProducts.push({
                product_id: p.product_id,
                product_price_id: p.product_price_id,
                quantity: p.quantity,
                price: finalPrice,
                subtotal: finalSubtotal,
                original_price: originalPrice,
                discount: Number(discount),
                discount_type: discount_type,
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
    // ✅ PROCESS BUNDLES (الجديد)
    // ═══════════════════════════════════════════════════════════
    const processedBundles = [];
    let bundlesTotal = 0;
    if (bundles && bundles.length > 0) {
        for (const b of bundles) {
            const { bundle_id, quantity, selected_variations, isGift, discount = 0, discount_type = "fixed" } = b;
            if (!mongoose_1.default.Types.ObjectId.isValid(bundle_id)) {
                throw new BadRequest_1.BadRequest("Invalid bundle id");
            }
            const bundleDoc = await pandels_1.PandelModel.findById(bundle_id).lean();
            if (!bundleDoc) {
                throw new Errors_1.NotFound("Bundle not found");
            }
            // ✅ معالجة كل منتج في الـ Bundle
            const bundleProductsProcessed = [];
            for (const bundleProduct of bundleDoc.products || []) {
                const productId = bundleProduct.productId;
                let productPriceId = bundleProduct.productPriceId;
                const productQty = bundleProduct.quantity || 1;
                // ✅ لو الـ Variation مش محدد من الأدمن، شوف لو الكاشير اختار
                if (!productPriceId && selected_variations) {
                    const selectedVar = selected_variations.find((sv) => sv.productId?.toString() === productId?.toString());
                    if (selectedVar?.productPriceId) {
                        productPriceId = selectedVar.productPriceId;
                    }
                }
                // ✅ تحقق من الـ Stock
                if (productPriceId) {
                    // منتج مع Variation
                    const priceDoc = await product_price_1.ProductPriceModel.findById(productPriceId);
                    if (!priceDoc) {
                        throw new Errors_1.NotFound(`Product variation ${productPriceId} not found`);
                    }
                    if ((priceDoc.quantity ?? 0) < quantity * productQty) {
                        const product = await products_1.ProductModel.findById(productId).select("name").lean();
                        throw new BadRequest_1.BadRequest(`Not enough stock for "${product?.name || "product"}" variation in bundle "${bundleDoc.name}". Available: ${priceDoc.quantity}, Required: ${quantity * productQty}`);
                    }
                }
                else {
                    // منتج بدون Variation
                    const warehouseStock = await Product_Warehouse_1.Product_WarehouseModel.findOne({
                        productId: productId,
                        warehouseId: warehouseId,
                    });
                    if (!warehouseStock) {
                        const product = await products_1.ProductModel.findById(productId).select("name").lean();
                        throw new Errors_1.NotFound(`Product "${product?.name || productId}" not found in warehouse`);
                    }
                    if ((warehouseStock.quantity ?? 0) < quantity * productQty) {
                        const product = await products_1.ProductModel.findById(productId).select("name").lean();
                        throw new BadRequest_1.BadRequest(`Not enough stock for "${product?.name || "product"}" in bundle "${bundleDoc.name}". Available: ${warehouseStock.quantity}, Required: ${quantity * productQty}`);
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
            if (Number(discount) > 0) {
                if (discount_type === "percentage") {
                    appliedDiscount = finalBundlePrice * (Number(discount) / 100);
                }
                else {
                    appliedDiscount = Number(discount);
                }
                finalBundlePrice = Math.max(0, finalBundlePrice - appliedDiscount);
            }
            const bundleSubtotal = finalBundlePrice * quantity;
            processedBundles.push({
                bundle_id,
                quantity,
                price: finalBundlePrice,
                subtotal: bundleSubtotal,
                original_price: bundleDoc.price,
                discount: Number(discount),
                discount_type: discount_type,
                isGift: !!isGift,
                products: bundleProductsProcessed,
            });
            if (!isGift) {
                bundlesTotal += bundleSubtotal;
            }
        }
    }
    // ═══════════════════════════════════════════════════════════
    // ✅ CALCULATE FINAL GRAND TOTAL
    // ═══════════════════════════════════════════════════════════
    const subtotal = productsTotal + bundlesTotal;
    const normalizedServiceFeeIds = Array.isArray(service_fee_ids)
        ? service_fee_ids
            .filter((id) => !!id)
            .map((id) => String(id))
        : [];
    const uniqueServiceFeeIds = Array.from(new Set(normalizedServiceFeeIds));
    uniqueServiceFeeIds.forEach((id) => {
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new BadRequest_1.BadRequest(`Invalid service fee id: ${id}`);
        }
    });
    const serviceFeeDocs = uniqueServiceFeeIds.length
        ? await ServiceFee_1.ServiceFeeModel.find({
            _id: { $in: uniqueServiceFeeIds },
            status: true,
            module: "pos",
            $or: [{ warehouseId }, { warehouseId: null }],
        }).lean()
        : [];
    if (serviceFeeDocs.length !== uniqueServiceFeeIds.length) {
        throw new BadRequest_1.BadRequest("One or more selected service fees are invalid for this warehouse or module");
    }
    const appliedServiceFees = serviceFeeDocs.map((fee) => {
        const calculatedAmount = fee.type === "percentage"
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
    const serviceFeeTotal = roundCurrency(appliedServiceFees.reduce((sum, fee) => sum + fee.amount, 0));
    const taxAmountCalc = (subtotal * Number(tax_rate)) / 100;
    const finalGrandTotal = subtotal + serviceFeeTotal + taxAmountCalc + Number(shipping) - Number(discount);
    if (finalGrandTotal <= 0) {
        throw new BadRequest_1.BadRequest("Grand total must be greater than 0");
    }
    // ═══════════════════════════════════════════════════════════
    // Customer Validation
    // ═══════════════════════════════════════════════════════════
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
    if (isDue && !customer) {
        throw new BadRequest_1.BadRequest("Customer is required for due sales");
    }
    let paymentLines = [];
    let totalPaidFromLines = 0;
    if (!isPending && !isDue) {
        const finArr = financials;
        if (!finArr || !Array.isArray(finArr) || finArr.length === 0) {
            throw new BadRequest_1.BadRequest("Financials are required for completed sale (order_pending = 0)");
        }
        paymentLines = finArr.map((f) => {
            const accId = f.account_id || f.id;
            const amt = Number(f.amount);
            if (!accId || !mongoose_1.default.Types.ObjectId.isValid(accId)) {
                throw new BadRequest_1.BadRequest("Invalid account_id in financials");
            }
            if (!amt || amt <= 0) {
                throw new BadRequest_1.BadRequest("Each payment line must have amount > 0");
            }
            return { account_id: accId, amount: amt };
        });
        totalPaidFromLines = paymentLines.reduce((sum, p) => sum + p.amount, 0);
        const tolerance = 0.01;
        if (Math.abs(totalPaidFromLines - finalGrandTotal) > tolerance) {
            throw new BadRequest_1.BadRequest(`Sum of payments (${totalPaidFromLines.toFixed(2)}) must equal grand_total (${finalGrandTotal.toFixed(2)})`);
        }
        for (const line of paymentLines) {
            const bankAccount = await Financial_Account_1.BankAccountModel.findOne({
                _id: line.account_id,
                warehouseId: warehouseId,
                status: true,
                in_POS: true,
            });
            if (!bankAccount) {
                throw new BadRequest_1.BadRequest("One of the financial accounts is not valid or not allowed in POS");
            }
        }
    }
    // ═══════════════════════════════════════════════════════════
    // Coupon, Tax, Discount, Gift Card Validations
    // ═══════════════════════════════════════════════════════════
    let coupon = null;
    if (coupon_code) {
        coupon = await coupons_1.CouponModel.findOne({ coupon_code: coupon_code });
        if (!coupon)
            throw new Errors_1.NotFound("Coupon not found");
        if (coupon.available <= 0)
            throw new BadRequest_1.BadRequest("Coupon is out of stock");
        if (coupon.expired_date && coupon.expired_date < new Date()) {
            throw new BadRequest_1.BadRequest("Coupon is expired");
        }
    }
    let tax = null;
    if (order_tax) {
        if (!mongoose_1.default.Types.ObjectId.isValid(order_tax)) {
            throw new BadRequest_1.BadRequest("Invalid order_tax id");
        }
        tax = await Taxes_1.TaxesModel.findById(order_tax);
        if (!tax)
            throw new Errors_1.NotFound("Tax not found");
        if (!tax.status)
            throw new BadRequest_1.BadRequest("Tax is not active");
    }
    let discountDoc = null;
    if (order_discount) {
        if (!mongoose_1.default.Types.ObjectId.isValid(order_discount)) {
            throw new BadRequest_1.BadRequest("Invalid order_discount id");
        }
        discountDoc = await Discount_1.DiscountModel.findById(order_discount);
        if (!discountDoc)
            throw new Errors_1.NotFound("Discount not found");
        if (!discountDoc.status)
            throw new BadRequest_1.BadRequest("Discount is not active");
    }
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
    }
    // ═══════════════════════════════════════════════════════════
    // ✅ STOCK VALIDATION FOR PRODUCTS
    // ═══════════════════════════════════════════════════════════
    for (const p of processedProducts) {
        const { product_price_id, product_id, quantity } = p;
        if (product_price_id) {
            if (!mongoose_1.default.Types.ObjectId.isValid(product_price_id)) {
                throw new BadRequest_1.BadRequest("Invalid product_price_id");
            }
            const priceDoc = await product_price_1.ProductPriceModel.findById(product_price_id);
            if (!priceDoc) {
                throw new Errors_1.NotFound("Product price (variation) not found");
            }
            if ((priceDoc.quantity ?? 0) < quantity) {
                throw new BadRequest_1.BadRequest(`Not enough stock for variation, available: ${priceDoc.quantity ?? 0}, required: ${quantity}`);
            }
        }
        else {
            if (!product_id || !mongoose_1.default.Types.ObjectId.isValid(product_id)) {
                throw new BadRequest_1.BadRequest("Invalid product_id");
            }
            const warehouseStock = await Product_Warehouse_1.Product_WarehouseModel.findOne({
                productId: product_id,
                warehouseId: warehouseId,
            });
            if (!warehouseStock) {
                throw new Errors_1.NotFound(`Product ${product_id} not found in warehouse ${warehouseId}`);
            }
            if ((warehouseStock.quantity ?? 0) < quantity) {
                throw new BadRequest_1.BadRequest(`Not enough stock in warehouse, available: ${warehouseStock.quantity ?? 0}, required: ${quantity}`);
            }
        }
    }
    // ═══════════════════════════════════════════════════════════
    // CREATE SALE
    // ═══════════════════════════════════════════════════════════
    const accountIdsForSale = !isPending && !isDue && paymentLines.length > 0
        ? Array.from(new Set(paymentLines.map((p) => p.account_id)))
        : [];
    const paidAmountForDb = !isPending && !isDue ? totalPaidFromLines : 0;
    const remainingAmount = isDue ? finalGrandTotal : 0;
    const sale = await Sale_1.SaleModel.create({
        date: new Date(),
        customer_id: customer ? customer._id : undefined,
        Due_customer_id: isDue && customer ? customer._id : undefined,
        Due: isDue ? 1 : 0,
        warehouse_id: warehouseId,
        account_id: accountIdsForSale,
        order_pending: normalizedOrderPending,
        coupon_code: coupon ? coupon.coupon_code : "",
        applied_coupon: coupon ? true : false,
        gift_card_id: giftCard ? giftCard._id : undefined,
        order_tax: tax ? tax._id : undefined,
        order_discount: discountDoc ? discountDoc._id : undefined,
        service_fees: appliedServiceFees,
        service_fee_total: serviceFeeTotal,
        shipping,
        tax_rate,
        tax_amount: taxAmountCalc,
        discount,
        total: subtotal,
        grand_total: finalGrandTotal,
        paid_amount: paidAmountForDb,
        remaining_amount: remainingAmount,
        note,
        cashier_id: cashierId,
        shift_id: openShift._id,
    });
    // ═══════════════════════════════════════════════════════════
    // CREATE PRODUCT SALES
    // ═══════════════════════════════════════════════════════════
    for (const p of processedProducts) {
        await Sale_1.ProductSalesModel.create({
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
        });
    }
    // ═══════════════════════════════════════════════════════════
    // ✅ CREATE BUNDLE SALES (الجديد)
    // ═══════════════════════════════════════════════════════════
    for (const b of processedBundles) {
        await Sale_1.ProductSalesModel.create({
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
        });
    }
    // ═══════════════════════════════════════════════════════════
    // ✅ STOCK DEDUCTION & PAYMENTS
    // ═══════════════════════════════════════════════════════════
    if (!isPending) {
        // Payment Processing
        if (!isDue && paymentLines.length > 0) {
            await payment_1.PaymentModel.create({
                sale_id: sale._id,
                financials: paymentLines.map((p) => ({
                    account_id: p.account_id,
                    amount: p.amount,
                })),
            });
            for (const line of paymentLines) {
                await Financial_Account_1.BankAccountModel.findByIdAndUpdate(line.account_id, {
                    $inc: { balance: line.amount },
                });
            }
        }
        // ✅ خصم كميات المنتجات العادية
        for (const p of processedProducts) {
            if (p.product_price_id) {
                await product_price_1.ProductPriceModel.findByIdAndUpdate(p.product_price_id, {
                    $inc: { quantity: -p.quantity },
                });
                await products_1.ProductModel.findByIdAndUpdate(p.product_id, {
                    $inc: { quantity: -p.quantity },
                });
            }
            else if (p.product_id) {
                await Product_Warehouse_1.Product_WarehouseModel.findOneAndUpdate({ productId: p.product_id, warehouseId: warehouseId }, { $inc: { quantity: -p.quantity } });
                await Warehouse_1.WarehouseModel.findByIdAndUpdate(warehouseId, {
                    $inc: { stock_Quantity: -p.quantity },
                });
                await products_1.ProductModel.findByIdAndUpdate(p.product_id, {
                    $inc: { quantity: -p.quantity },
                });
            }
        }
        // ✅ خصم كميات الـ Bundles (الجديد)
        for (const b of processedBundles) {
            for (const bp of b.products) {
                const deductQty = b.quantity * bp.quantity;
                if (bp.productPriceId) {
                    // منتج مع Variation
                    await product_price_1.ProductPriceModel.findByIdAndUpdate(bp.productPriceId, {
                        $inc: { quantity: -deductQty },
                    });
                    await products_1.ProductModel.findByIdAndUpdate(bp.productId, {
                        $inc: { quantity: -deductQty },
                    });
                }
                else {
                    // منتج بدون Variation
                    await Product_Warehouse_1.Product_WarehouseModel.findOneAndUpdate({ productId: bp.productId, warehouseId: warehouseId }, { $inc: { quantity: -deductQty } });
                    await Warehouse_1.WarehouseModel.findByIdAndUpdate(warehouseId, {
                        $inc: { stock_Quantity: -deductQty },
                    });
                    await products_1.ProductModel.findByIdAndUpdate(bp.productId, {
                        $inc: { quantity: -deductQty },
                    });
                }
            }
        }
        // Coupon Update
        if (!isDue && coupon) {
            await coupons_1.CouponModel.findByIdAndUpdate(coupon._id, {
                $inc: { available: -1 },
            });
        }
        // Gift Card Update
        if (!isDue && giftCard && totalPaidFromLines > 0) {
            await giftCard_1.GiftCardModel.findByIdAndUpdate(giftCard._id, {
                $inc: { amount: -totalPaidFromLines },
            });
        }
    }
    // ═══════════════════════════════════════════════════════════
    // FETCH FULL SALE DATA
    // ═══════════════════════════════════════════════════════════
    const fullSale = await Sale_1.SaleModel.findById(sale._id)
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
    const fullItems = await Sale_1.ProductSalesModel.find({ sale_id: sale._id })
        .populate("product_id", "name ar_name image price whole_price start_quantaty")
        .populate("product_price_id", "price code quantity")
        .populate("bundle_id", "name price")
        .populate("options_id", "name ar_name price")
        .lean();
    const formattedItems = fullItems.map((item) => {
        if (item.isGift) {
            const { price, subtotal, ...rest } = item;
            return rest;
        }
        return item;
    });
    return (0, response_1.SuccessResponse)(res, {
        message: isDue
            ? `Due sale created. Amount owed: ${remainingAmount}`
            : "Sale created successfully",
        store: STORE_INFO,
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
            discount: Number(discount),
            grand_total: finalGrandTotal,
        },
    });
};
exports.createSale = createSale;
const getAllSales = async (req, res) => {
    const sales = await Sale_1.SaleModel.find({ order_pending: 0 }) // ✅ المكتملة بس
        .select("reference grand_total service_fee_total paid_amount remaining_amount Due order_pending date createdAt")
        .populate("customer_id", "name")
        .populate("Due_customer_id", "name")
        .populate("warehouse_id", "name")
        .populate("cashier_id", "name")
        .sort({ createdAt: -1 })
        .lean();
    (0, response_1.SuccessResponse)(res, { sales });
};
exports.getAllSales = getAllSales;
const getSales = async (req, res) => {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Invalid sale id");
    }
    const sale = await Sale_1.SaleModel.findById(id)
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
        throw new Errors_1.NotFound("Sale not found");
    }
    const items = await Sale_1.ProductSalesModel.find({ sale_id: sale._id })
        .populate("product_id", "name ar_name image price")
        .populate("product_price_id", "price code quantity")
        .populate("bundle_id", "name price")
        .populate("options_id", "name ar_name price")
        .lean();
    // ✅ إخفاء السعر للهدايا فقط
    const processedItems = items.map((item) => {
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
                    options_id: item.options_id?.map((opt) => ({ ...opt, price: null })) || [],
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
    (0, response_1.SuccessResponse)(res, { sale, items: processedItems });
};
exports.getSales = getSales;
const getsalePending = async (req, res) => {
    const jwtUser = req.user;
    const cashierId = jwtUser?.id;
    const warehouseId = jwtUser?.warehouse_id;
    if (!cashierId) {
        throw new BadRequest_1.BadRequest("Unauthorized: user not found in token");
    }
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    // ✅ هات الشيفت المفتوح الحالي
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: cashierId,
        status: "open",
    }).sort({ start_time: -1 });
    if (!openShift) {
        return (0, response_1.SuccessResponse)(res, { sales: [] });
    }
    // ✅ هات الـ pending sales بتاعة الشيفت ده بس
    const sales = await Sale_1.SaleModel.find({
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
        return (0, response_1.SuccessResponse)(res, { sales: [] });
    }
    const saleIds = sales.map((s) => s._id);
    const items = await Sale_1.ProductSalesModel.find({
        sale_id: { $in: saleIds },
    })
        .populate("product_id", "name ar_name image price")
        .populate("product_price_id", "price code")
        .populate("bundle_id", "name price")
        .lean();
    const itemsBySaleId = {};
    for (const item of items) {
        const key = item.sale_id.toString();
        if (!itemsBySaleId[key])
            itemsBySaleId[key] = [];
        itemsBySaleId[key].push(item);
    }
    const salesWithItems = sales.map((s) => ({
        ...s,
        items: itemsBySaleId[s._id.toString()] || [],
    }));
    return (0, response_1.SuccessResponse)(res, { sales: salesWithItems });
};
exports.getsalePending = getsalePending;
const getShiftCompletedSales = async (req, res) => {
    const { password } = req.body;
    const jwtUser = req.user;
    if (!jwtUser)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const userId = jwtUser.id;
    // 1) هات اليوزر (مع الباسورد عشان نقدر نشيك الحقيقي)
    const user = await User_1.UserModel.findById(userId).select("+password_hash +role");
    if (!user)
        throw new Errors_1.NotFound("User not found");
    const fakePassword = process.env.SHIFT_REPORT_PASSWORD;
    let mode = null;
    // 👇 الأول: جرّب الباسورد الحقيقي
    if (password && (await bcryptjs_1.default.compare(password, user.password_hash))) {
        mode = "real";
    }
    else if (fakePassword && password === fakePassword) {
        // تاني: جرّب الباسورد الفيك من الـ env
        mode = "fake";
    }
    if (!mode) {
        throw new BadRequest_1.BadRequest("Wrong password");
    }
    // 2) آخر شيفت مفتوح لليوزر ده
    const shift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: user._id,
        status: "open",
    }).sort({ start_time: -1 });
    if (!shift)
        throw new Errors_1.NotFound("No open cashier shift found");
    // 3) كل المبيعات الـ completed في الشيفت ده
    const sales = await Sale_1.SaleModel.find({
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
        return (0, response_1.SuccessResponse)(res, {
            message: "No completed sales in this shift",
            mode,
            shift,
            sales: [],
        });
    }
    const saleIds = sales.map((s) => s._id);
    const items = await Sale_1.ProductSalesModel.find({
        sale_id: { $in: saleIds },
    })
        .populate("product_id", "name ar_name image price")
        .populate("product_price_id", "price code")
        .populate("bundle_id", "name price")
        .lean();
    const itemsBySaleId = {};
    for (const item of items) {
        const key = item.sale_id.toString();
        if (!itemsBySaleId[key])
            itemsBySaleId[key] = [];
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
        return (0, response_1.SuccessResponse)(res, {
            message: "Completed sales sample for current shift",
            shift,
            total_sales_in_shift: totalCount,
            sampled_percentage: 20,
            sales: sampledSales,
        });
    }
    // 5) لو mode = real → رجّع كل الأوردرات
    return (0, response_1.SuccessResponse)(res, {
        message: "Completed sales for current shift",
        shift,
        sales: salesWithItems,
    });
};
exports.getShiftCompletedSales = getShiftCompletedSales;
const getSalePendingById = async (req, res) => {
    const { sale_id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(sale_id)) {
        throw new BadRequest_1.BadRequest("Invalid sale id");
    }
    const sale = await Sale_1.SaleModel.findOne({
        _id: sale_id,
        order_pending: { $in: [1, "1", true] }
    })
        .populate("customer_id", "name email phone_number address")
        .populate("warehouse_id", "name ar_name")
        .populate("cashier_id", "name email")
        .populate("gift_card_id", "code balance")
        .populate("order_tax", "name rate")
        .populate("order_discount", "name discount_type discount_value")
        .lean();
    if (!sale) {
        throw new Errors_1.NotFound("Pending sale not found");
    }
    const items = await Sale_1.ProductSalesModel.find({ sale_id: sale._id })
        .populate({
        path: "product_id",
        select: "name ar_name image price code quantity categoryId brandId",
        populate: [
            { path: "categoryId", select: "name ar_name" },
            { path: "brandId", select: "name ar_name" }
        ]
    })
        .populate({
        path: "product_price_id",
        select: "price code quantity options",
        populate: {
            path: "productId",
            select: "name ar_name image"
        }
    })
        .populate({
        path: "bundle_id",
        select: "name ar_name price productsId",
        populate: {
            path: "productsId",
            select: "name ar_name price"
        }
    })
        .populate({
        path: "options_id",
        select: "name ar_name price variationId",
        populate: {
            path: "variationId",
            select: "name ar_name"
        }
    })
        .lean();
    const products = [];
    const bundles = [];
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
        }
        else {
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
        customer_id: sale.customer_id?._id || null,
        order_pending: 0,
        coupon_code: sale.coupon_code || "",
        applied_coupon: sale.applied_coupon || false,
        gift_card_id: sale.gift_card_id?._id || null,
        tax_id: sale.order_tax?._id || null,
        discount_id: sale.order_discount?._id || null,
        shipping: sale.shipping || 0,
        tax_rate: sale.tax_rate || 0,
        tax_amount: sale.tax_amount || 0,
        service_fee_total: sale.service_fee_total || 0,
        service_fees: sale.service_fees || [],
        discount: sale.discount || 0,
        total: sale.total || sale.grand_total,
        grand_total: sale.grand_total,
        note: sale.note || "",
        products: products.map(p => ({
            product_id: p.product?._id,
            product_price_id: p.product_price?._id,
            quantity: p.quantity,
            price: p.price,
            subtotal: p.subtotal,
            isGift: p.isGift,
            options_id: p.options?.map((opt) => opt._id) || [],
        })),
        bundles: bundles.map(b => ({
            bundle_id: b.bundle?._id,
            quantity: b.quantity,
            price: b.price,
            subtotal: b.subtotal,
            isGift: b.isGift,
        })),
    };
    return (0, response_1.SuccessResponse)(res, {
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
            coupon_code: sale.coupon_code || "",
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
            total_quantity: [...products, ...bundles].reduce((sum, item) => sum + item.quantity, 0),
        },
        payloadForCreateSale,
    });
};
exports.getSalePendingById = getSalePendingById;
const getDueSales = async (req, res) => {
    const jwtUser = req.user;
    const warehouseId = jwtUser?.warehouse_id;
    const dueSales = await Sale_1.SaleModel.find({
        Due: 1,
        remaining_amount: { $gt: 0 },
        warehouse_id: warehouseId,
    })
        .populate("Due_customer_id", "name email phone_number")
        .populate("customer_id", "name email phone_number")
        .sort({ createdAt: -1 })
        .lean();
    const totalDue = dueSales.reduce((sum, sale) => sum + (sale.remaining_amount || 0), 0);
    return (0, response_1.SuccessResponse)(res, {
        message: "Due sales fetched successfully",
        count: dueSales.length,
        total_due: totalDue,
        sales: dueSales,
    });
};
exports.getDueSales = getDueSales;
// ═══════════════════════════════════════════════════════════
// PAY DUE
// ═══════════════════════════════════════════════════════════
const payDue = async (req, res) => {
    const jwtUser = req.user;
    const cashierId = jwtUser?.id;
    const warehouseId = jwtUser?.warehouse_id;
    if (!cashierId) {
        throw new BadRequest_1.BadRequest("Unauthorized: user not found in token");
    }
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    const { customer_id, amount, financials } = req.body;
    if (!customer_id || !mongoose_1.default.Types.ObjectId.isValid(customer_id)) {
        throw new BadRequest_1.BadRequest("Valid customer_id is required");
    }
    if (!amount || Number(amount) <= 0) {
        throw new BadRequest_1.BadRequest("Amount must be greater than 0");
    }
    const paymentAmount = Number(amount);
    const customer = await customer_1.CustomerModel.findById(customer_id);
    if (!customer) {
        throw new Errors_1.NotFound("Customer not found");
    }
    const dueSales = await Sale_1.SaleModel.find({
        Due_customer_id: customer_id,
        Due: 1,
        remaining_amount: { $gt: 0 },
        warehouse_id: warehouseId,
    }).sort({ createdAt: 1 });
    if (dueSales.length === 0) {
        throw new BadRequest_1.BadRequest("This customer has no pending dues");
    }
    const totalDue = dueSales.reduce((sum, sale) => sum + (sale.remaining_amount || 0), 0);
    if (paymentAmount > totalDue) {
        throw new BadRequest_1.BadRequest(`Payment amount (${paymentAmount}) exceeds total due (${totalDue})`);
    }
    if (!financials || !Array.isArray(financials) || financials.length === 0) {
        throw new BadRequest_1.BadRequest("Financials are required");
    }
    const paymentLines = financials.map((f) => {
        const accId = f.account_id || f.id;
        const amt = Number(f.amount);
        if (!accId || !mongoose_1.default.Types.ObjectId.isValid(accId)) {
            throw new BadRequest_1.BadRequest("Invalid account_id in financials");
        }
        if (!amt || amt <= 0) {
            throw new BadRequest_1.BadRequest("Each payment line must have amount > 0");
        }
        return { account_id: accId, amount: amt };
    });
    const totalFinancials = paymentLines.reduce((sum, p) => sum + p.amount, 0);
    if (Number(totalFinancials.toFixed(2)) !== Number(paymentAmount.toFixed(2))) {
        throw new BadRequest_1.BadRequest(`Sum of financials (${totalFinancials}) must equal amount (${paymentAmount})`);
    }
    for (const line of paymentLines) {
        const bankAccount = await Financial_Account_1.BankAccountModel.findOne({
            _id: line.account_id,
            warehouseId: warehouseId,
            status: true,
            in_POS: true,
        });
        if (!bankAccount) {
            throw new BadRequest_1.BadRequest(`Account ${line.account_id} is not valid for POS`);
        }
    }
    let remainingPayment = paymentAmount;
    const paidSales = [];
    for (const sale of dueSales) {
        if (remainingPayment <= 0)
            break;
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
        await Sale_1.SaleModel.findByIdAndUpdate(sale._id, {
            paid_amount: newPaidAmount,
            remaining_amount: Math.max(0, newRemainingAmount),
            Due: isFullyPaid ? 0 : 1,
            Due_customer_id: isFullyPaid ? null : sale.Due_customer_id,
            account_id: newAccountIds,
        });
        await payment_1.PaymentModel.create({
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
        await Financial_Account_1.BankAccountModel.findByIdAndUpdate(line.account_id, {
            $inc: { balance: line.amount },
        });
    }
    const remainingDues = await Sale_1.SaleModel.find({
        Due_customer_id: customer_id,
        Due: 1,
        remaining_amount: { $gt: 0 },
    });
    const newTotalDue = remainingDues.reduce((sum, sale) => sum + (sale.remaining_amount || 0), 0);
    return (0, response_1.SuccessResponse)(res, {
        message: newTotalDue === 0
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
exports.payDue = payDue;
const applyCoupon = async (req, res) => {
    const { coupon_code, grand_total } = req.body;
    if (!coupon_code)
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    const coupon = await coupons_1.CouponModel.findOne({ coupon_code });
    if (!coupon)
        throw new Errors_1.NotFound("Coupon not found");
    if (coupon.available <= 0)
        throw new BadRequest_1.BadRequest("Coupon is not available");
    if (coupon.expired_date < new Date())
        throw new BadRequest_1.BadRequest("Coupon is expired");
    if (coupon.minimum_amount_for_use > 0 && coupon.minimum_amount_for_use > grand_total)
        throw new BadRequest_1.BadRequest("Coupon is not applicable for this sale");
    return (0, response_1.SuccessResponse)(res, {
        message: "Coupon applied successfully",
        coupon,
    });
};
exports.applyCoupon = applyCoupon;
