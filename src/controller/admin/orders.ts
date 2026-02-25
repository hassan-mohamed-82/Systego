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
        .populate("cashier_id", "username")
        .populate("warehouse_id", "name")
        .populate("account_id", "name balance")
        .populate("order_tax")
        .populate("order_discount")
        .populate("coupon_id")
        .populate("gift_card_id")
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
        .populate("cashier_id", "username")
        .populate("warehouse_id", "name")
        .populate("account_id", "name balance")
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
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    if (!startDate || !endDate) {
        throw new BadRequest("startDate and endDate query parameters are required");
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequest("Invalid date format. Use YYYY-MM-DD");
    }

    if (start > end) {
        throw new BadRequest("startDate must be before endDate");
    }

    const orders = await SaleModel.find({
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
    const summary = orders.reduce(
        (acc, order) => {
            acc.totalAmount += order.grand_total || 0;
            acc.totalPaid += order.paid_amount || 0;
            acc.totalDiscount += order.discount || 0;
            acc.totalTax += order.tax_amount || 0;
            acc.totalShipping += order.shipping || 0;
            return acc;
        },
        {
            totalAmount: 0,
            totalPaid: 0,
            totalDiscount: 0,
            totalTax: 0,
            totalShipping: 0,
        }
    );

    SuccessResponse(res, {
        message: "Orders report generated successfully",
        startDate: start,
        endDate: end,
        totalOrders: orders.length,
        summary,
        orders,
    });
};
