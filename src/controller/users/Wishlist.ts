import { Request, Response } from "express";
import { CustomerModel } from '../../models/schema/admin/POS/customer';
import { ProductModel } from '../../models/schema/admin/products';
import asyncHandler from 'express-async-handler';
import { NotFound } from '../../Errors/NotFound';
import { BadRequest } from '../../Errors/BadRequest';
import { SuccessResponse } from '../../utils/response';
import { Types } from 'mongoose';

// --- 1. Toggle Product in Wishlist (Add or Remove) ---
export const toggleWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.body;
  const userId = req.user?.id;

  if (!productId) throw new BadRequest('Product ID is required');

  const user = await CustomerModel.findById(userId);
  if (!user) throw new NotFound('User not found');

  // Check if product exists in DB
  const productExists = await ProductModel.exists({ _id: productId });
  if (!productExists) throw new NotFound('Product not found in store');

  const productObjectId = new Types.ObjectId(productId);
  const isWishlisted = user.wishlist.some(id => id.toString() === productId);

  let message = "";
  if (isWishlisted) {
    // Remove if exists
    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    message = 'Product removed from wishlist';
  } else {
    // Add if not exists
    user.wishlist.push(productObjectId as any);
    message = 'Product added to wishlist';
  }

  await user.save();

  SuccessResponse(res, {
    message: isWishlisted ? "Product removed from wishlist successfully" : "Product added to wishlist successfully"
  }, 200);
  return;
});

// --- 2. Get User's Wishlist (Populated) ---
export const getUserWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  const user = await CustomerModel.findById(userId)
    .populate({
      path: 'wishlist',
    });

  if (!user) throw new NotFound('User not found');

  SuccessResponse(res, {
    message: 'Wishlist retrieved successfully',
    data: user.wishlist
  }, 200);
  return;
});

// --- 3. Check Status (For single product) ---
export const checkProductInWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params;
  const userId = req.user?.id;

  const user = await CustomerModel.findById(userId);
  if (!user) throw new NotFound('User not found');

  const isInWishlist = user.wishlist.some(id => id.toString() === productId);

  SuccessResponse(res, {
    message: 'Product wishlist status retrieved',
    data: { isInWishlist, productId }
  }, 200);
  return;
});

// --- 4. Clear Entire Wishlist ---
export const clearWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  const user = await CustomerModel.findByIdAndUpdate(
    userId,
    { $set: { wishlist: [] } },
    { new: true }
  );

  if (!user) throw new NotFound('User not found');

  SuccessResponse(res, {
    message: 'Wishlist cleared successfully',
    data: []
  }, 200);
  return;
});