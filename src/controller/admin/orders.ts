import { Request, Response } from "express";
import { SaleModel } from "../../models/schema/admin/POS/Sale";
import { ProductSalesModel } from "../../models/schema/admin/POS/Sale";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { SuccessResponse } from "../../utils/response";

/**
 * GET /orders
 * Returns all orders with shift, customer, cashier, and amount info
 */
export const getAllOrders = async (req: Request, res: Response) => {
    const orders = await SaleModel.find()
        .populate("customer_id", "name phone_number email")
        .populate("shift_id", "start_time end_time status cashierman_id cashier_id")
        .populate("cashier_id", "name")
        .populate("warehouse_id", "name")
        .sort({ createdAt: -1 });

    SuccessResponse(res, {
        message: "Orders retrieved successfully",
        count: orders.length,
        orders,
    });
};

/**
 * GET /orders/:id
 * Returns a single order with full details including product items
 */
export const getOrderById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const order = await SaleModel.findById(id)
        .populate("customer_id", "name phone_number email address")
        .populate("shift_id", "start_time end_time status cashierman_id cashier_id total_sale_amount total_expenses net_cash_in_drawer")
        .populate("cashier_id", "name")
        .populate("warehouse_id", "name")
        .populate("order_tax")
        .populate("order_discount")
        .populate("coupon_id")
        .populate("gift_card_id");

    if (!order) throw new NotFound("Order not found");

    // Fetch the product items for this order
    const items = await ProductSalesModel.find({ sale_id: id })
        .populate("product_id", "name image")
        .populate("bundle_id", "name")
        .populate("product_price_id");

    SuccessResponse(res, {
        message: "Order retrieved successfully",
        order,
        items,
    });
};

/**
 * GET /orders/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Returns orders within date range plus summary totals
 */
export const getOrdersReport = async (req: Request, res: Response) => {
    const { startDate, endDate, warehouse_id, cashier_id } = req.body;

    if (!startDate || !endDate) {
        throw new BadRequest("startDate and endDate are required");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequest("Invalid date format. Use YYYY-MM-DD");
    }

    if (start > end) {
        throw new BadRequest("startDate must be before endDate");
    }

    // ═══════════════════════════════════════════════════════════
    // 🔍 بناء الفلتر
    // ═══════════════════════════════════════════════════════════
    let filter: any = {
        createdAt: { $gte: start, $lte: end },
    };

    if (warehouse_id) {
        filter.warehouse_id = warehouse_id;
    }

    if (cashier_id) {
        filter.cashier_id = cashier_id;
    }

    // ═══════════════════════════════════════════════════════════
    // 📦 جلب الأوردرات
    // ═══════════════════════════════════════════════════════════
    const orders = await SaleModel.find(filter)
        .populate("customer_id", "name phone_number email")
        .populate("shift_id", "start_time end_time status")
        .populate("cashier_id", "name")
        .populate("warehouse_id", "name")
        .populate("order_tax", "name amount type")
        .populate("order_discount", "name amount type")
        .populate("coupon_id", "coupon_code amount type")
        .sort({ createdAt: -1 })
        .lean();

    if (orders.length === 0) {
        return SuccessResponse(res, {
            message: "No orders found for the given date range",
            startDate: start,
            endDate: end,
            totalOrders: 0,
            summary: {
                totalAmount: 0,
                totalPaid: 0,
                totalDiscount: 0,
                totalTax: 0,
                totalShipping: 0,
                totalDue: 0,
            },
            orders: [],
        });
    }

    // ═══════════════════════════════════════════════════════════
    // 🛒 جلب الـ Items لكل الأوردرات
    // ═══════════════════════════════════════════════════════════
    const orderIds = orders.map((order) => order._id);

    const allItems = await ProductSalesModel.find({
        sale_id: { $in: orderIds },
    })
        .populate("product_id", "name ar_name image code price")
        .populate("bundle_id", "name ar_name image price")
        .populate("product_price_id", "price code")
        .populate("options_id", "name ar_name price")
        .lean();

    // ═══════════════════════════════════════════════════════════
    // 📊 تجميع الـ Items حسب الـ Order
    // ═══════════════════════════════════════════════════════════
    const itemsByOrderId: Record<string, any[]> = {};
    
    for (const item of allItems) {
        const orderId = item.sale_id.toString();
        if (!itemsByOrderId[orderId]) {
            itemsByOrderId[orderId] = [];
        }
        itemsByOrderId[orderId].push({
            _id: item._id,
            product: item.product_id,
            bundle: item.bundle_id,
            product_price: item.product_price_id,
            options: item.options_id,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            isGift: item.isGift,
            isBundle: item.isBundle,
        });
    }

    // ═══════════════════════════════════════════════════════════
    // 📋 دمج الأوردرات مع الـ Items
    // ═══════════════════════════════════════════════════════════
    const ordersWithItems = orders.map((order) => ({
        _id: order._id,
        reference: order.reference,
        date: order.date,
        createdAt: order.createdAt,
        customer: order.customer_id,
        warehouse: order.warehouse_id,
        cashier: order.cashier_id,
        shift: order.shift_id,
        order_tax: order.order_tax,
        order_discount: order.order_discount,
        coupon: order.coupon_id,
        order_pending: order.order_pending,
        Due: order.Due,
        total: order.total,
        tax_amount: order.tax_amount,
        tax_rate: order.tax_rate,
        discount: order.discount,
        shipping: order.shipping,
        grand_total: order.grand_total,
        paid_amount: order.paid_amount,
        remaining_amount: order.remaining_amount,
        note: order.note,
        items: itemsByOrderId[order._id.toString()] || [],
        items_count: (itemsByOrderId[order._id.toString()] || []).length,
    }));

    // ═══════════════════════════════════════════════════════════
    // 📈 حساب الإجماليات
    // ═══════════════════════════════════════════════════════════
    const summary = orders.reduce(
        (acc, order) => {
            acc.totalAmount += order.grand_total || 0;
            acc.totalPaid += order.paid_amount || 0;
            acc.totalDiscount += order.discount || 0;
            acc.totalTax += order.tax_amount || 0;
            acc.totalShipping += order.shipping || 0;
            acc.totalDue += order.remaining_amount || 0;
            return acc;
        },
        {
            totalAmount: 0,
            totalPaid: 0,
            totalDiscount: 0,
            totalTax: 0,
            totalShipping: 0,
            totalDue: 0,
        }
    );

    // ═══════════════════════════════════════════════════════════
    // 📊 إحصائيات إضافية
    // ═══════════════════════════════════════════════════════════
    const completedOrders = orders.filter((o) => o.order_pending === 0).length;
    const pendingOrders = orders.filter((o) => o.order_pending === 1).length;
    const dueOrders = orders.filter((o) => o.Due === 1 && (o.remaining_amount || 0) > 0).length;
    const totalItemsSold = allItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return SuccessResponse(res, {
        message: "Orders report generated successfully",
        startDate: start,
        endDate: end,
        
        summary: {
            totalOrders: orders.length,
            completedOrders,
            pendingOrders,
            dueOrders,
            totalItemsSold,
            totalAmount: Number(summary.totalAmount.toFixed(2)),
            totalPaid: Number(summary.totalPaid.toFixed(2)),
            totalDiscount: Number(summary.totalDiscount.toFixed(2)),
            totalTax: Number(summary.totalTax.toFixed(2)),
            totalShipping: Number(summary.totalShipping.toFixed(2)),
            totalDue: Number(summary.totalDue.toFixed(2)),
        },

        orders: ordersWithItems,
    });
};