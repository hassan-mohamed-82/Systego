"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSupplier = exports.updateSupplier = exports.getSupplierSinglePage = exports.getCountriesWithCities = exports.getSupplierById = exports.getSuppliers = exports.createSupplier = void 0;
const suppliers_1 = require("../../models/schema/admin/suppliers");
const handleImages_1 = require("../../utils/handleImages");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const Country_1 = require("../../models/schema/admin/Country");
const Purchase_1 = require("../../models/schema/admin/Purchase");
const purchase_item_1 = require("../../models/schema/admin/purchase_item");
const PurchaseInvoice_1 = require("../../models/schema/admin/PurchaseInvoice");
const purchase_due_payment_1 = require("../../models/schema/admin/purchase_due_payment");
const ReturnPurchase_1 = require("../../models/schema/admin/ReturnPurchase");
const mongoose_1 = __importDefault(require("mongoose"));
const createSupplier = async (req, res) => {
    const { image, username, email, phone_number, address, cityId, countryId, company_name, contact_person, registration_date, status, notes, } = req.body;
    if (!username || !email || !phone_number || !cityId || !countryId) {
        throw new BadRequest_1.BadRequest("Username, email, city, country, and phone number are required");
    }
    const existingSupplier = await suppliers_1.SupplierModel.findOne({
        $or: [{ username }, { email }, { phone_number }],
    });
    if (existingSupplier)
        throw new BadRequest_1.BadRequest("Supplier with given username, email, or phone number already exists");
    let imageUrl = "";
    if (image) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "suppliers");
    }
    const supplier = await suppliers_1.SupplierModel.create({
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
    (0, response_1.SuccessResponse)(res, { message: "Supplier created successfully", supplier });
};
exports.createSupplier = createSupplier;
const getSuppliers = async (req, res) => {
    const suppliers = await suppliers_1.SupplierModel.find().populate("cityId").populate("countryId");
    const countries = await Country_1.CountryModel.find().populate("cities");
    (0, response_1.SuccessResponse)(res, { message: "Suppliers retrieved successfully", suppliers, countries });
};
exports.getSuppliers = getSuppliers;
const getSupplierById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Supplier ID is required");
    const supplier = await suppliers_1.SupplierModel.findById(id)
        .populate("cityId")
        .populate("countryId");
    if (!supplier)
        throw new Errors_1.NotFound("Supplier not found");
    const countries = await Country_1.CountryModel.find().populate("cities");
    (0, response_1.SuccessResponse)(res, {
        message: "Supplier retrieved successfully",
        supplier,
        countries
    });
};
exports.getSupplierById = getSupplierById;
const getCountriesWithCities = async (req, res) => {
    const countries = await Country_1.CountryModel.find().populate("cities").lean();
    (0, response_1.SuccessResponse)(res, {
        message: "Countries and cities fetched successfully",
        countries,
    });
};
exports.getCountriesWithCities = getCountriesWithCities;
// ==================== Supplier Single Page ====================
const getSupplierSinglePage = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Supplier ID is required");
    const supplierId = new mongoose_1.default.Types.ObjectId(id);
    // 1) Basic Supplier Info
    const supplier = await suppliers_1.SupplierModel.findById(supplierId)
        .populate("cityId")
        .populate("countryId");
    if (!supplier)
        throw new Errors_1.NotFound("Supplier not found");
    // 2) All purchases for this supplier
    const purchases = await Purchase_1.PurchaseModel.find({ supplier_id: supplierId })
        .sort({ date: -1 })
        .lean();
    const purchaseIds = purchases.map((p) => p._id);
    // 3) Financial Summary
    const totalPurchases = purchases.reduce((sum, p) => sum + (p.grand_total || 0), 0);
    const invoices = await PurchaseInvoice_1.PurchaseInvoiceModel.find({ purchase_id: { $in: purchaseIds } }).lean();
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const duePayments = await purchase_due_payment_1.PurchaseDuePaymentModel.find({ purchase_id: { $in: purchaseIds } }).lean();
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
    const purchaseItems = await purchase_item_1.PurchaseItemModel.find({ purchase_id: { $in: purchaseIds } }).lean();
    const purchaseOrders = purchases.map((p) => {
        const items = purchaseItems.filter((item) => item.purchase_id?.toString() === p._id.toString());
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
        paymentMethod: inv.financial_id,
        referenceNumber: inv.purchase_id,
        notes: "",
    }));
    // Also include due payments
    const duePaymentsList = duePayments.map((dp) => ({
        paymentId: dp._id,
        date: dp.date,
        amount: dp.amount,
        paymentMethod: "Due Payment",
        referenceNumber: dp.purchase_id,
        notes: "",
    }));
    const allPayments = [...paymentsToSupplier, ...duePaymentsList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // 6) Products Supplied — distinct products from purchase items
    const productItemsWithProduct = await purchase_item_1.PurchaseItemModel.find({
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
    const productMap = new Map();
    for (const item of productItemsWithProduct) {
        const productId = item.product_id?._id?.toString();
        if (!productId)
            continue;
        if (!productMap.has(productId)) {
            const product = item.product_id;
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
    const returns = await ReturnPurchase_1.ReturnPurchaseModel.find({ supplier_id: supplierId })
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
    (0, response_1.SuccessResponse)(res, {
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
exports.getSupplierSinglePage = getSupplierSinglePage;
const updateSupplier = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Supplier ID is required");
    const updateData = { ...req.body };
    if (req.body.image) {
        updateData.image = await (0, handleImages_1.saveBase64Image)(req.body.image, Date.now().toString(), req, "suppliers");
    }
    const supplier = await suppliers_1.SupplierModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!supplier)
        throw new Errors_1.NotFound("Supplier not found");
    (0, response_1.SuccessResponse)(res, { message: "Supplier updated successfully", supplier });
};
exports.updateSupplier = updateSupplier;
const deleteSupplier = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Supplier ID is required");
    const supplier = await suppliers_1.SupplierModel.findByIdAndDelete(id);
    if (!supplier)
        throw new Errors_1.NotFound("Supplier not found");
    (0, response_1.SuccessResponse)(res, { message: "Supplier deleted successfully" });
};
exports.deleteSupplier = deleteSupplier;
