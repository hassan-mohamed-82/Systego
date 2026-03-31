import { Request, Response } from "express";
import mongoose from "mongoose";
import { SaleModel } from "../../models/schema/admin/POS/Sale";
import { CustomerModel } from "../../models/schema/admin/POS/customer";
import { PaymentModel } from "../../models/schema/admin/POS/payment";
import { BankAccountModel } from "../../models/schema/admin/Financial_Account";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";

export const getReceivables = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;
  const { customer_id, status, from, to, page = 1, limit = 50, search } = req.query;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const filter: any = {
    Due: 1,
    warehouse_id: warehouseId,
  };

  if (customer_id) {
    if (!mongoose.Types.ObjectId.isValid(String(customer_id))) {
      throw new BadRequest("Invalid customer_id");
    }
    filter.Due_customer_id = customer_id;
  }

  if (status === "later" || status === "pending") {
    filter.remaining_amount = { $gt: 0 };
  } else if (status === "full" || status === "paid") {
    filter.remaining_amount = { $lte: 0 };
  }

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(String(from));
    if (to) filter.date.$lte = new Date(new Date(String(to)).setHours(23, 59, 59, 999));
  }

  const sales = await SaleModel.find(filter)
    .select("Due_customer_id grand_total paid_amount remaining_amount")
    .populate("Due_customer_id", "name phone_number")
    .sort({ createdAt: -1 })
    .lean();

  const grouped = new Map<string, any>();

  for (const sale of sales as any[]) {
    const customer = sale.Due_customer_id as any;
    if (!customer?._id) continue;

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

  let rows = Array.from(grouped.values()).map((row: any) => ({
    ...row,
    status: row.remaining > 0 ? "later" : "full",
  }));

  if (search) {
    const keyword = String(search).toLowerCase().trim();
    rows = rows.filter(
      (r: any) =>
        String(r.client || "").toLowerCase().includes(keyword) ||
        String(r.phone || "").toLowerCase().includes(keyword)
    );
  }

  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.max(1, Number(limit) || 50);
  const start = (pageNumber - 1) * pageSize;
  const paginated = rows.slice(start, start + pageSize);

  return SuccessResponse(res, {
    message: "Receivables fetched successfully",
    page: pageNumber,
    limit: pageSize,
    total: rows.length,
    rows: paginated,
  });
};

export const addReceivableTransaction = async (req: Request, res: Response) => {
  const jwtUser = req.user as any;
  const warehouseId = jwtUser?.warehouse_id;
  const { id } = req.params;
  const { amount, financials } = req.body;

  if (!warehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Valid customer_id is required");
  }

  if (!amount || Number(amount) <= 0) {
    throw new BadRequest("Amount must be greater than 0");
  }

  if (!financials || !Array.isArray(financials) || financials.length === 0) {
    throw new BadRequest("Financials are required");
  }

  const paymentAmount = Number(amount);

  const customer = await CustomerModel.findById(id);
  if (!customer) throw new NotFound("Customer not found");

  const dueSales = await SaleModel.find({
    Due_customer_id: id,
    Due: 1,
    remaining_amount: { $gt: 0 },
    warehouse_id: warehouseId,
  }).sort({ createdAt: 1 });

  if (dueSales.length === 0) {
    throw new BadRequest("This customer has no pending receivables");
  }

  const totalDue = dueSales.reduce((sum, sale: any) => sum + Number(sale.remaining_amount || 0), 0);

  if (paymentAmount > totalDue) {
    throw new BadRequest(`Payment amount (${paymentAmount}) exceeds total receivable (${totalDue})`);
  }

  type FinancialLine = { account_id: string; amount: number };
  const paymentLines: FinancialLine[] = financials.map((f: any) => {
    const accId = f.account_id || f.id;
    const amt = Number(f.amount);

    if (!accId || !mongoose.Types.ObjectId.isValid(accId)) {
      throw new BadRequest("Invalid account_id in financials");
    }

    if (!amt || amt <= 0) {
      throw new BadRequest("Each payment line must have amount > 0");
    }

    return { account_id: accId, amount: amt };
  });

  const totalFinancials = paymentLines.reduce((sum, p) => sum + p.amount, 0);
  if (Number(totalFinancials.toFixed(2)) !== Number(paymentAmount.toFixed(2))) {
    throw new BadRequest(`Sum of financials (${totalFinancials}) must equal amount (${paymentAmount})`);
  }

  for (const line of paymentLines) {
    const bankAccount = await BankAccountModel.findOne({
      _id: line.account_id,
      warehouseId: warehouseId,
      status: true,
      in_POS: true,
    });

    if (!bankAccount) {
      throw new BadRequest(`Account ${line.account_id} is not valid for POS`);
    }
  }

  let remainingPayment = paymentAmount;
  for (const sale of dueSales as any[]) {
    if (remainingPayment <= 0) break;

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

    await SaleModel.findByIdAndUpdate(sale._id, {
      paid_amount: newPaidAmount,
      remaining_amount: Math.max(0, newRemainingAmount),
      Due: isFullyPaid ? 0 : 1,
      Due_customer_id: isFullyPaid ? null : sale.Due_customer_id,
      account_id: newAccountIds,
    });

    await PaymentModel.create({
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
    await BankAccountModel.findByIdAndUpdate(line.account_id, {
      $inc: { balance: line.amount },
    });
  }

  const remainingDues = await SaleModel.find({
    Due_customer_id: id,
    Due: 1,
    remaining_amount: { $gt: 0 },
    warehouse_id: warehouseId,
  });

  const newTotalDue = remainingDues.reduce((sum, sale: any) => sum + Number(sale.remaining_amount || 0), 0);

  return SuccessResponse(res, {
    message:
      newTotalDue === 0
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
