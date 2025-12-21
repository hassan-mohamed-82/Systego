"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletemanybrands = exports.deleteBrand = exports.updateBrand = exports.createBrand = exports.getBrandById = exports.getBrands = void 0;
const response_1 = require("../../utils/response");
const brand_1 = require("../../models/schema/admin/brand");
const handleImages_1 = require("../../utils/handleImages");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors/");
const category_1 = require("../../models/schema/admin/category");
const products_1 = require("../../models/schema/admin/products");
const getBrands = async (req, res) => {
    const brands = await brand_1.BrandModel.find();
    if (!brands || brands.length === 0)
        throw new Errors_1.NotFound("No brands found");
    (0, response_1.SuccessResponse)(res, { message: "get all brands successfully", brands });
};
exports.getBrands = getBrands;
const getBrandById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Brand id is required");
    const brand = await brand_1.BrandModel.findById(id);
    if (!brand)
        throw new Errors_1.NotFound("Brand not found");
    (0, response_1.SuccessResponse)(res, { message: "get brand successfully", brand });
};
exports.getBrandById = getBrandById;
const createBrand = async (req, res) => {
    const { name, logo, ar_name } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Brand name is required");
    const existingBrand = await brand_1.BrandModel.findOne({ name });
    if (existingBrand)
        throw new BadRequest_1.BadRequest("Brand already exists");
    let logoUrl = "";
    if (logo) {
        logoUrl = await (0, handleImages_1.saveBase64Image)(logo, Date.now().toString(), req, "brands");
    }
    const brand = await brand_1.BrandModel.create({ name, ar_name, logo: logoUrl });
    (0, response_1.SuccessResponse)(res, { message: "create brand successfully", brand });
};
exports.createBrand = createBrand;
const updateBrand = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Brand id is required");
    const brand = await brand_1.BrandModel.findById(id);
    if (!brand)
        throw new Errors_1.NotFound("Brand not found");
    const { name, ar_name, logo } = req.body;
    if (name !== undefined)
        brand.name = name;
    if (ar_name !== undefined)
        brand.ar_name = ar_name;
    if (logo) {
        brand.logo = await (0, handleImages_1.saveBase64Image)(logo, Date.now().toString(), req, "brands");
    }
    await brand.save();
    (0, response_1.SuccessResponse)(res, { message: "Brand updated successfully", brand });
};
exports.updateBrand = updateBrand;
const deleteBrand = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Brand id is required");
    const brand = await brand_1.BrandModel.findByIdAndDelete(id);
    if (!brand)
        throw new Errors_1.NotFound("Brand not found");
    (0, response_1.SuccessResponse)(res, { message: "delete brand successfully" });
};
exports.deleteBrand = deleteBrand;
const deletemanybrands = async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new BadRequest_1.BadRequest("At least one brand ID is required");
    }
    // 1️⃣ هات كل الـ Categories اللي تابعة للـ Brands دي
    const categories = await category_1.CategoryModel.find({ brand_id: { $in: ids } });
    const categoryIds = categories.map(cat => cat._id);
    // 2️⃣ امسح كل الـ Products اللي تابعة للـ Categories دي
    const productsResult = await products_1.ProductModel.deleteMany({ category_id: { $in: categoryIds } });
    // 3️⃣ امسح الـ Categories
    const categoriesResult = await category_1.CategoryModel.deleteMany({ brand_id: { $in: ids } });
    // 4️⃣ امسح الـ Brands نفسها
    const brandsResult = await brand_1.BrandModel.deleteMany({ _id: { $in: ids } });
    (0, response_1.SuccessResponse)(res, {
        message: "Brands, categories and products deleted successfully",
        deletedBrands: brandsResult.deletedCount,
        deletedCategories: categoriesResult.deletedCount,
        deletedProducts: productsResult.deletedCount
    });
};
exports.deletemanybrands = deletemanybrands;
