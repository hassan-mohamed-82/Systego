"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProduct = exports.deleteProduct = exports.getProductById = exports.getProducts = exports.createproduct = void 0;
const response_1 = require("../utils/response");
const products_1 = require("../models/schema/products");
const handleImages_1 = require("../utils/handleImages");
const BadRequest_1 = require("../Errors/BadRequest");
const Errors_1 = require("../Errors/");
const createproduct = async (req, res) => {
    const { name, code, icon, quantity, brand_id, category_id, unit, price, cost, stock_worth, exp_date, notify_near_expiry } = req.body;
    if (!name || !code || !quantity || !brand_id || !category_id || !unit || !price || !stock_worth || !exp_date || !notify_near_expiry)
        throw new BadRequest_1.BadRequest("All fields are required");
    let imageUrl = "";
    if (icon) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(icon, Date.now().toString(), req, "product");
    }
    const product = await products_1.ProductsModel.create({ name, code, icon: imageUrl, quantity, brand_id, category_id, unit, price, cost, stock_worth, exp_date, notify_near_expiry });
    (0, response_1.SuccessResponse)(res, { message: "create product successfully", product });
};
exports.createproduct = createproduct;
const getProducts = async (req, res) => {
    const products = await products_1.ProductsModel.find({}).populate("brand_id", "brand_name").populate("category_id", "category_name");
    if (!products || products.length === 0)
        throw new Errors_1.NotFound("No products found");
    (0, response_1.SuccessResponse)(res, { message: "get products successfully", products });
};
exports.getProducts = getProducts;
const getProductById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Product id is required");
    const product = await products_1.ProductsModel.findById(id).populate("brand_id", "brand_name").populate("category_id", "category_name");
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
    const product = await products_1.ProductsModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!product)
        throw new Errors_1.NotFound("Product not found");
    (0, response_1.SuccessResponse)(res, { message: "update product successfully", product });
};
exports.updateProduct = updateProduct;
