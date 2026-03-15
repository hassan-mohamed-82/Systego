import { Request, Response } from "express";
import { SupplierModel } from "../../models/schema/admin/suppliers";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { CityModels } from "../../models/schema/admin/City";
import { CountryModel } from "../../models/schema/admin/Country";
import { PurchaseModel } from "../../models/schema/admin/Purchase";
import { PurchaseItemModel } from "../../models/schema/admin/purchase_item";
import { PurchaseInvoiceModel } from "../../models/schema/admin/PurchaseInvoice";
import { PurchaseDuePaymentModel } from "../../models/schema/admin/purchase_due_payment";
import { ReturnPurchaseModel } from "../../models/schema/admin/ReturnPurchase";
import mongoose from "mongoose";

export const createSupplier = async (req: Request, res: Response) => {
  const {
    image,
    username,
    email,
    phone_number,
    address,
    cityId,
    countryId,
    company_name,
    contact_person,
    registration_date,
    status,
    notes,
  } = req.body;

  if (!username || !email || !phone_number|| !cityId || !countryId) {
    throw new BadRequest("Username, email, city, country, and phone number are required");
  }
  const existingSupplier = await SupplierModel.findOne({
    $or: [{ username }, { email }, { phone_number }],
  })
  if (existingSupplier) throw new BadRequest("Supplier with given username, email, or phone number already exists");

  let imageUrl = "";
  if (image) {
    imageUrl = await saveBase64Image(
      image,
      Date.now().toString(),
      req,
      "suppliers"
    );
  }

  const supplier = await SupplierModel.create({
    image: imageUrl,
    username,
    email,
    phone_number,
    address,
    cityId,
    countryId,
    company_name,
    contact_person,
    registration_date,
    status,
    notes,
  });

  SuccessResponse(res, { message: "Supplier created successfully", supplier });
};


export const getSuppliers = async (req: Request, res: Response) => {
  const suppliers = await SupplierModel.find().populate("cityId").populate("countryId");
 
  const countries = await CountryModel.find().populate("cities");

  SuccessResponse(res, { message: "Suppliers retrieved successfully", suppliers, countries });
};


export const getSupplierById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Supplier ID is required");

  const supplier = await SupplierModel.findById(id)
    .populate("cityId")
    .populate("countryId");
    
  if (!supplier) throw new NotFound("Supplier not found");

  const countries = await CountryModel.find().populate("cities");

  SuccessResponse(res, { 
    message: "Supplier retrieved successfully", 
    supplier, 
    countries 
  });
};


// ==================== Supplier Single Page ====================
export const getSupplierSinglePage = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Supplier ID is required");

  const supplierId = new mongoose.Types.ObjectId(id);

  // 1) Basic Supplier Info
  const supplier = await SupplierModel.findById(supplierId)
    .populate("cityId")
    .populate("countryId");
  if (!supplier) throw new NotFound("Supplier not found");

  // 2) All purchases for this supplier
  const purchases = await PurchaseModel.find({ supplier_id: supplierId })
    .sort({ date: -1 })
    .lean();

  const purchaseIds = purchases.map((p) => p._id);

  // 3) Financial Summary
  const totalPurchases = purchases.reduce((sum, p) => sum + (p.grand_total || 0), 0);

  const invoices = await PurchaseInvoiceModel.find({ purchase_id: { $in: purchaseIds } }).lean();
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const duePayments = await PurchaseDuePaymentModel.find({ purchase_id: { $in: purchaseIds } }).lean();
  const totalDuePaid = duePayments.reduce((sum, dp) => sum + (dp.amount || 0), 0);

  const outstandingPayables = totalPurchases - totalPaid - totalDuePaid;
  const lastPurchaseDate = purchases.length > 0 ? purchases[0].date : null;
  const totalOrdersCount = purchases.length;

  const financialSummary = {
    totalPurchases,
    totalPaid: totalPaid + totalDuePaid,
    outstandingPayables,
    lastPurchaseDate,
    totalOrdersCount,
  };

  // 4) Purchase Orders
  const purchaseItems = await PurchaseItemModel.find({ purchase_id: { $in: purchaseIds } }).lean();

  const purchaseOrders = purchases.map((p) => {
    const items = purchaseItems.filter(
      (item) => item.purchase_id?.toString() === p._id.toString()
    );
    const itemsCount = items.length;
    const receivedQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return {
      poNumber: p.reference,
      date: p.date,
      itemsCount,
      totalAmount: p.grand_total,
      receivedQuantity,
      status: p.payment_status,
    };
  });

  // 5) Payments to Supplier
  const paymentsToSupplier = invoices.map((inv) => ({
    paymentId: inv._id,
    date: inv.date,
    amount: inv.amount,
    paymentMethod: (inv as any).financial_id,
    referenceNumber: (inv as any).purchase_id,
    notes: "",
  }));

  // Also include due payments
  const duePaymentsList = duePayments.map((dp) => ({
    paymentId: dp._id,
    date: dp.date,
    amount: dp.amount,
    paymentMethod: "Due Payment",
    referenceNumber: (dp as any).purchase_id,
    notes: "",
  }));

  const allPayments = [...paymentsToSupplier, ...duePaymentsList].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // 6) Products Supplied — distinct products from purchase items
  const productItemsWithProduct = await PurchaseItemModel.find({
    purchase_id: { $in: purchaseIds },
    product_id: { $exists: true, $ne: null },
  })
    .populate({
      path: "product_id",
      select: "name code price",
      populate: { path: "categoryId", select: "name ar_name" },
    })
    .sort({ date: -1 })
    .lean();

  // Group by product to get unique products with latest info
  const productMap = new Map<string, any>();
  for (const item of productItemsWithProduct) {
    const productId = (item.product_id as any)?._id?.toString();
    if (!productId) continue;
    if (!productMap.has(productId)) {
      const product = item.product_id as any;
      productMap.set(productId, {
        productName: product.name,
        code: product.code,
        category: product.categoryId,
        purchasePrice: item.unit_cost,
        lastPurchaseDate: item.date,
      });
    }
  }
  const productsSupplied = Array.from(productMap.values());

  // 7) Returns to Supplier
  const returns = await ReturnPurchaseModel.find({ supplier_id: supplierId })
    .populate("items.product_id", "name code")
    .sort({ date: -1 })
    .lean();

  const returnsToSupplier = returns.map((r) => ({
    returnNumber: r.reference,
    date: r.date,
    items: r.items,
    totalAmount: r.total_amount,
    note: r.note,
  }));

  // 8) Notes from supplier document
  const supplierNotes = supplier.notes || [];

  SuccessResponse(res, {
    message: "Supplier details retrieved successfully",
    supplier,
    financialSummary,
    purchaseOrders,
    payments: allPayments,
    productsSupplied,
    returnsToSupplier,
    notes: supplierNotes,
  });
};


export const updateSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Supplier ID is required");

  const updateData: any = { ...req.body };

  if (req.body.image) {
    updateData.image = await saveBase64Image(
      req.body.image,
      Date.now().toString(),
      req,
      "suppliers"
    );
  }

  const supplier = await SupplierModel.findByIdAndUpdate(id, updateData, { new: true });
  if (!supplier) throw new NotFound("Supplier not found");

  SuccessResponse(res, { message: "Supplier updated successfully", supplier });
};


export const deleteSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Supplier ID is required");

  const supplier = await SupplierModel.findByIdAndDelete(id);
  if (!supplier) throw new NotFound("Supplier not found");

  SuccessResponse(res, { message: "Supplier deleted successfully" });
};

