"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSaleReturns = exports.getReturnById = exports.getAllReturns = exports.createReturn = exports.getSaleForReturn = void 0;
const Errors_1 = require("../../../Errors");
const response_1 = require("../../../utils/response");
const BadRequest_1 = require("../../../Errors/BadRequest");
const Sale_1 = require("../../../models/schema/admin/POS/Sale");
const customer_1 = require("../../../models/schema/admin/POS/customer");
const product_price_1 = require("../../../models/schema/admin/product_price");
const mongoose_1 = __importDefault(require("mongoose"));
const ReturnSale_1 = require("../../../models/schema/admin/POS/ReturnSale");
const CashierShift_1 = require("../../../models/schema/admin/POS/CashierShift");
const Financial_Account_1 = require("../../../models/schema/admin/Financial_Account");
const products_1 = require("../../../models/schema/admin/products");
const pandels_1 = require("../../../models/schema/admin/pandels");
// ═══════════════════════════════════════════════════════════
// GET SALE FOR RETURN
// ═══════════════════════════════════════════════════════════
const getSaleForReturn = async (req, res) => {
    const { reference } = req.body;
    if (!reference) {
        throw new BadRequest_1.BadRequest("Sale reference is required");
    }
    let sale;
    if (mongoose_1.default.Types.ObjectId.isValid(reference)) {
        sale = await Sale_1.SaleModel.findById(reference);
    }
    if (!sale) {
        sale = await Sale_1.SaleModel.findOne({ reference: reference });
    }
    if (!sale) {
        throw new Errors_1.NotFound("Sale not found");
    }
    if (sale.order_pending === 1) {
        throw new BadRequest_1.BadRequest("Cannot return items from a pending sale");
    }
    const saleItems = await Sale_1.ProductSalesModel.find({ sale_id: sale._id })
        .populate("product_id", "name ar_name image price")
        .populate("product_price_id", "price code quantity")
        .populate("bundle_id", "name price")
        .populate("options_id", "name ar_name price")
        .lean();
    const previousReturns = await ReturnSale_1.ReturnModel.find({ sale_id: sale._id }).lean();
    const returnedQuantities = {};
    for (const ret of previousReturns) {
        for (const item of ret.items) {
            const key = item.product_price_id
                ? item.product_price_id.toString()
                : item.product_id
                    ? item.product_id.toString()
                    : item.bundle_id?.toString() || "";
            returnedQuantities[key] = (returnedQuantities[key] || 0) + item.returned_quantity;
        }
    }
    const itemsWithAvailable = saleItems.map((item) => {
        const key = item.product_price_id?._id
            ? item.product_price_id._id.toString()
            : item.product_id?._id
                ? item.product_id._id.toString()
                : item.bundle_id?._id?.toString() || "";
        const alreadyReturned = returnedQuantities[key] || 0;
        const availableToReturn = item.quantity - alreadyReturned;
        return {
            ...item,
            already_returned: alreadyReturned,
            available_to_return: Math.max(0, availableToReturn),
        };
    });
    let customer = null;
    if (sale.customer_id) {
        customer = await customer_1.CustomerModel.findById(sale.customer_id)
            .select("name email phone_number")
            .lean();
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Sale fetched successfully",
        sale: {
            _id: sale._id,
            reference: sale.reference,
            date: sale.date,
            grand_total: sale.grand_total,
            paid_amount: sale.paid_amount,
            customer: customer,
        },
        items: itemsWithAvailable,
        previous_returns: previousReturns,
        previous_returns_count: previousReturns.length,
    });
};
exports.getSaleForReturn = getSaleForReturn;
// ═══════════════════════════════════════════════════════════
// CREATE RETURN
// ═══════════════════════════════════════════════════════════
const createReturn = async (req, res) => {
    const jwtUser = req.user;
    const cashierId = jwtUser?.id;
    const warehouseId = jwtUser?.warehouse_id;
    if (!cashierId) {
        throw new BadRequest_1.BadRequest("Unauthorized: user not found in token");
    }
    if (!warehouseId) {
        throw new BadRequest_1.BadRequest("Warehouse is not assigned to this user");
    }
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: cashierId,
        status: "open",
    }).sort({ start_time: -1 });
    if (!openShift) {
        throw new BadRequest_1.BadRequest("You must open a cashier shift before creating a return");
    }
    const { sale_id, items, note, refund_method = "original_method", refund_account_id, } = req.body;
    if (!sale_id) {
        throw new BadRequest_1.BadRequest("sale_id is required");
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(sale_id)) {
        throw new BadRequest_1.BadRequest("Invalid sale_id");
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new BadRequest_1.BadRequest("At least one item is required for return");
    }
    const sale = await Sale_1.SaleModel.findById(sale_id);
    if (!sale) {
        throw new Errors_1.NotFound("Sale not found");
    }
    if (sale.order_pending === 1) {
        throw new BadRequest_1.BadRequest("Cannot return items from a pending sale");
    }
    if (sale.warehouse_id.toString() !== warehouseId) {
        throw new BadRequest_1.BadRequest("This sale belongs to a different warehouse");
    }
    const saleItems = await Sale_1.ProductSalesModel.find({ sale_id: sale._id }).lean();
    const previousReturns = await ReturnSale_1.ReturnModel.find({ sale_id: sale._id }).lean();
    const returnedQuantities = {};
    for (const ret of previousReturns) {
        for (const item of ret.items) {
            const key = item.product_price_id
                ? item.product_price_id.toString()
                : item.product_id
                    ? item.product_id.toString()
                    : item.bundle_id?.toString() || "";
            returnedQuantities[key] = (returnedQuantities[key] || 0) + item.returned_quantity;
        }
    }
    const returnItems = [];
    let totalReturnAmount = 0;
    for (const item of items) {
        const { product_sale_id, product_id, product_price_id, bundle_id, quantity, reason = "", } = item;
        if (!quantity || Number(quantity) <= 0) {
            throw new BadRequest_1.BadRequest("Return quantity must be greater than 0");
        }
        const returnQuantity = Number(quantity);
        let saleItem = null;
        if (product_sale_id) {
            saleItem = saleItems.find((si) => si._id.toString() === product_sale_id);
        }
        else if (product_price_id) {
            saleItem = saleItems.find((si) => si.product_price_id?.toString() === product_price_id);
        }
        else if (product_id) {
            saleItem = saleItems.find((si) => si.product_id?.toString() === product_id && !si.product_price_id);
        }
        else if (bundle_id) {
            saleItem = saleItems.find((si) => si.bundle_id?.toString() === bundle_id);
        }
        if (!saleItem) {
            throw new BadRequest_1.BadRequest("One or more items not found in this sale");
        }
        const key = saleItem.product_price_id
            ? saleItem.product_price_id.toString()
            : saleItem.product_id
                ? saleItem.product_id.toString()
                : saleItem.bundle_id?.toString() || "";
        const alreadyReturned = returnedQuantities[key] || 0;
        const availableToReturn = saleItem.quantity - alreadyReturned;
        if (returnQuantity > availableToReturn) {
            throw new BadRequest_1.BadRequest(`Cannot return ${returnQuantity} items. Only ${availableToReturn} available for return.`);
        }
        const itemSubtotal = returnQuantity * saleItem.price;
        totalReturnAmount += itemSubtotal;
        returnItems.push({
            product_id: saleItem.product_id,
            product_price_id: saleItem.product_price_id,
            bundle_id: saleItem.bundle_id,
            original_quantity: saleItem.quantity,
            returned_quantity: returnQuantity,
            price: saleItem.price,
            subtotal: itemSubtotal,
            reason: reason,
        });
    }
    if (refund_account_id) {
        if (!mongoose_1.default.Types.ObjectId.isValid(refund_account_id)) {
            throw new BadRequest_1.BadRequest("Invalid refund_account_id");
        }
        const bankAccount = await Financial_Account_1.BankAccountModel.findOne({
            _id: refund_account_id,
            warehouseId: warehouseId,
            status: true,
        });
        if (!bankAccount) {
            throw new BadRequest_1.BadRequest("Refund account is not valid");
        }
        if (bankAccount.balance < totalReturnAmount) {
            throw new BadRequest_1.BadRequest(`Insufficient balance in refund account. Available: ${bankAccount.balance}, Required: ${totalReturnAmount}`);
        }
    }
    const returnDoc = await ReturnSale_1.ReturnModel.create({
        sale_id: sale._id,
        sale_reference: sale.reference,
        customer_id: sale.customer_id,
        warehouse_id: warehouseId,
        cashier_id: cashierId,
        shift_id: openShift._id,
        items: returnItems,
        total_amount: totalReturnAmount,
        refund_method: refund_method,
        refund_account_id: refund_account_id,
        note: note || "",
    });
    for (const item of returnItems) {
        if (item.product_price_id) {
            await product_price_1.ProductPriceModel.findByIdAndUpdate(item.product_price_id, {
                $inc: { quantity: item.returned_quantity },
            });
        }
        else if (item.product_id) {
            await products_1.ProductModel.findByIdAndUpdate(item.product_id, {
                $inc: { quantity: item.returned_quantity },
            });
        }
        else if (item.bundle_id) {
            const bundleDoc = await pandels_1.PandelModel.findById(item.bundle_id).populate("productsId");
            if (bundleDoc) {
                for (const pPrice of bundleDoc.productsId || []) {
                    await product_price_1.ProductPriceModel.findByIdAndUpdate(pPrice._id, {
                        $inc: { quantity: item.returned_quantity },
                    });
                }
            }
        }
    }
    if (refund_account_id) {
        await Financial_Account_1.BankAccountModel.findByIdAndUpdate(refund_account_id, {
            $inc: { balance: -totalReturnAmount },
        });
    }
    const fullReturn = await ReturnSale_1.ReturnModel.findById(returnDoc._id)
        .populate("sale_id", "reference grand_total date")
        .populate("customer_id", "name email phone_number")
        .populate("warehouse_id", "name")
        .populate("cashier_id", "name email")
        .populate("shift_id", "start_time status")
        .populate("refund_account_id", "name type balance")
        .populate({
        path: "items.product_id",
        select: "name ar_name image",
    })
        .populate({
        path: "items.product_price_id",
        select: "price code",
    })
        .populate({
        path: "items.bundle_id",
        select: "name price",
    })
        .lean();
    return (0, response_1.SuccessResponse)(res, {
        message: "Return created successfully",
        return: fullReturn,
    });
};
exports.createReturn = createReturn;
// ═══════════════════════════════════════════════════════════
// GET ALL RETURNS
// ═══════════════════════════════════════════════════════════
const getAllReturns = async (req, res) => {
    const jwtUser = req.user;
    const warehouseId = jwtUser?.warehouse_id;
    const { page = 1, limit = 20, customer_id, from_date, to_date } = req.query;
    const query = { warehouse_id: warehouseId };
    if (customer_id && mongoose_1.default.Types.ObjectId.isValid(customer_id)) {
        query.customer_id = customer_id;
    }
    if (from_date || to_date) {
        query.date = {};
        if (from_date) {
            query.date.$gte = new Date(from_date);
        }
        if (to_date) {
            query.date.$lte = new Date(to_date);
        }
    }
    const skip = (Number(page) - 1) * Number(limit);
    const returns = await ReturnSale_1.ReturnModel.find(query)
        .populate("sale_id", "reference grand_total")
        .populate("customer_id", "name phone_number")
        .populate("cashier_id", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();
    const total = await ReturnSale_1.ReturnModel.countDocuments(query);
    const totalAmount = await ReturnSale_1.ReturnModel.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$total_amount" } } },
    ]);
    return (0, response_1.SuccessResponse)(res, {
        message: "Returns fetched successfully",
        returns: returns,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total: total,
            pages: Math.ceil(total / Number(limit)),
        },
        summary: {
            total_returns: total,
            total_amount: totalAmount[0]?.total || 0,
        },
    });
};
exports.getAllReturns = getAllReturns;
// ═══════════════════════════════════════════════════════════
// GET RETURN BY ID
// ═══════════════════════════════════════════════════════════
const getReturnById = async (req, res) => {
    const { return_id } = req.query;
    if (!return_id) {
        throw new BadRequest_1.BadRequest("return_id is required");
    }
    // Handle case where return_id might be an array (e.g., ?return_id=a&return_id=b)
    const returnIdStr = (Array.isArray(return_id) ? return_id[0] : return_id);
    let returnDoc;
    if (mongoose_1.default.Types.ObjectId.isValid(returnIdStr)) {
        returnDoc = await ReturnSale_1.ReturnModel.findById(returnIdStr);
    }
    if (!returnDoc) {
        returnDoc = await ReturnSale_1.ReturnModel.findOne({ reference: returnIdStr });
    }
    if (!returnDoc) {
        throw new Errors_1.NotFound("Return not found");
    }
    const fullReturn = await ReturnSale_1.ReturnModel.findById(returnDoc._id)
        .populate("sale_id", "reference grand_total date paid_amount")
        .populate("customer_id", "name email phone_number")
        .populate("warehouse_id", "name location")
        .populate("cashier_id", "name email")
        .populate("shift_id", "start_time status")
        .populate("refund_account_id", "name type")
        .populate({
        path: "items.product_id",
        select: "name ar_name image price",
    })
        .populate({
        path: "items.product_price_id",
        select: "price code",
    })
        .populate({
        path: "items.bundle_id",
        select: "name price",
    })
        .lean();
    return (0, response_1.SuccessResponse)(res, {
        message: "Return fetched successfully",
        return: fullReturn,
    });
};
exports.getReturnById = getReturnById;
// ═══════════════════════════════════════════════════════════
// GET SALE RETURNS
// ═══════════════════════════════════════════════════════════
const getSaleReturns = async (req, res) => {
    const { sale_id } = req.query;
    if (!sale_id) {
        throw new BadRequest_1.BadRequest("sale_id is required");
    }
    // Handle case where sale_id might be an array (e.g., ?sale_id=a&sale_id=b)
    const saleIdStr = (Array.isArray(sale_id) ? sale_id[0] : sale_id);
    let saleObjectId;
    if (mongoose_1.default.Types.ObjectId.isValid(saleIdStr)) {
        saleObjectId = saleIdStr;
    }
    else {
        const sale = await Sale_1.SaleModel.findOne({ reference: saleIdStr });
        if (!sale) {
            throw new Errors_1.NotFound("Sale not found");
        }
        saleObjectId = sale._id;
    }
    const returns = await ReturnSale_1.ReturnModel.find({ sale_id: saleObjectId })
        .populate("cashier_id", "name")
        .populate({
        path: "items.product_id",
        select: "name ar_name image",
    })
        .populate({
        path: "items.product_price_id",
        select: "price code",
    })
        .populate({
        path: "items.bundle_id",
        select: "name price",
    })
        .sort({ createdAt: -1 })
        .lean();
    const totalReturned = returns.reduce((sum, ret) => sum + ret.total_amount, 0);
    return (0, response_1.SuccessResponse)(res, {
        message: "Sale returns fetched successfully",
        sale_id: saleObjectId,
        returns_count: returns.length,
        total_returned: totalReturned,
        returns: returns,
    });
};
exports.getSaleReturns = getSaleReturns;
