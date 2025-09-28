import { Order } from '../../models/schema/users/Order';
import { Address } from '../../models/schema/users/Address';
import { ProductsModel } from '../../models/schema/admin/products';
import asyncHandler from 'express-async-handler';
import { NotFound } from '../../Errors/NotFound';
import { BadRequest } from '../../Errors/BadRequest';
import { SuccessResponse } from '../../utils/response';
import { saveBase64Image } from '../../utils/handleImages';

export const createOrder = asyncHandler(async (req, res) => {
  const { cartItems, addressData, paymentMethod } = req.body;
const  userId  = req.user?.id as string;
  const base64 = req.body.proofImage;
    const folder = 'payments';
    const imageUrl = await saveBase64Image(base64, userId, req, folder);

  // Validate cart items and calculate total price
  let totalPrice = 0;
  const validatedCartItems = [];

  for (const item of cartItems) {
    const product = await ProductsModel.findById(item.product);
    if (!product) {
      throw new NotFound(`Product not found with ID: ${item.product}`);
    }

    if (product.stock_worth < item.quantity) {
      throw new BadRequest(`Insufficient stock for product: ${product.name}`);
    }

    const itemPrice = product.price * item.quantity;
    totalPrice += itemPrice;

    validatedCartItems.push({
      product: item.product,
      quantity: item.quantity,
      price: product.price // Store current price at time of order
    });
  }

  // Create new address
  const newAddress = new Address({
    country: addressData.country,
    city: addressData.city,
    zone: addressData.zone,
    street: addressData.street,
    buildingNumber: addressData.buildingNumber,
    floorNumber: addressData.floorNumber,
    apartmentNumber: addressData.apartmentNumber,
    uniqueIdentifier: addressData.uniqueIdentifier
  });

  const savedAddress = await newAddress.save();

  // Create order
  const order = new Order({
    user: userId,
    cartItems: validatedCartItems,
    totalPrice: totalPrice,
    shippingAddress: savedAddress._id, 
    paymentMethod: paymentMethod
  });

  const savedOrder = await order.save();

  // Populate the order with related data
  const populatedOrder = await Order.findById(savedOrder._id)
    .populate('user', 'name email phone')
    .populate('cartItems.product', 'name images price')
    .populate({
      path: 'shippingAddress',
      populate: [
        { path: 'country', select: 'name' },
        { path: 'city', select: 'name' },
        { path: 'zone', select: 'name' }
      ]
    });

  return SuccessResponse(res, { 
    message: 'Order created successfully', 
    data: populatedOrder 
  }, 201);
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate('user', 'name email')
    .populate('cartItems.product', 'name images')
    .populate({
      path: 'shippingAddress',
      populate: [
        { path: 'country', select: 'name' },
        { path: 'city', select: 'name' },
        { path: 'zone', select: 'name' }
      ]
    })
    .sort({ createdAt: -1 });

  return SuccessResponse(res, { 
    message: 'Orders retrieved successfully', 
    data: orders 
  }, 200);
});

export const getOrderById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const order = await Order.findById(id)
    .populate('user', 'name email phone')
    .populate('cartItems.product', 'name images price description')
    .populate({
      path: 'shippingAddress',
      populate: [
        { path: 'country', select: 'name code' },
        { path: 'city', select: 'name' },
        { path: 'zone', select: 'name' }
      ]
    });

  if (!order) {
    throw new NotFound('Order not found');
  }

  return SuccessResponse(res, { 
    message: 'Order retrieved successfully', 
    data: order 
  }, 200);
});

export const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  
  const orders = await Order.find({ user: userId })
    .populate('cartItems.product', 'name images')
    .populate({
      path: 'shippingAddress',
      populate: [
        { path: 'country', select: 'name' },
        { path: 'city', select: 'name' },
        { path: 'zone', select: 'name' }
      ]
    })
    .sort({ createdAt: -1 });

  return SuccessResponse(res, { 
    message: 'User orders retrieved successfully', 
    data: orders 
  }, 200);
});