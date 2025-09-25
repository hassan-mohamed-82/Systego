"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProductCode = exports.generateBarcodeImageController = exports.updateProduct = exports.createProduct = exports.deleteProduct = exports.getProductById = exports.getProducts = void 0;
const response_1 = require("../../utils/response");
const products_1 = require("../../models/schema/admin/products");
const handleImages_1 = require("../../utils/handleImages");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors/");
const mongoose_1 = __importDefault(require("mongoose"));
const brand_1 = require("../../models/schema/admin/brand");
const category_1 = require("../../models/schema/admin/category");
const barcode_1 = require("../../utils/barcode");
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
const createProduct = async (req, res) => {
    const { name, code, // لازم المستخدم يدخل الكود أو يضغط زرار generate
    icon, quantity, brand_id, category_id, unit, price, cost, stock_worth, exp_date, notify_near_expiry, } = req.body;
    if (!name || !code || !quantity || !brand_id || !category_id || !unit || !price || !stock_worth || !exp_date || notify_near_expiry === undefined) {
        throw new BadRequest_1.BadRequest("All fields are required and code cannot be empty. Use generate button if needed.");
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(brand_id))
        throw new BadRequest_1.BadRequest("Invalid brand_id format");
    const brand = await brand_1.BrandModel.findById(brand_id);
    if (!brand)
        throw new Errors_1.NotFound("Brand not found");
    if (!mongoose_1.default.Types.ObjectId.isValid(category_id))
        throw new BadRequest_1.BadRequest("Invalid category_id format");
    const category = await category_1.CategoryModel.findById(category_id);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    // التأكد من أن الكود فريد
    const exists = await products_1.ProductsModel.findOne({ code });
    if (exists)
        throw new BadRequest_1.BadRequest("Product code already exists");
    let imageUrl = "";
    if (icon) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(icon, Date.now().toString(), req, "product");
    }
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
    });
    (0, response_1.SuccessResponse)(res, { message: "Create product successfully", product });
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Product id is required");
    const updateData = { ...req.body };
    if (updateData.code) {
        const exists = await products_1.ProductsModel.findOne({
            code: updateData.code,
            _id: { $ne: id }
        });
        if (exists)
            throw new BadRequest_1.BadRequest("Product code already exists");
    }
    const product = await products_1.ProductsModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!product)
        throw new Errors_1.NotFound("Product not found");
    (0, response_1.SuccessResponse)(res, { message: "Update product successfully", product });
};
exports.updateProduct = updateProduct;
const generateBarcodeImageController = async (req, res) => {
    try {
        const { product_id } = req.params;
        if (!product_id)
            throw new BadRequest_1.BadRequest("Product ID is required");
        const product = await products_1.ProductsModel.findById(product_id);
        if (!product)
            throw new Errors_1.NotFound("Product not found");
        const productCode = product.code;
        const imageLink = await (0, barcode_1.generateBarcodeImage)(productCode, productCode);
        const fullImageUrl = `${req.protocol}://${req.get("host")}${imageLink}`;
        res.status(200).json({ success: true, barcode: fullImageUrl });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};
exports.generateBarcodeImageController = generateBarcodeImageController;
const generateProductCode = async (req, res) => {
    let newCode = (0, barcode_1.generateEAN13Barcode)();
    // التأكد من عدم التكرار
    while (await products_1.ProductsModel.findOne({ code: newCode })) {
        newCode = (0, barcode_1.generateEAN13Barcode)();
    }
    (0, response_1.SuccessResponse)(res, { code: newCode });
};
exports.generateProductCode = generateProductCode;
