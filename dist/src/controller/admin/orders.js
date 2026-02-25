"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrdersReport = exports.getOrderById = exports.getAllOrders = void 0;
const Sale_1 = require("../../models/schema/admin/POS/Sale");
const Sale_2 = require("../../models/schema/admin/POS/Sale");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
/**
 * GET /orders
 * Returns all orders with shift, customer, cashier, and amount info
 */
const getAllOrders = async (req, res) => {
    const orders = await Sale_1.SaleModel.find()
        .populate("customer_id", "name phone_number email")
        .populate("shift_id", "start_time end_time status cashierman_id cashier_id")
        .populate("cashier_id", "username")
        .populate("warehouse_id", "name")
        .populate("account_id", "name balance")
        .populate("order_tax")
        .populate("order_discount")
        .populate("coupon_id")
        .populate("gift_card_id")
        .sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, {
        message: "Orders retrieved successfully",
        count: orders.length,
        orders,
    });
};
exports.getAllOrders = getAllOrders;
/**
 * GET /orders/:id
 * Returns a single order with full details including product items
 */
const getOrderById = async (req, res) => {
    const { id } = req.params;
    const order = await Sale_1.SaleModel.findById(id)
        .populate("customer_id", "name phone_number email address")
        .populate("shift_id", "start_time end_time status cashierman_id cashier_id total_sale_amount total_expenses net_cash_in_drawer")
        .populate("cashier_id", "username")
        .populate("warehouse_id", "name")
        .populate("account_id", "name balance")
        .populate("order_tax")
        .populate("order_discount")
        .populate("coupon_id")
        .populate("gift_card_id");
    if (!order)
        throw new NotFound_1.NotFound("Order not found");
    // Fetch the product items for this order
    const items = await Sale_2.ProductSalesModel.find({ sale_id: id })
        .populate("product_id", "name image")
        .populate("bundle_id", "name")
        .populate("product_price_id");
    (0, response_1.SuccessResponse)(res, {
        message: "Order retrieved successfully",
        order,
        items,
    });
};
exports.getOrderById = getOrderById;
/**
 * GET /orders/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Returns orders within date range plus summary totals
 */
const getOrdersReport = async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        throw new BadRequest_1.BadRequest("startDate and endDate query parameters are required");
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequest_1.BadRequest("Invalid date format. Use YYYY-MM-DD");
    }
    if (start > end) {
        throw new BadRequest_1.BadRequest("startDate must be before endDate");
    }
    const orders = await Sale_1.SaleModel.find({
        createdAt: { $gte: start, $lte: end },
    })
        .populate("customer_id", "name phone_number email")
        .populate("shift_id", "start_time end_time status cashierman_id cashier_id")
        .populate("cashier_id", "username")
        .populate("warehouse_id", "name")
        .populate("account_id", "name balance")
        .populate("order_tax")
        .populate("order_discount")
        .populate("gift_card_id")
        .sort({ createdAt: -1 });
    // Calculate summary totals
    const summary = orders.reduce((acc, order) => {
        acc.totalAmount += order.grand_total || 0;
        acc.totalPaid += order.paid_amount || 0;
        acc.totalDiscount += order.discount || 0;
        acc.totalTax += order.tax_amount || 0;
        acc.totalShipping += order.shipping || 0;
        return acc;
    }, {
        totalAmount: 0,
        totalPaid: 0,
        totalDiscount: 0,
        totalTax: 0,
        totalShipping: 0,
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Orders report generated successfully",
        startDate: start,
        endDate: end,
        totalOrders: orders.length,
        summary,
        orders,
    });
};
exports.getOrdersReport = getOrdersReport;
