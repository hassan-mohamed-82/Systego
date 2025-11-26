"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeaturedProducts = exports.getAllSelections = exports.getProductsByBrand = exports.getProductsByCategory = exports.getAllBrands = exports.getAllCategorys = void 0;
const products_1 = require("../../../models/schema/admin/products");
const category_1 = require("../../../models/schema/admin/category");
const brand_1 = require("../../../models/schema/admin/brand");
const coupons_1 = require("../../../models/schema/admin/coupons");
const Taxes_1 = require("../../../models/schema/admin/Taxes");
const Discount_1 = require("../../../models/schema/admin/Discount");
const Warehouse_1 = require("../../../models/schema/admin/Warehouse");
const giftCard_1 = require("../../../models/schema/admin/POS/giftCard");
const payment_methods_1 = require("../../../models/schema/admin/payment_methods");
const customer_1 = require("../../../models/schema/admin/POS/customer");
const Errors_1 = require("../../../Errors");
const response_1 = require("../../../utils/response");
const Financial_Account_1 = require("../../../models/schema/admin/Financial_Account");
const Currency_1 = require("../../../models/schema/admin/Currency");
// get all category 
const getAllCategorys = async (req, res) => {
    const category = await category_1.CategoryModel.find();
    (0, response_1.SuccessResponse)(res, { message: "Category list", category });
};
exports.getAllCategorys = getAllCategorys;
// get all brand 
const getAllBrands = async (req, res) => {
    const brand = await brand_1.BrandModel.find();
    (0, response_1.SuccessResponse)(res, { message: "Brand list", brand });
};
exports.getAllBrands = getAllBrands;
// get all products by category 
const getProductsByCategory = async (req, res) => {
    const { categoryId } = req.params;
    const category = await category_1.CategoryModel.findById(categoryId);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    const products = await products_1.ProductModel.find({ categoryId: categoryId }).select('name price image ar-name');
    (0, response_1.SuccessResponse)(res, { message: "Products list", products });
};
exports.getProductsByCategory = getProductsByCategory;
// get all products by brand 
const getProductsByBrand = async (req, res) => {
    const { brandId } = req.params;
    const brand = await brand_1.BrandModel.findById(brandId);
    if (!brand)
        throw new Errors_1.NotFound("Brand not found");
    const products = await products_1.ProductModel.find({ brandId: brandId }).select('name price image ar-name');
    (0, response_1.SuccessResponse)(res, { message: "Products list", products });
};
exports.getProductsByBrand = getProductsByBrand;
// get all selections
const getAllSelections = async (req, res) => {
    const warehouses = await Warehouse_1.WarehouseModel.find().select('name');
    const accounts = await Financial_Account_1.BankAccountModel.find({ is_default: true }).select('name account_no ar_name initial_balance icon note is_default');
    const taxes = await Taxes_1.TaxesModel.find().select('name status amount type');
    const discounts = await Discount_1.DiscountModel.find().select('name');
    const coupons = await coupons_1.CouponModel.find().select('coupon_code');
    const giftCards = await giftCard_1.GiftCardModel.find().select('code amount');
    const paymentMethods = await payment_methods_1.PaymentMethodModel.find({ isActive: true }).select('name');
    const customers = await customer_1.CustomerModel.find().select('name');
    const customerGroups = await customer_1.CustomerGroupModel.find().select('name');
    const currency = await Currency_1.CurrencyModel.find().select('name  ar-name');
    (0, response_1.SuccessResponse)(res, { message: "Selections list", warehouses, currency, accounts, taxes, discounts, coupons, giftCards, paymentMethods, customers, customerGroups });
};
exports.getAllSelections = getAllSelections;
// get featured product
const getFeaturedProducts = async (req, res) => {
    const products = await products_1.ProductModel.find({ is_featured: true }).select('name price image ar-name');
    (0, response_1.SuccessResponse)(res, { message: "Featured products", products });
};
exports.getFeaturedProducts = getFeaturedProducts;
