"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectCashier = exports.getCashiers = exports.getActiveBundles = exports.getAllSelections = exports.getFeaturedProducts = exports.getProductsByBrand = exports.getProductsByCategory = exports.getAllBrands = exports.getAllCategorys = void 0;
const products_1 = require("../../../models/schema/admin/products");
const category_1 = require("../../../models/schema/admin/category");
const brand_1 = require("../../../models/schema/admin/brand");
const coupons_1 = require("../../../models/schema/admin/coupons");
const Taxes_1 = require("../../../models/schema/admin/Taxes");
const Discount_1 = require("../../../models/schema/admin/Discount");
const Warehouse_1 = require("../../../models/schema/admin/Warehouse");
const giftCard_1 = require("../../../models/schema/admin/POS/giftCard");
const payment_methods_1 = require("../../../models/schema/admin/payment_methods");
const product_price_1 = require("../../../models/schema/admin/product_price");
const customer_1 = require("../../../models/schema/admin/POS/customer");
const Errors_1 = require("../../../Errors");
const response_1 = require("../../../utils/response");
const Financial_Account_1 = require("../../../models/schema/admin/Financial_Account");
const Currency_1 = require("../../../models/schema/admin/Currency");
const pandels_1 = require("../../../models/schema/admin/pandels");
const Country_1 = require("../../../models/schema/admin/Country");
const cashier_1 = require("../../../models/schema/admin/cashier");
const BadRequest_1 = require("../../../Errors/BadRequest");
const Product_Warehouse_1 = require("../../../models/schema/admin/Product_Warehouse");
// get all category 
const getAllCategorys = async (req, res) => {
    const jwtUser = req.user;
    const warehouseId = jwtUser?.warehouse_id;
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    const warehouseProducts = await Product_Warehouse_1.Product_WarehouseModel.find({
        warehouseId: warehouseId,
        quantity: { $gt: 0 },
    }).select("productId");
    const productIds = warehouseProducts.map((wp) => wp.productId);
    // هات المنتجات مع categoryId
    const products = await products_1.ProductModel.find({
        _id: { $in: productIds },
    }).select("categoryId");
    // ✅ categoryId هو Array of ObjectIds
    const categoryIds = [];
    products.forEach((p) => {
        if (p.categoryId && p.categoryId.length > 0) {
            p.categoryId.forEach((catId) => {
                if (catId) {
                    categoryIds.push(catId.toString());
                }
            });
        }
    });
    const uniqueCategoryIds = [...new Set(categoryIds)];
    const category = await category_1.CategoryModel.find({
        _id: { $in: uniqueCategoryIds },
    });
    (0, response_1.SuccessResponse)(res, { message: "Category list", category });
};
exports.getAllCategorys = getAllCategorys;
// ═══════════════════════════════════════════════════════════
// Get All Brands (بالـ Warehouse)
// ═══════════════════════════════════════════════════════════
const getAllBrands = async (req, res) => {
    const jwtUser = req.user;
    const warehouseId = jwtUser?.warehouse_id;
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    const warehouseProducts = await Product_Warehouse_1.Product_WarehouseModel.find({
        warehouseId: warehouseId,
        quantity: { $gt: 0 },
    }).select("productId");
    const productIds = warehouseProducts.map((wp) => wp.productId);
    const products = await products_1.ProductModel.find({
        _id: { $in: productIds },
    }).select("brandId");
    const brandIds = [];
    products.forEach((p) => {
        if (p.brandId) {
            const id = p.brandId?._id?.toString() || p.brandId?.toString();
            if (id)
                brandIds.push(id);
        }
    });
    const uniqueBrandIds = [...new Set(brandIds)];
    const brand = await brand_1.BrandModel.find({
        _id: { $in: uniqueBrandIds },
    });
    (0, response_1.SuccessResponse)(res, { message: "Brand list", brand });
};
exports.getAllBrands = getAllBrands;
// ═══════════════════════════════════════════════════════════
// Get Products By Category (بالـ Warehouse)
// ═══════════════════════════════════════════════════════════
const getProductsByCategory = async (req, res) => {
    const jwtUser = req.user;
    const warehouseId = jwtUser?.warehouse_id;
    const { categoryId } = req.params;
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    const category = await category_1.CategoryModel.findById(categoryId);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    // هات المنتجات الموجودة في المخزن
    const warehouseProducts = await Product_Warehouse_1.Product_WarehouseModel.find({
        warehouseId: warehouseId,
        quantity: { $gt: 0 },
    }).select("productId quantity");
    const productIds = warehouseProducts.map((wp) => wp.productId);
    // ✅ categoryId هو Array عشان كده نستخدم $in
    const products = await products_1.ProductModel.find({
        _id: { $in: productIds },
        categoryId: { $in: [categoryId] },
    })
        .populate("categoryId", "name ar_name")
        .populate("brandId", "name ar_name")
        .lean();
    // إضافة الكمية من المخزن والـ Variations
    const result = await Promise.all(products.map(async (product) => {
        const warehouseStock = warehouseProducts.find((wp) => wp.productId.toString() === product._id.toString());
        const variations = await product_price_1.ProductPriceModel.find({
            productId: product._id,
        }).lean();
        return {
            ...product,
            quantity: warehouseStock?.quantity ?? 0,
            variations,
        };
    }));
    (0, response_1.SuccessResponse)(res, {
        message: "Products list by category",
        products: result,
    });
};
exports.getProductsByCategory = getProductsByCategory;
// ═══════════════════════════════════════════════════════════
// Get Products By Brand (بالـ Warehouse)
// ═══════════════════════════════════════════════════════════
const getProductsByBrand = async (req, res) => {
    const jwtUser = req.user;
    const warehouseId = jwtUser?.warehouse_id;
    const { brandId } = req.params;
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    const brand = await brand_1.BrandModel.findById(brandId);
    if (!brand)
        throw new Errors_1.NotFound("Brand not found");
    // هات المنتجات الموجودة في المخزن
    const warehouseProducts = await Product_Warehouse_1.Product_WarehouseModel.find({
        warehouseId: warehouseId,
        quantity: { $gt: 0 },
    }).select("productId quantity");
    const productIds = warehouseProducts.map((wp) => wp.productId);
    const products = await products_1.ProductModel.find({
        _id: { $in: productIds },
        brandId: brandId,
    })
        .populate("categoryId", "name ar_name")
        .populate("brandId", "name ar_name")
        .lean();
    const result = await Promise.all(products.map(async (product) => {
        const warehouseStock = warehouseProducts.find((wp) => wp.productId.toString() === product._id.toString());
        const variations = await product_price_1.ProductPriceModel.find({
            productId: product._id,
        }).lean();
        return {
            ...product,
            quantity: warehouseStock?.quantity ?? 0,
            variations,
        };
    }));
    (0, response_1.SuccessResponse)(res, {
        message: "Products list by brand",
        products: result,
    });
};
exports.getProductsByBrand = getProductsByBrand;
// ═══════════════════════════════════════════════════════════
// Get Featured Products (بالـ Warehouse)
// ═══════════════════════════════════════════════════════════
const getFeaturedProducts = async (req, res) => {
    const jwtUser = req.user;
    const warehouseId = jwtUser?.warehouse_id;
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    // هات المنتجات الموجودة في المخزن
    const warehouseProducts = await Product_Warehouse_1.Product_WarehouseModel.find({
        warehouseId: warehouseId,
        quantity: { $gt: 0 },
    }).select("productId quantity");
    const productIds = warehouseProducts.map((wp) => wp.productId);
    const products = await products_1.ProductModel.find({
        _id: { $in: productIds },
        is_featured: true,
    })
        .populate("categoryId", "name ar_name")
        .populate("brandId", "name ar_name")
        .lean();
    const result = await Promise.all(products.map(async (product) => {
        const warehouseStock = warehouseProducts.find((wp) => wp.productId.toString() === product._id.toString());
        const variations = await product_price_1.ProductPriceModel.find({
            productId: product._id,
        }).lean();
        return {
            ...product,
            quantity: warehouseStock?.quantity ?? 0,
            variations,
        };
    }));
    (0, response_1.SuccessResponse)(res, {
        message: "Featured products",
        products: result,
    });
};
exports.getFeaturedProducts = getFeaturedProducts;
// get all selections
const getAllSelections = async (req, res) => {
    const warehouses = await Warehouse_1.WarehouseModel.find().select('name');
    const accounts = await Financial_Account_1.BankAccountModel.find({ in_POS: true, status: true }).select('name balance warhouseId');
    const taxes = await Taxes_1.TaxesModel.find().select('name status amount type');
    const discounts = await Discount_1.DiscountModel.find().select('name status amount type');
    const coupons = await coupons_1.CouponModel.find().select('coupon_code amount type minimum_amount quantity available expired_date');
    const giftCards = await giftCard_1.GiftCardModel.find().select('code amount');
    const paymentMethods = await payment_methods_1.PaymentMethodModel.find({ isActive: true }).select('name');
    const customers = await customer_1.CustomerModel.find().select('name phone_number email address');
    const customerGroups = await customer_1.CustomerGroupModel.find().select('name ');
    const dueCustomers = await customer_1.CustomerModel.find({ is_Due: true }).select('name phone_number email address amount_Due');
    const currency = await Currency_1.CurrencyModel.find({ isdefault: true }).select('name  ar_name,amount');
    const countries = await Country_1.CountryModel.find()
        .select("name ar_name")
        .populate({
        path: "cities",
        select: "name ar_name shipingCost", // الحقول اللي ترجع من الـ City
    });
    (0, response_1.SuccessResponse)(res, { message: "Selections list", dueCustomers, countries, warehouses, currency, accounts, taxes, discounts, coupons, giftCards, paymentMethods, customers, customerGroups });
};
exports.getAllSelections = getAllSelections;
// get active bundles (pandels) for POS
const getActiveBundles = async (req, res) => {
    const currentDate = new Date();
    // جلب الـ Bundles النشطة فقط (في نطاق التاريخ)
    const bundles = await pandels_1.PandelModel.find({
        status: true,
        startdate: { $lte: currentDate },
        enddate: { $gte: currentDate },
    }).populate("productsId", "name price image ar_name");
    // حساب السعر الأصلي ونسبة التوفير
    const bundlesWithPricing = bundles.map((bundle) => {
        const products = bundle.productsId;
        // حساب السعر الأصلي (مجموع أسعار المنتجات)
        const originalPrice = products.reduce((sum, product) => {
            return sum + (product.price || 0);
        }, 0);
        // حساب التوفير
        const savings = originalPrice - bundle.price;
        const savingsPercentage = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;
        return {
            _id: bundle._id,
            name: bundle.name,
            images: bundle.images,
            products: products.map((p) => ({
                _id: p._id,
                name: p.name,
                ar_name: p.ar_name,
                price: p.price,
                image: p.image,
            })),
            originalPrice: originalPrice,
            bundlePrice: bundle.price,
            savings: savings,
            savingsPercentage: savingsPercentage,
            startdate: bundle.startdate,
            enddate: bundle.enddate,
        };
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Active bundles",
        bundles: bundlesWithPricing,
    });
};
exports.getActiveBundles = getActiveBundles;
const getCashiers = async (req, res) => {
    const warehouseId = req.user?.warehouse_id;
    if (!warehouseId) {
        throw new Errors_1.NotFound("Warehouse ID is required");
    }
    const cashiers = await cashier_1.CashierModel.find({
        warehouse_id: warehouseId,
        status: true, // لسه موجود في السيستم
        cashier_active: false, // مش حد عامل بيه شيفت دلوقتي
    })
        .populate("warehouse_id", "name")
        .lean();
    (0, response_1.SuccessResponse)(res, {
        cashiers,
    });
};
exports.getCashiers = getCashiers;
const selectCashier = async (req, res) => {
    const warehouseId = req.user?.warehouse_id; // من الـ JWT
    if (!warehouseId) {
        throw new Errors_1.NotFound("Warehouse ID is required");
    }
    const { cashier_id } = req.body;
    if (!cashier_id) {
        throw new BadRequest_1.BadRequest("Cashier ID is required");
    }
    // ✅ نجيب كاشير مش شغال حاليًا في نفس الـ warehouse
    //   بس من غير ما نعدّل cashier_active هنا
    const cashier = await cashier_1.CashierModel.findOne({
        _id: cashier_id,
        warehouse_id: warehouseId,
        status: true,
        cashier_active: false, // نتأكد إنه مش مستخدم في شيفت تاني
    })
        .populate("warehouse_id", "name")
        .lean();
    if (!cashier) {
        throw new Errors_1.NotFound("Cashier not found or already in use");
    }
    // ✅ كل الفايننشيال أكاونتس بتاعة نفس الـ warehouse:
    //    - شغّالة (status = true)
    //    - ظاهرة في الـ POS (in_POS = true)
    const financialAccounts = await Financial_Account_1.BankAccountModel.find({
        warehouseId: warehouseId, // من السكيمة: warehouseId
        status: true,
        in_POS: true,
    })
        .select("_id name image balance description status in_POS warehouseId")
        .lean();
    return (0, response_1.SuccessResponse)(res, {
        message: "Cashier selected successfully",
        cashier,
        financialAccounts, // دي اللي تظهر في شاشة الـ POS
    });
};
exports.selectCashier = selectCashier;
