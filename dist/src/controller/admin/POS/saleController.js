"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalePendingById = exports.getShiftCompletedSales = exports.getsalePending = exports.getAllSales = exports.getSales = exports.createSale = void 0;
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
// ثابت مؤقت لبيانات المكان – تقدر تعدله براحتك
const STORE_INFO = {
    name: "SYSTEGO", // اسم المكان
    phone: "01000000000", // رقم التليفون
    address: "Cairo, Egypt", // العنوان
};
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
    // 1) تأكد إن فيه شيفت مفتوح للكاشير ده
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: cashierId,
        status: "open",
    }).sort({ start_time: -1 });
    if (!openShift) {
        throw new BadRequest_1.BadRequest("You must open a cashier shift before creating a sale");
    }
    // 2) استقبل الداتا من الـ body
    const { customer_id, order_pending = 1, coupon_id, gift_card_id, tax_id, discount_id, products, bundles, shipping = 0, tax_rate = 0, tax_amount = 0, discount = 0, grand_total, note, financials, } = req.body;
    // 3) تحقق من الـ warehouse
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
    if (!warehouse) {
        throw new Errors_1.NotFound("Warehouse not found");
    }
    // 4) لازم منتج أو باكدج واحد على الأقل
    if ((!products || products.length === 0) &&
        (!bundles || bundles.length === 0)) {
        throw new BadRequest_1.BadRequest("At least one product or bundle is required");
    }
    if (!grand_total || Number(grand_total) <= 0) {
        throw new BadRequest_1.BadRequest("Grand total must be greater than 0");
    }
    const normalizedOrderPending = Number(order_pending) === 0 ? 0 : 1;
    const isPending = normalizedOrderPending === 1;
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
            return {
                account_id: accId,
                amount: amt,
            };
        });
        const totalPaid = paymentLines.reduce((sum, p) => sum + p.amount, 0);
        if (Number(totalPaid.toFixed(2)) !==
            Number(Number(grand_total).toFixed(2))) {
            throw new BadRequest_1.BadRequest("Sum of payments (financials) must equal grand_total");
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
    // 7) كوبون (لو موجود)
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
    // 8) ضريبة (لو موجودة)
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
    // 9) خصم (لو موجود)
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
    // 10) جيفت كارد (لو موجود)
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
        if (!isPending) {
            const totalPaid = paymentLines.reduce((s, p) => s + p.amount, 0);
            if (totalPaid > 0 && giftCard.amount < totalPaid) {
                throw new BadRequest_1.BadRequest("Gift card does not have enough balance");
            }
        }
    }
    // 11) ستوك المنتجات
    if (products && products.length > 0) {
        for (const p of products) {
            const { product_price_id, product_id, quantity } = p;
            if (product_price_id) {
                if (!mongoose_1.default.Types.ObjectId.isValid(product_price_id)) {
                    throw new BadRequest_1.BadRequest("Invalid product_price_id");
                }
                const priceDoc = await product_price_1.ProductPriceModel.findById(product_price_id);
                if (!priceDoc) {
                    throw new Errors_1.NotFound("Product price (variation) not found");
                }
                if (priceDoc.quantity < quantity) {
                    throw new BadRequest_1.BadRequest(`Not enough stock for product variation ${priceDoc._id}, available: ${priceDoc.quantity}, required: ${quantity}`);
                }
            }
            else {
                if (!product_id || !mongoose_1.default.Types.ObjectId.isValid(product_id)) {
                    throw new BadRequest_1.BadRequest("Invalid product_id for non-variation product");
                }
                const productDoc = await products_1.ProductModel.findById(product_id);
                if (!productDoc) {
                    throw new Errors_1.NotFound("Product not found");
                }
                if (productDoc.quantity < quantity) {
                    throw new BadRequest_1.BadRequest(`Not enough stock for product ${productDoc._id}, available: ${productDoc.quantity}, required: ${quantity}`);
                }
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
    const accountIdsForSale = !isPending
        ? Array.from(new Set(paymentLines.map((p) => p.account_id)))
        : [];
    const totalPaidFromLines = paymentLines.reduce((s, p) => s + p.amount, 0);
    const totalForDb = Number(grand_total);
    const paidAmountForDb = !isPending ? totalPaidFromLines : 0;
    // 13) إنشاء الفاتورة
    const sale = await Sale_1.SaleModel.create({
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
        total: totalForDb,
        grand_total,
        paid_amount: paidAmountForDb,
        note,
        cashier_id: cashierId,
        shift_id: openShift._id,
    });
    // 14) ProductSales للمنتجات
    if (products && products.length > 0) {
        for (const p of products) {
            const { product_price_id, product_id, quantity, price, subtotal, options_id, isGift, } = p;
            await Sale_1.ProductSalesModel.create({
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
        }
    }
    // 15) ProductSales للباندلز
    if (bundles && bundles.length > 0) {
        for (const b of bundles) {
            const { bundle_id, quantity, price, subtotal, isGift } = b;
            await Sale_1.ProductSalesModel.create({
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
        }
    }
    // 16) لو Completed: Payments + تحديث الحسابات + ستوك + كوبون + جيفت كارد
    if (!isPending) {
        await payment_1.PaymentModel.create({
            sale_id: sale._id,
            financials: paymentLines.map((p) => ({
                account_id: p.account_id,
                amount: p.amount,
            })),
            status: "completed",
        });
        for (const line of paymentLines) {
            await Financial_Account_1.BankAccountModel.findByIdAndUpdate(line.account_id, {
                $inc: { balance: line.amount },
            });
        }
        if (products && products.length > 0) {
            for (const p of products) {
                const { product_price_id, product_id, quantity } = p;
                if (product_price_id) {
                    await product_price_1.ProductPriceModel.findByIdAndUpdate(product_price_id, {
                        $inc: { quantity: -quantity },
                    });
                }
                else {
                    if (!product_id || !mongoose_1.default.Types.ObjectId.isValid(product_id)) {
                        throw new BadRequest_1.BadRequest("Invalid product_id for non-variation product");
                    }
                    await products_1.ProductModel.findByIdAndUpdate(product_id, {
                        $inc: { quantity: -quantity },
                    });
                }
            }
        }
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
        if (coupon) {
            await coupons_1.CouponModel.findByIdAndUpdate(coupon._id, {
                $inc: { available: -1 },
            });
        }
        if (giftCard && totalPaidFromLines > 0) {
            await giftCard_1.GiftCardModel.findByIdAndUpdate(giftCard._id, {
                $inc: { amount: -totalPaidFromLines },
            });
        }
    }
    // 17) رجّع الأوردر كامل (populated) + الآيتمز كاملة + بيانات المكان
    const fullSale = await Sale_1.SaleModel.findById(sale._id)
        .populate("customer_id", "name email phone_number")
        .populate("warehouse_id", "name location")
        .populate("order_tax", "name rate type")
        .populate("order_discount", "name rate type")
        .populate("coupon_id", "code discount_amount")
        .populate("gift_card_id", "code amount")
        .populate("cashier_id", "name email")
        .populate("shift_id", "start_time status")
        .populate("account_id", "name type balance")
        .lean();
    const fullItems = await Sale_1.ProductSalesModel.find({ sale_id: sale._id })
        .populate("product_id", "name ar_name image price")
        .populate({
        path: "product_price_id",
        select: "price code quantity options",
        populate: {
            path: "options",
            select: "name ar_name price",
        },
    })
        .populate("bundle_id", "name price")
        .populate("options_id", "name ar_name price")
        .lean();
    return (0, response_1.SuccessResponse)(res, {
        message: "Sale created successfully",
        store: STORE_INFO,
        sale: fullSale,
        items: fullItems,
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
    // 1) هات كل الـ sales الـ pending
    const sales = await Sale_1.SaleModel.find({ order_pending: 1 }) // 1 = pending
        .populate("customer_id", "name email phone_number")
        .populate("warehouse_id", "name location")
        .populate("order_tax", "name rate")
        .populate("order_discount", "name rate")
        .populate("coupon_id", "code discount_amount")
        .populate("gift_card_id", "code amount")
        .lean();
    if (!sales.length) {
        return (0, response_1.SuccessResponse)(res, { sales: [] });
    }
    // 2) كل الـ IDs بتاعة الـ sales
    const saleIds = sales.map((s) => s._id);
    // 3) هات كل الـ items (ProductSales) اللي تابعة للـ sales دي
    const items = await Sale_1.ProductSalesModel.find({
        sale_id: { $in: saleIds },
    })
        .populate("product_id", "name ar_name image price") // تفاصيل المنتج
        .populate("product_price_id", "price code") // تفاصيل الـ variation (لو موجود)
        .populate("bundle_id", "name price") // لو هو bundle
        .lean();
    // 4) جمّع الـ items حسب sale_id
    const itemsBySaleId = {};
    for (const item of items) {
        const key = item.sale_id.toString();
        if (!itemsBySaleId[key])
            itemsBySaleId[key] = [];
        itemsBySaleId[key].push(item);
    }
    // 5) رجّع الـ sales ومعاها items
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
        .populate("coupon_id", "code discount_amount")
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
        order_pending: 1, // 1 = pending
    }).lean();
    if (!sale) {
        throw new Errors_1.NotFound("Pending sale not found");
    }
    const items = await Sale_1.ProductSalesModel.find({ sale_id: sale._id }).lean();
    const products = [];
    const bundles = [];
    for (const item of items) {
        if (item.isBundle) {
            bundles.push({
                bundle_id: item.bundle_id,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                isGift: !!item.isGift,
            });
        }
        else {
            products.push({
                product_id: item.product_id,
                product_price_id: item.product_price_id,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                isGift: !!item.isGift,
                options_id: item.options_id || [],
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
    return (0, response_1.SuccessResponse)(res, {
        sale,
        products,
        bundles,
        payloadForCreateSale,
    });
};
exports.getSalePendingById = getSalePendingById;
