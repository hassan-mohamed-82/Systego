import { Platform_User } from '../../models/schema/users/platformUser';
import { ProductModel } from '../../models/schema/admin/products';
import asyncHandler from 'express-async-handler';
import { NotFound } from '../../Errors/NotFound';
import { BadRequest } from '../../Errors/BadRequest';
import { SuccessResponse } from '../../utils/response';
import { Types } from 'mongoose';
// Add product to user's wishlist
export const addProductToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const  userId  = req.user?.id;

  // Validate required fields
  if (!userId || !productId) {
    throw new BadRequest('Missing required fields: userId, productId');
  }

  // Check if user exists
  const user = await Platform_User.findById(userId);
  if (!user) {
    throw new NotFound('User not found');
  }

  // Check if product exists
  const product = await ProductModel.findById(productId);
  if (!product) {
    throw new NotFound('Product not found');
  }

  // Check if product is already in wishlist
  if (user.wishlist.includes(productId)) {
    throw new BadRequest('Product already in wishlist');
  }

  // Add product to wishlist
  user.wishlist.push(productId);
  const updatedUser = await user.save();

  // Populate wishlist with product details
  const populatedUser = await Platform_User.findById(updatedUser._id)
  .populate('wishlist', 'name images price stock category');

return SuccessResponse(res, { 
  message: 'Product added to wishlist successfully', 
  data: populatedUser?.wishlist ?? [] // Use optional chaining and provide a default value if populatedUser is null
}, 200);
});

// Remove product from user's wishlist
export const removeProductFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const  userId  = req.user?.id;

  // Validate required fields
  if (!userId || !productId) {
    throw new BadRequest('Missing required fields: userId, productId');
  }

  // Check if user exists
  const user = await Platform_User.findById(userId);
  if (!user) {
    throw new NotFound('User not found');
  }

  // Check if product exists in wishlist
  if (!user.wishlist.includes(productId)) {
    throw new NotFound('Product not found in wishlist');
  }

  // Remove product from wishlist
  user.wishlist = user.wishlist.filter(
    item => item.toString() !== productId
  );
  const updatedUser = await user.save();

  // Populate wishlist with product details
const populatedUser = await Platform_User.findById(updatedUser._id)
  .populate('wishlist', 'name images price stock category');

return SuccessResponse(res, { 
  message: 'Product removed from wishlist successfully', 
  data: populatedUser?.wishlist ?? [] // Use optional chaining and provide a default value if populatedUser is null
}, 200);
});

// Get user's wishlist
export const getUserWishlist = asyncHandler(async (req, res) => {
  const  userId  = req.user?.id;

  // Validate required field
  if (!userId) {
    throw new BadRequest('User ID is required');
  }

  // Check if user exists and populate wishlist
  const user = await Platform_User.findById(userId)
    .populate('wishlist', 'name images price stock category discount');

  if (!user) {
    throw new NotFound('User not found');
  }

  return SuccessResponse(res, { 
    message: 'Wishlist retrieved successfully', 
    data: user.wishlist 
  }, 200);
});

// Check if product is in user's wishlist
export const checkProductInWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const  userId  = req.user?.id;

  // Validate required fields
  if (!userId || !productId) {
    throw new BadRequest('Missing required fields: userId, productId');
  }

  // Check if user exists
  const user = await Platform_User.findById(userId);
  if (!user) {
    throw new NotFound('User not found');
  }

  // Check if product exists in wishlist
const isInWishlist = user.wishlist.includes(new Types.ObjectId(productId));

  return SuccessResponse(res, { 
    message: 'Product wishlist status retrieved successfully', 
    data: { isInWishlist, productId } 
  }, 200);
});

// Clear user's entire wishlist
export const clearWishlist = asyncHandler(async (req, res) => {
  const  userId  = req.user?.id;

  // Validate required field
  if (!userId) {
    throw new BadRequest('User ID is required');
  }

  // Check if user exists
  const user = await Platform_User.findById(userId);
  if (!user) {
    throw new NotFound('User not found');
  }

  // Clear wishlist
  user.wishlist = [];
  const updatedUser = await user.save();

  return SuccessResponse(res, { 
    message: 'Wishlist cleared successfully', 
    data: updatedUser.wishlist 
  }, 200);
});