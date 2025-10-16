"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteoffer = exports.updateoffer = exports.createoffers = exports.getOffers = exports.getOffer = void 0;
const Offers_1 = require("../../models/schema/admin/Offers");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const category_1 = require("../../models/schema/admin/category");
const products_1 = require("../../models/schema/admin/products");
const getOffer = async (req, res) => {
    const { id } = req.params;
    const offer = await Offers_1.OffersModel.findById(id);
    if (!offer)
        throw new Errors_1.NotFound();
    return (0, response_1.SuccessResponse)(res, { message: "Get offer successfully", offer });
};
exports.getOffer = getOffer;
const getOffers = async (req, res) => {
    const offers = await Offers_1.OffersModel.find();
    if (!offers || offers.length === 0)
        throw new Errors_1.NotFound();
    (0, response_1.SuccessResponse)(res, { message: "Get offers successfully", offers });
};
exports.getOffers = getOffers;
const createoffers = async (req, res) => {
    const { productId, categoryId, discountId } = req.body;
    if (!productId || !categoryId || !discountId)
        throw new BadRequest_1.BadRequest("All fields are required");
    const existproduct = await products_1.ProductModel.findById(productId);
    if (!existproduct)
        throw new BadRequest_1.BadRequest("Product not found");
    const existcategory = await category_1.CategoryModel.findById(categoryId);
    if (!existcategory)
        throw new BadRequest_1.BadRequest("Category not found");
    const offer = await Offers_1.OffersModel.create({ productId, categoryId, discountId });
    return (0, response_1.SuccessResponse)(res, { message: "Create offer successfully", offer });
};
exports.createoffers = createoffers;
const updateoffer = async (req, res) => {
    const { id } = req.params;
    const { productId, categoryId, discountId } = req.body;
    if (!productId || !categoryId || !discountId)
        throw new BadRequest_1.BadRequest("All fields are required");
    const offer = await Offers_1.OffersModel.findById(id);
    if (!offer)
        throw new Errors_1.NotFound();
    const existproduct = await products_1.ProductModel.findById(productId);
    if (!existproduct)
        throw new BadRequest_1.BadRequest("Product not found");
    const existcategory = await category_1.CategoryModel.findById(categoryId);
    if (!existcategory)
        throw new BadRequest_1.BadRequest("Category not found");
    offer.productId = productId;
    offer.categoryId = categoryId;
    offer.discountId = discountId;
    await offer.save();
    return (0, response_1.SuccessResponse)(res, { message: "Update offer successfully", offer });
};
exports.updateoffer = updateoffer;
const deleteoffer = async (req, res) => {
    const { id } = req.params;
    const offer = await Offers_1.OffersModel.findByIdAndDelete(id);
    if (!offer)
        throw new Errors_1.NotFound();
    return (0, response_1.SuccessResponse)(res, { message: "Delete offer successfully", offer });
};
exports.deleteoffer = deleteoffer;
