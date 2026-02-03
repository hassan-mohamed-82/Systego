"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPurchaseReturns = exports.getReturnById = exports.getAllReturns = exports.createReturn = exports.getPurchaseForReturn = void 0;
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const mongoose_1 = __importDefault(require("mongoose"));
const Purchase_1 = require("../../models/schema/admin/Purchase");
const purchase_item_1 = require("../../models/schema/admin/purchase_item");
const ReturnPurchase_1 = require("../../models/schema/admin/ReturnPurchase");
const products_1 = require("../../models/schema/admin/products");
const product_price_1 = require("../../models/schema/admin/product_price");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const handleImages_1 = require("../../utils/handleImages");
// ═══════════════════════════════════════════════════════════
// GET PURCHASE FOR RETURN
// ═══════════════════════════════════════════════════════════
const getPurchaseForReturn = async (req, res) => {
    const { reference } = req.body;
    if (!reference) {
        throw new BadRequest_1.BadRequest("Purchase reference is required");
    }
    let purchase;
    if (mongoose_1.default.Types.ObjectId.isValid(reference)) {
        purchase = await Purchase_1.PurchaseModel.findById(reference);
    }
    if (!purchase) {
        purchase = await Purchase_1.PurchaseModel.findOne({ reference: reference });
    }
    if (!purchase) {
        throw new Errors_1.NotFound("Purchase not found");
    }
    const fullPurchase = await Purchase_1.PurchaseModel.findById(purchase._id)
        .populate({
        path: "supplier_id",
        select: "username email phone_number address company_name cityId countryId",
        populate: [
            { path: "cityId", select: "name ar_name" },
            { path: "countryId", select: "name ar_name" }
        ]
    })
        .populate("warehouse_id", "name ar_name")
        .populate("tax_id", "name status type amount")
        .lean();
    const purchaseItems = await purchase_item_1.PurchaseItemModel.find({ purchase_id: purchase._id })
        .populate({
        path: "product_id",
        select: "name ar_name image price code quantity categoryId brandId",
        populate: [
            { path: "categoryId", select: "name ar_name" },
            { path: "brandId", select: "name ar_name" }
        ]
    })
        .populate({
        path: "options",
        populate: [
            {
                path: "product_price_id",
                select: "price code quantity",
                populate: {
                    path: "productId",
                    select: "name ar_name image"
                }
            },
            { path: "option_id", select: "name ar_name" }
        ]
    })
        .lean({ virtuals: true });
    const previousReturns = await ReturnPurchase_1.ReturnPurchaseModel.find({ purchase_id: purchase._id })
        .populate("refund_account_id", "name ar_name")
        .lean();
    const returnedQuantities = {};
    for (const ret of previousReturns) {
        for (const item of ret.items) {
            const key = item.product_price_id
                ? item.product_price_id.toString()
                : item.product_id
                    ? item.product_id.toString()
                    : "";
            returnedQuantities[key] = (returnedQuantities[key] || 0) + item.returned_quantity;
        }
    }
    const itemsWithAvailable = purchaseItems.map((item) => {
        const key = item.product_price_id?._id
            ? item.product_price_id._id.toString()
            : item.product_id?._id
                ? item.product_id._id.toString()
                : "";
        const alreadyReturned = returnedQuantities[key] || 0;
        const availableToReturn = item.quantity - alreadyReturned;
        let productInfo = item.product_id || null;
        return {
            _id: item._id,
            purchase_id: item.purchase_id,
            product: productInfo,
            product_price: item.product_price_id || null,
            options: item.options || [],
            quantity: item.quantity,
            price: item.unit_cost,
            subtotal: item.subtotal,
            already_returned: alreadyReturned,
            available_to_return: Math.max(0, availableToReturn),
        };
    });
    const totalReturnedAmount = previousReturns.reduce((sum, ret) => sum + (ret.total_amount || 0), 0);
    const totalReturnedItems = previousReturns.reduce((sum, ret) => {
        return sum + ret.items.reduce((itemSum, item) => itemSum + item.returned_quantity, 0);
    }, 0);
    const purchaseData = fullPurchase;
    return (0, response_1.SuccessResponse)(res, {
        message: "Purchase fetched successfully",
        purchase: {
            _id: purchaseData?._id,
            reference: purchaseData?.reference,
            date: purchaseData?.date,
            total: purchaseData?.total,
            discount: purchaseData?.discount,
            shipping_cost: purchaseData?.shipping_cost,
            grand_total: purchaseData?.grand_total,
            payment_status: purchaseData?.payment_status,
            note: purchaseData?.note,
            supplier: purchaseData?.supplier_id || null,
            warehouse: purchaseData?.warehouse_id || null,
            tax: purchaseData?.tax_id || null,
            created_at: purchaseData?.createdAt,
        },
        items: itemsWithAvailable,
        summary: {
            total_items: purchaseItems.length,
            total_quantity: purchaseItems.reduce((sum, item) => sum + item.quantity, 0),
            total_available_to_return: itemsWithAvailable.reduce((sum, item) => sum + item.available_to_return, 0),
            total_already_returned: totalReturnedItems,
        },
        previous_returns: previousReturns,
        previous_returns_count: previousReturns.length,
        total_returned_amount: totalReturnedAmount,
    });
};
exports.getPurchaseForReturn = getPurchaseForReturn;
// ═══════════════════════════════════════════════════════════
// CREATE RETURN
// ═══════════════════════════════════════════════════════════
const createReturn = async (req, res) => {
    const jwtUser = req.user;
    const userId = jwtUser?.id;
    if (!userId) {
        throw new BadRequest_1.BadRequest("Unauthorized: user not found in token");
    }
    const { purchase_id, items, reason, note, refund_account_id, image, } = req.body;
    if (!purchase_id) {
        throw new BadRequest_1.BadRequest("purchase_id is required");
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(purchase_id)) {
        throw new BadRequest_1.BadRequest("Invalid purchase_id");
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new BadRequest_1.BadRequest("At least one item is required for return");
    }
    const purchase = await Purchase_1.PurchaseModel.findById(purchase_id);
    if (!purchase) {
        throw new Errors_1.NotFound("Purchase not found");
    }
    const warehouseId = purchase.warehouse_id.toString();
    const purchaseItems = await purchase_item_1.PurchaseItemModel.find({ purchase_id: purchase._id }).lean();
    const previousReturns = await ReturnPurchase_1.ReturnPurchaseModel.find({ purchase_id: purchase._id }).lean();
    const returnedQuantities = {};
    for (const ret of previousReturns) {
        for (const item of ret.items) {
            const key = item.product_price_id
                ? item.product_price_id.toString()
                : item.product_id
                    ? item.product_id.toString()
                    : "";
            returnedQuantities[key] = (returnedQuantities[key] || 0) + item.returned_quantity;
        }
    }
    const returnItems = [];
    let totalReturnAmount = 0;
    for (const item of items) {
        const { purchase_item_id, product_id, product_price_id, quantity, } = item;
        if (!quantity || Number(quantity) <= 0) {
            throw new BadRequest_1.BadRequest("Return quantity must be greater than 0");
        }
        const returnQuantity = Number(quantity);
        let purchaseItem = null;
        if (purchase_item_id) {
            purchaseItem = purchaseItems.find((si) => si._id.toString() === purchase_item_id);
        }
        else if (product_price_id) {
            purchaseItem = purchaseItems.find((si) => si.product_price_id?.toString() === product_price_id);
        }
        else if (product_id) {
            purchaseItem = purchaseItems.find((si) => si.product_id?.toString() === product_id && !si.product_price_id);
        }
        if (!purchaseItem) {
            throw new BadRequest_1.BadRequest("One or more items not found in this purchase");
        }
        const key = purchaseItem.product_price_id
            ? purchaseItem.product_price_id.toString()
            : purchaseItem.product_id
                ? purchaseItem.product_id.toString()
                : "";
        const alreadyReturned = returnedQuantities[key] || 0;
        const availableToReturn = purchaseItem.quantity - alreadyReturned;
        if (returnQuantity > availableToReturn) {
            throw new BadRequest_1.BadRequest(`Cannot return ${returnQuantity} items. Only ${availableToReturn} available for return.`);
        }
        const itemSubtotal = returnQuantity * purchaseItem.unit_cost;
        totalReturnAmount += itemSubtotal;
        returnItems.push({
            product_id: purchaseItem.product_id,
            product_price_id: purchaseItem.product_price_id,
            original_quantity: purchaseItem.quantity,
            returned_quantity: returnQuantity,
            price: purchaseItem.unit_cost,
            subtotal: itemSubtotal,
        });
    }
    if (refund_account_id) {
        if (!mongoose_1.default.Types.ObjectId.isValid(refund_account_id)) {
            throw new BadRequest_1.BadRequest("Invalid refund_account_id");
        }
        const bankAccount = await Financial_Account_1.BankAccountModel.findById(refund_account_id);
        if (!bankAccount) {
            throw new BadRequest_1.BadRequest("Refund account is not valid");
        }
    }
    let image_url = "";
    if (image) {
        image_url = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "return_purchase");
    }
    const returnDoc = await ReturnPurchase_1.ReturnPurchaseModel.create({
        purchase_id: purchase._id,
        purchase_reference: purchase.reference,
        supplier_id: purchase.supplier_id,
        warehouse_id: warehouseId,
        user_id: userId,
        items: returnItems,
        total_amount: totalReturnAmount,
        refund_account_id: refund_account_id,
        note: note || "",
        image: image_url,
    });
    // Update stock (DECREASE - returning to supplier means we lose stock)
    for (const item of returnItems) {
        if (item.product_price_id) {
            await product_price_1.ProductPriceModel.findByIdAndUpdate(item.product_price_id, {
                $inc: { quantity: -item.returned_quantity },
            });
        }
        if (item.product_id) {
            await products_1.ProductModel.findByIdAndUpdate(item.product_id, {
                $inc: { quantity: -item.returned_quantity },
            });
            // Update Product_Warehouse
            const productWarehouse = await Product_Warehouse_1.Product_WarehouseModel.findOne({
                productId: item.product_id,
                warehouseId: warehouseId
            });
            if (productWarehouse) {
                await Product_Warehouse_1.Product_WarehouseModel.findByIdAndUpdate(productWarehouse._id, {
                    $inc: { quantity: -item.returned_quantity },
                });
            }
        }
    }
    // Update warehouse total stock
    const totalReturnedQty = returnItems.reduce((sum, item) => sum + item.returned_quantity, 0);
    await Warehouse_1.WarehouseModel.findByIdAndUpdate(warehouseId, {
        $inc: { stock_Quantity: -totalReturnedQty },
    });
    // Financial: Money comes BACK to us (supplier refunds us)
    if (refund_account_id) {
        await Financial_Account_1.BankAccountModel.findByIdAndUpdate(refund_account_id, {
            $inc: { balance: totalReturnAmount },
        });
    }
    const fullReturn = await ReturnPurchase_1.ReturnPurchaseModel.findById(returnDoc._id)
        .populate("purchase_id", "reference grand_total date")
        .populate("supplier_id", "username company_name phone_number")
        .populate("warehouse_id", "name")
        .populate("user_id", "name email")
        .populate("refund_account_id", "name type balance")
        .populate({
        path: "items.product_id",
        select: "name ar_name image",
    })
        .populate({
        path: "items.product_price_id",
        select: "price code",
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
    const { supplier_id, from_date, to_date } = req.query;
    const query = {};
    if (supplier_id && mongoose_1.default.Types.ObjectId.isValid(supplier_id)) {
        query.supplier_id = supplier_id;
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
    const returns = await ReturnPurchase_1.ReturnPurchaseModel.find(query)
        .populate("purchase_id", "reference grand_total")
        .populate("supplier_id", "username company_name phone_number")
        .populate("user_id", "name")
        .sort({ createdAt: -1 })
        .lean();
    const totalAmount = await ReturnPurchase_1.ReturnPurchaseModel.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$total_amount" } } },
    ]);
    return (0, response_1.SuccessResponse)(res, {
        message: "Returns fetched successfully",
        returns: returns,
        summary: {
            total_returns: returns.length,
            total_amount: totalAmount[0]?.total || 0,
        },
    });
};
exports.getAllReturns = getAllReturns;
// ═══════════════════════════════════════════════════════════
// GET RETURN BY ID
// ═══════════════════════════════════════════════════════════
const getReturnById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Return ID is required");
    }
    let returnDoc;
    if (mongoose_1.default.Types.ObjectId.isValid(id)) {
        returnDoc = await ReturnPurchase_1.ReturnPurchaseModel.findById(id);
    }
    if (!returnDoc) {
        returnDoc = await ReturnPurchase_1.ReturnPurchaseModel.findOne({ reference: id });
    }
    if (!returnDoc) {
        throw new Errors_1.NotFound("Return not found");
    }
    const fullReturn = await ReturnPurchase_1.ReturnPurchaseModel.findById(returnDoc._id)
        .populate("purchase_id", "reference grand_total date")
        .populate("supplier_id", "username company_name email phone_number")
        .populate("warehouse_id", "name")
        .populate("user_id", "name email")
        .populate("refund_account_id", "name type")
        .populate({
        path: "items.product_id",
        select: "name ar_name image price",
    })
        .populate({
        path: "items.product_price_id",
        select: "price code",
    })
        .lean();
    return (0, response_1.SuccessResponse)(res, {
        message: "Return fetched successfully",
        return: fullReturn,
    });
};
exports.getReturnById = getReturnById;
// ═══════════════════════════════════════════════════════════
// GET PURCHASE RETURNS
// ═══════════════════════════════════════════════════════════
const getPurchaseReturns = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Purchase ID is required");
    }
    let purchaseObjectId;
    if (mongoose_1.default.Types.ObjectId.isValid(id)) {
        purchaseObjectId = id;
    }
    else {
        const purchase = await Purchase_1.PurchaseModel.findOne({ _id: id });
        if (!purchase) {
            throw new Errors_1.NotFound("Purchase not found");
        }
        purchaseObjectId = purchase._id;
    }
    const returns = await ReturnPurchase_1.ReturnPurchaseModel.find({ purchase_id: purchaseObjectId })
        .populate("user_id", "name")
        .populate({
        path: "items.product_id",
        select: "name ar_name image",
    })
        .populate({
        path: "items.product_price_id",
        select: "price code",
    })
        .sort({ createdAt: -1 })
        .lean();
    const totalReturned = returns.reduce((sum, ret) => sum + ret.total_amount, 0);
    return (0, response_1.SuccessResponse)(res, {
        message: "Purchase returns fetched successfully",
        purchase_id: purchaseObjectId,
        returns_count: returns.length,
        total_returned: totalReturned,
        returns: returns,
    });
};
exports.getPurchaseReturns = getPurchaseReturns;
