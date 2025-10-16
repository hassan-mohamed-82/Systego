import { Request, Response } from "express";
import { OffersModel } from "../../models/schema/admin/Offers";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { saveBase64Image } from "../../utils/handleImages";
import { CategoryModel } from "../../models/schema/admin/category";
import { ProductModel } from "../../models/schema/admin/products";

export const getOffer = async (req: Request, res: Response) => {
    const { id } = req.params;
    const offer = await OffersModel.findById(id);
    if (!offer) throw new NotFound();
    return SuccessResponse(res, {message: "Get offer successfully", offer});
};

export const getOffers = async (req: Request, res: Response) => {
    const offers = await OffersModel.find();
    if (!offers || offers.length === 0) throw new NotFound();
    SuccessResponse(res, {message: "Get offers successfully", offers});
};

export const createoffers = async (req: Request, res: Response) => {
    const { productId, categoryId, discountId } = req.body;
    if (!productId || !categoryId || !discountId) throw new BadRequest("All fields are required");
    const existproduct = await ProductModel.findById(productId);
    if (!existproduct) throw new BadRequest("Product not found");
    const existcategory = await CategoryModel.findById(categoryId);
    if (!existcategory) throw new BadRequest("Category not found");
    const offer = await OffersModel.create({ productId, categoryId, discountId });
    return SuccessResponse(res, {message: "Create offer successfully", offer});
};

export const updateoffer = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { productId, categoryId, discountId } = req.body;
    if (!productId || !categoryId || !discountId) throw new BadRequest("All fields are required");
    const offer = await OffersModel.findById(id);
    if (!offer) throw new NotFound();
    const existproduct = await ProductModel.findById(productId);
    if (!existproduct) throw new BadRequest("Product not found");
    const existcategory = await CategoryModel.findById(categoryId);
    if (!existcategory) throw new BadRequest("Category not found");
    offer.productId = productId;
    offer.categoryId = categoryId;
    offer.discountId = discountId;
    await offer.save();
    return SuccessResponse(res, {message: "Update offer successfully", offer});
};

export const deleteoffer = async (req: Request, res: Response) => {
    const { id } = req.params;
    const offer = await OffersModel.findByIdAndDelete(id);
    if (!offer) throw new NotFound();
    return SuccessResponse(res, {message: "Delete offer successfully", offer});
};