"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOnlineOrderStatus = exports.getOnlineOrderById = exports.getAllOnlineOrders = void 0;
const Order_1 = require("../../models/schema/users/Order");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
/**
 * GET /admin/online-orders
 * جلب كل الأوردرات الأونلاين مع بيانات اليوزر ووسيلة الدفع
 */
const getAllOnlineOrders = async (req, res) => {
    const { status } = req.query;
    const filter = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
        filter.status = status;
    }
    const orders = await Order_1.OrderModel.find(filter)
        .populate("user", "name email phone")
        .populate("paymentMethod", "name ar_name type")
        .populate("cartItems.product", "name image price")
        .sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, {
        message: "Online orders retrieved successfully",
        count: orders.length,
        orders,
    });
};
exports.getAllOnlineOrders = getAllOnlineOrders;
/**
 * GET /admin/online-orders/:id
 * جلب تفاصيل أوردر أونلاين معين
 */
const getOnlineOrderById = async (req, res) => {
    const { id } = req.params;
    const order = await Order_1.OrderModel.findById(id)
        .populate("user", "name email phone")
        .populate("paymentMethod", "name ar_name type")
        .populate("cartItems.product", "name image price");
    if (!order)
        throw new Errors_1.NotFound("Order not found");
    (0, response_1.SuccessResponse)(res, {
        message: "Order retrieved successfully",
        order,
    });
};
exports.getOnlineOrderById = getOnlineOrderById;
/**
 * PATCH /admin/online-orders/:id/status
 * تغيير حالة الأوردر (approved / rejected)
 */
const updateOnlineOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !["pending", "approved", "rejected"].includes(status)) {
        throw new Errors_1.NotFound("Invalid status. Must be: pending, approved, or rejected");
    }
    const order = await Order_1.OrderModel.findByIdAndUpdate(id, { status }, { new: true })
        .populate("user", "name email phone")
        .populate("paymentMethod", "name ar_name type");
    if (!order)
        throw new Errors_1.NotFound("Order not found");
    (0, response_1.SuccessResponse)(res, {
        message: `Order status updated to ${status}`,
        order,
    });
};
exports.updateOnlineOrderStatus = updateOnlineOrderStatus;
