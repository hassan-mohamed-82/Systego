"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addReceivableTransaction = exports.getReceivables = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Sale_1 = require("../../models/schema/admin/POS/Sale");
const customer_1 = require("../../models/schema/admin/POS/customer");
const payment_1 = require("../../models/schema/admin/POS/payment");
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const getReceivables = async (req, res) => {
    const jwtUser = req.user;
    const warehouseId = jwtUser?.warehouse_id;
    const { customer_id, status, from, to, page = 1, limit = 50, search } = req.query;
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    const filter = {
        Due: 1,
        warehouse_id: warehouseId,
    };
    if (customer_id) {
        if (!mongoose_1.default.Types.ObjectId.isValid(String(customer_id))) {
            throw new BadRequest_1.BadRequest("Invalid customer_id");
        }
        filter.Due_customer_id = customer_id;
    }
    if (status === "later" || status === "pending") {
        filter.remaining_amount = { $gt: 0 };
    }
    else if (status === "full" || status === "paid") {
        filter.remaining_amount = { $lte: 0 };
    }
    if (from || to) {
        filter.date = {};
        if (from)
            filter.date.$gte = new Date(String(from));
        if (to)
            filter.date.$lte = new Date(new Date(String(to)).setHours(23, 59, 59, 999));
    }
    const sales = await Sale_1.SaleModel.find(filter)
        .select("Due_customer_id grand_total paid_amount remaining_amount")
        .populate("Due_customer_id", "name phone_number")
        .sort({ createdAt: -1 })
        .lean();
    const grouped = new Map();
    for (const sale of sales) {
        const customer = sale.Due_customer_id;
        if (!customer?._id)
            continue;
        const key = String(customer._id);
        if (!grouped.has(key)) {
            grouped.set(key, {
                customer_id: customer._id,
                type: "Customer",
                client: customer.name || "N/A",
                phone: customer.phone_number || "N/A",
                total_amount: 0,
                paid: 0,
                remaining: 0,
                status: "later",
            });
        }
        const row = grouped.get(key);
        row.total_amount += Number(sale.grand_total || 0);
        row.paid += Number(sale.paid_amount || 0);
        row.remaining += Number(sale.remaining_amount || 0);
    }
    let rows = Array.from(grouped.values()).map((row) => ({
        ...row,
        status: row.remaining > 0 ? "later" : "full",
    }));
    if (search) {
        const keyword = String(search).toLowerCase().trim();
        rows = rows.filter((r) => String(r.client || "").toLowerCase().includes(keyword) ||
            String(r.phone || "").toLowerCase().includes(keyword));
    }
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Number(limit) || 50);
    const start = (pageNumber - 1) * pageSize;
    const paginated = rows.slice(start, start + pageSize);
    return (0, response_1.SuccessResponse)(res, {
        message: "Receivables fetched successfully",
        page: pageNumber,
        limit: pageSize,
        total: rows.length,
        rows: paginated,
    });
};
exports.getReceivables = getReceivables;
const addReceivableTransaction = async (req, res) => {
    const jwtUser = req.user;
    const warehouseId = jwtUser?.warehouse_id;
    const { id } = req.params;
    const { amount, financials } = req.body;
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Valid customer_id is required");
    }
    if (!amount || Number(amount) <= 0) {
        throw new BadRequest_1.BadRequest("Amount must be greater than 0");
    }
    if (!financials || !Array.isArray(financials) || financials.length === 0) {
        throw new BadRequest_1.BadRequest("Financials are required");
    }
    const paymentAmount = Number(amount);
    const customer = await customer_1.CustomerModel.findById(id);
    if (!customer)
        throw new NotFound_1.NotFound("Customer not found");
    const dueSales = await Sale_1.SaleModel.find({
        Due_customer_id: id,
        Due: 1,
        remaining_amount: { $gt: 0 },
        warehouse_id: warehouseId,
    }).sort({ createdAt: 1 });
    if (dueSales.length === 0) {
        throw new BadRequest_1.BadRequest("This customer has no pending receivables");
    }
    const totalDue = dueSales.reduce((sum, sale) => sum + Number(sale.remaining_amount || 0), 0);
    if (paymentAmount > totalDue) {
        throw new BadRequest_1.BadRequest(`Payment amount (${paymentAmount}) exceeds total receivable (${totalDue})`);
    }
    const paymentLines = financials.map((f) => {
        const accId = f.account_id || f.id;
        const amt = Number(f.amount);
        if (!accId || !mongoose_1.default.Types.ObjectId.isValid(accId)) {
            throw new BadRequest_1.BadRequest("Invalid account_id in financials");
        }
        if (!amt || amt <= 0) {
            throw new BadRequest_1.BadRequest("Each payment line must have amount > 0");
        }
        return { account_id: accId, amount: amt };
    });
    const totalFinancials = paymentLines.reduce((sum, p) => sum + p.amount, 0);
    if (Number(totalFinancials.toFixed(2)) !== Number(paymentAmount.toFixed(2))) {
        throw new BadRequest_1.BadRequest(`Sum of financials (${totalFinancials}) must equal amount (${paymentAmount})`);
    }
    for (const line of paymentLines) {
        const bankAccount = await Financial_Account_1.BankAccountModel.findOne({
            _id: line.account_id,
            warehouseId: warehouseId,
            status: true,
            in_POS: true,
        });
        if (!bankAccount) {
            throw new BadRequest_1.BadRequest(`Account ${line.account_id} is not valid for POS`);
        }
    }
    let remainingPayment = paymentAmount;
    for (const sale of dueSales) {
        if (remainingPayment <= 0)
            break;
        const saleRemaining = Number(sale.remaining_amount || 0);
        const payForThisSale = Math.min(remainingPayment, saleRemaining);
        const newPaidAmount = Number(sale.paid_amount || 0) + payForThisSale;
        const newRemainingAmount = saleRemaining - payForThisSale;
        const isFullyPaid = newRemainingAmount <= 0;
        const newAccountIds = [
            ...new Set([
                ...((sale.account_id || []).map(String)),
                ...paymentLines.map((p) => p.account_id),
            ]),
        ];
        await Sale_1.SaleModel.findByIdAndUpdate(sale._id, {
            paid_amount: newPaidAmount,
            remaining_amount: Math.max(0, newRemainingAmount),
            Due: isFullyPaid ? 0 : 1,
            Due_customer_id: isFullyPaid ? null : sale.Due_customer_id,
            account_id: newAccountIds,
        });
        await payment_1.PaymentModel.create({
            sale_id: sale._id,
            customer_id: id,
            financials: paymentLines.map((p) => ({
                account_id: p.account_id,
                amount: (p.amount / paymentAmount) * payForThisSale,
            })),
            amount: payForThisSale,
        });
        remainingPayment -= payForThisSale;
    }
    for (const line of paymentLines) {
        await Financial_Account_1.BankAccountModel.findByIdAndUpdate(line.account_id, {
            $inc: { balance: line.amount },
        });
    }
    const remainingDues = await Sale_1.SaleModel.find({
        Due_customer_id: id,
        Due: 1,
        remaining_amount: { $gt: 0 },
        warehouse_id: warehouseId,
    });
    const newTotalDue = remainingDues.reduce((sum, sale) => sum + Number(sale.remaining_amount || 0), 0);
    return (0, response_1.SuccessResponse)(res, {
        message: newTotalDue === 0
            ? "All receivables fully paid"
            : `Transaction added successfully. Remaining: ${newTotalDue}`,
        customer: {
            id: customer._id,
            name: customer.name,
        },
        payment_summary: {
            amount_paid: paymentAmount,
            previous_total_receivable: totalDue,
            current_total_receivable: newTotalDue,
        },
    });
};
exports.addReceivableTransaction = addReceivableTransaction;
