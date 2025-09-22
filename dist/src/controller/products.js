"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProduct = exports.deleteProduct = exports.getProductById = exports.getProducts = exports.createproduct = void 0;
const response_1 = require("../utils/response");
const products_1 = require("../models/schema/products");
const handleImages_1 = require("../utils/handleImages");
const BadRequest_1 = require("../Errors/BadRequest");
const Errors_1 = require("../Errors/");
const mongoose_1 = __importDefault(require("mongoose"));
const brand_1 = require("../models/schema/brand");
const category_1 = require("../models/schema/category");
const barcode_1 = require("../utils/barcode");
const createproduct = async (req, res) => {
    const { name, code, icon, quantity, brand_id, category_id, unit, price, cost, stock_worth, exp_date, notify_near_expiry, barcode_number, } = req.body;
    // ✅ تأكد من الحقول الأساسية
    if (!name ||
        !code ||
        !quantity ||
        !brand_id ||
        !category_id ||
        !unit ||
        !price ||
        !stock_worth ||
        !exp_date ||
        notify_near_expiry === undefined ||
        !barcode_number) {
        throw new BadRequest_1.BadRequest("All fields are required including barcode_number");
    }
    // ✅ تحقق من brand_id
    if (!mongoose_1.default.Types.ObjectId.isValid(brand_id)) {
        throw new BadRequest_1.BadRequest("Invalid brand_id format");
    }
    const brand = await brand_1.BrandModel.findById(brand_id);
    if (!brand)
        throw new Errors_1.NotFound("Brand not found");
    // ✅ تحقق من category_id
    if (!mongoose_1.default.Types.ObjectId.isValid(category_id)) {
        throw new BadRequest_1.BadRequest("Invalid category_id format");
    }
    const category = await category_1.CategoryModel.findById(category_id);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    // ✅ تحقق من عدم تكرار الباركود
    const existingBarcode = await products_1.ProductsModel.findOne({ barcode_number });
    if (existingBarcode) {
        throw new BadRequest_1.BadRequest("Barcode number already exists");
    }
    // ✅ حفظ صورة الايقونة لو موجودة
    let imageUrl = "";
    if (icon) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(icon, Date.now().toString(), req, "product");
    }
    // ✅ توليد صورة الباركود
    const barcodeImage = await (0, barcode_1.generateBarcodeImage)(barcode_number, Date.now().toString());
    // ✅ إنشاء المنتج
    const product = await products_1.ProductsModel.create({
        name,
        code,
        icon: imageUrl,
        quantity,
        brand_id,
        category_id,
        unit,
        price,
        cost,
        stock_worth,
        exp_date,
        notify_near_expiry,
        barcode_number,
        barcode_image: barcodeImage,
    });
    (0, response_1.SuccessResponse)(res, {
        message: "create product successfully",
        product,
    });
};
exports.createproduct = createproduct;
// ✅ باقي CRUD زي ما هي
const getProducts = async (req, res) => {
    const products = await products_1.ProductsModel.find({})
        .populate("brand_id", "name")
        .populate("category_id", "name");
    if (!products || products.length === 0)
        throw new Errors_1.NotFound("No products found");
    (0, response_1.SuccessResponse)(res, { message: "get products successfully", products });
};
exports.getProducts = getProducts;
const getProductById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Product id is required");
    const product = await products_1.ProductsModel.findById(id)
        .populate("brand_id", "name")
        .populate("category_id", "name");
    if (!product)
        throw new Errors_1.NotFound("Product not found");
    (0, response_1.SuccessResponse)(res, { message: "get product successfully", product });
};
exports.getProductById = getProductById;
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Product id is required");
    const product = await products_1.ProductsModel.findByIdAndDelete(id);
    if (!product)
        throw new Errors_1.NotFound("Product not found");
    (0, response_1.SuccessResponse)(res, { message: "delete product successfully" });
};
exports.deleteProduct = deleteProduct;
const updateProduct = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Product id is required");
    // لو الأدمن عدل الباركود لازم نولد صورة جديدة
    let updateData = { ...req.body };
    if (req.body.barcode_number) {
        const barcodeImage = await (0, barcode_1.generateBarcodeImage)(req.body.barcode_number, Date.now().toString());
        updateData.barcode_image = barcodeImage;
    }
    const product = await products_1.ProductsModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!product)
        throw new Errors_1.NotFound("Product not found");
    (0, response_1.SuccessResponse)(res, { message: "update product successfully", product });
};
exports.updateProduct = updateProduct;
