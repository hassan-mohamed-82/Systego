"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserOrders = exports.getOrderById = exports.getAllOrders = exports.createOrder = void 0;
const Order_1 = require("../../models/schema/users/Order");
const Address_1 = require("../../models/schema/users/Address");
const products_1 = require("../../models/schema/admin/products");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const response_1 = require("../../utils/response");
const handleImages_1 = require("../../utils/handleImages");
exports.createOrder = (0, express_async_handler_1.default)(async (req, res) => {
    const { cartItems, addressData, paymentMethod } = req.body;
    const userId = req.user?.id;
    const base64 = req.body.proofImage;
    const folder = 'payments';
    const imageUrl = await (0, handleImages_1.saveBase64Image)(base64, userId, req, folder);
    // Validate cart items and calculate total price
    let totalPrice = 0;
    const validatedCartItems = [];
    for (const item of cartItems) {
        const product = await products_1.ProductsModel.findById(item.product);
        if (!product) {
            throw new NotFound_1.NotFound(`Product not found with ID: ${item.product}`);
        }
        if (product.stock_worth < item.quantity) {
            throw new BadRequest_1.BadRequest(`Insufficient stock for product: ${product.name}`);
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
    const newAddress = new Address_1.Address({
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
    const order = new Order_1.Order({
        user: userId,
        cartItems: validatedCartItems,
        totalPrice: totalPrice,
        shippingAddress: savedAddress._id,
        paymentMethod: paymentMethod
    });
    const savedOrder = await order.save();
    // Populate the order with related data
    const populatedOrder = await Order_1.Order.findById(savedOrder._id)
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
    return (0, response_1.SuccessResponse)(res, {
        message: 'Order created successfully',
        data: populatedOrder
    }, 201);
});
exports.getAllOrders = (0, express_async_handler_1.default)(async (req, res) => {
    const orders = await Order_1.Order.find()
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
    return (0, response_1.SuccessResponse)(res, {
        message: 'Orders retrieved successfully',
        data: orders
    }, 200);
});
exports.getOrderById = (0, express_async_handler_1.default)(async (req, res) => {
    const id = req.params.id;
    const order = await Order_1.Order.findById(id)
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
        throw new NotFound_1.NotFound('Order not found');
    }
    return (0, response_1.SuccessResponse)(res, {
        message: 'Order retrieved successfully',
        data: order
    }, 200);
});
exports.getUserOrders = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user?.id;
    const orders = await Order_1.Order.find({ user: userId })
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
    return (0, response_1.SuccessResponse)(res, {
        message: 'User orders retrieved successfully',
        data: orders
    }, 200);
});
