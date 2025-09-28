import { Cart } from '../../models/schema/users/Cart';
import { ProductsModel } from '../../models/schema/admin/products';
import asyncHandler from 'express-async-handler';
import { NotFound } from '../../Errors/NotFound';
import { BadRequest } from '../../Errors/BadRequest';
import { SuccessResponse } from '../../utils/response';

// Get user's cart
export const getCart = asyncHandler(async (req, res) => {
  const  userId  = req.user?.id;

  const cart = await Cart.findOne({ user: userId })
    .populate('cartItems.product', 'name images price stock');

  if (!cart) {
    // Return empty cart if not found
    return SuccessResponse(res, { 
      message: 'Cart retrieved successfully', 
      data: { 
        user: userId, 
        cartItems: [], 
        totalCartPrice: 0 
      } 
    }, 200);
  }

  return SuccessResponse(res, { 
    message: 'Cart retrieved successfully', 
    data: cart 
  }, 200);
});

// Add item to cart
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const  userId  = req.user?.id;

  // Validate required fields
  if (!userId || !productId) {
    throw new BadRequest('Missing required fields: userId, productId');
  }

  // Check if product exists
  const product = await ProductsModel.findById(productId);
  if (!product) {
    throw new NotFound('Product not found');
  }

  // Check stock availability
  if (product.stock_worth < quantity) {
    throw new BadRequest(`Insufficient stock. Only ${product.stock_worth} items available`);
  }

  // Find user's cart or create new one
  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = new Cart({
      user: userId,
      cartItems: []
    });
  }

  // Check if product already exists in cart
  const existingItemIndex = cart.cartItems.findIndex(
    item => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    // Update quantity if product exists
    cart.cartItems[existingItemIndex].quantity += quantity;
    cart.cartItems[existingItemIndex].price = product.price; // Update to current price
  } else {
    // Add new item to cart
    cart.cartItems.push({
      product: productId,
      quantity: quantity,
      price: product.price
    });
  }

  // Save cart (totalCartPrice will be calculated by pre-save hook)
  const savedCart = await cart.save();

  // Populate the cart with product details
  const populatedCart = await Cart.findById(savedCart._id)
    .populate('cartItems.product', 'name icon price stock_worth');

  return SuccessResponse(res, { 
    message: 'Item added to cart successfully', 
    data: populatedCart 
  }, 200);
});

// Update cart item quantity
export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const  userId  = req.user?.id;

  // Validate required fields
  if (!userId || !productId || quantity === undefined) {
    throw new BadRequest('Missing required fields: userId, productId, quantity');
  }

  if (quantity < 1) {
    throw new BadRequest('Quantity must be at least 1');
  }

  // Check if product exists and has sufficient stock
  const product = await ProductsModel.findById(productId);
  if (!product) {
    throw new NotFound('Product not found');
  }

  if (product.stock_worth < quantity) {
    throw new BadRequest(`Insufficient stock. Only ${product.stock_worth} items available`);
  }

  // Find user's cart
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new NotFound('Cart not found');
  }

  // Find the item in cart
  const cartItem = cart.cartItems.find(
    item => item.product.toString() === productId
  );

  if (!cartItem) {
    throw new NotFound('Item not found in cart');
  }

  // Update quantity and price
  cartItem.quantity = quantity;
  cartItem.price = product.price; // Update to current price

  const savedCart = await cart.save();
  const populatedCart = await Cart.findById(savedCart._id)
    .populate('cartItems.product', 'name images price stock');

  return SuccessResponse(res, { 
    message: 'Cart item updated successfully', 
    data: populatedCart 
  }, 200);
});

// Remove item from cart
export const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const  userId  = req.user?.id;

  // Validate required fields
  if (!userId || !productId) {
    throw new BadRequest('Missing required fields: userId, productId');
  }

  // Find user's cart
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new NotFound('Cart not found');
  }

  // Remove item from cart
cart.cartItems = cart.cartItems.filter(
  item => item.product.toString() !== productId
) as any;



  const savedCart = await cart.save();
  const populatedCart = await Cart.findById(savedCart._id)
    .populate('cartItems.product', 'name images price stock');

  return SuccessResponse(res, { 
    message: 'Item removed from cart successfully', 
    data: populatedCart 
  }, 200);
});

// Clear entire cart (delete cart document)
export const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new NotFound('Cart not found');
  }

  // Delete the entire cart document
  await Cart.findByIdAndDelete(cart._id);

  return SuccessResponse(res, { 
    message: 'Cart deleted successfully'
  }, 200);
});