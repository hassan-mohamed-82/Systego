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

  if (!productId || !categoryId || !discountId)
    throw new BadRequest("All fields are required");

  // تأكد إنهم Arrays حتى لو المستخدم بعت ID واحد
  const productIds = Array.isArray(productId) ? productId : [productId];
  const categoryIds = Array.isArray(categoryId) ? categoryId : [categoryId];

  // تحقق من وجود المنتجات
  const products = await ProductModel.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length)
    throw new BadRequest("Some products not found");

  // تحقق من وجود الفئات
  const categories = await CategoryModel.find({ _id: { $in: categoryIds } });
  if (categories.length !== categoryIds.length)
    throw new BadRequest("Some categories not found");

  // إنشاء العرض
  const offer = await OffersModel.create({
    productId: productIds,
    categoryId: categoryIds,
    discountId,
  });

  return SuccessResponse(res, {
    message: "Create offer successfully",
    offer,
  });
};

export const updateoffer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { productId, categoryId, discountId } = req.body;

  if (!productId || !categoryId || !discountId)
    throw new BadRequest("All fields are required");

  const offer = await OffersModel.findById(id);
  if (!offer) throw new NotFound("Offer not found");

  const productIds = Array.isArray(productId) ? productId : [productId];
  const categoryIds = Array.isArray(categoryId) ? categoryId : [categoryId];

  const products = await ProductModel.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length)
    throw new BadRequest("Some products not found");

  const categories = await CategoryModel.find({ _id: { $in: categoryIds } });
  if (categories.length !== categoryIds.length)
    throw new BadRequest("Some categories not found");

  offer.productId = productIds;
  offer.categoryId = categoryIds;
  offer.discountId = discountId;

  await offer.save();

  return SuccessResponse(res, {
    message: "Update offer successfully",
    offer,
  });
};

export const deleteoffer = async (req: Request, res: Response) => {
    const { id } = req.params;
    const offer = await OffersModel.findByIdAndDelete(id);
    if (!offer) throw new NotFound();
    return SuccessResponse(res, {message: "Delete offer successfully", offer});
};