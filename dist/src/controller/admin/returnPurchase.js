"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPurchaseForReturn = void 0;
const Errors_1 = require("../../Errors");
const BadRequest_1 = require("../../Errors/BadRequest");
const mongoose_1 = __importDefault(require("mongoose"));
const Purchase_1 = require("../../models/schema/admin/Purchase");
const purchase_item_1 = require("../../models/schema/admin/purchase_item");
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
        .populate("user_id", "name ar_name")
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
        path: "product_price_id",
        select: "price code quantity",
        populate: {
            path: "productId",
            select: "name ar_name image"
        }
    })
        .populate({
        path: "options",
        populate: {
            path: "option_id",
            select: "name ar_name price"
        }
    })
        .lean({ virtuals: true });
};
exports.getPurchaseForReturn = getPurchaseForReturn;
// const previousReturns = await ReturnPurchaseModel.find({ purchase_id: purchase._id })
//     .populate("financial_account_id", "name ar_name")
//     .lean();
// const returnedQuantities: { [key: string]: number } = {};
// for (const ret of previousReturns) {
//     for (const item of ret.items) {
//         const key = item.product_price_id
//             ? item.product_price_id.toString()
//             : item.product_id
//                 ? item.product_id.toString()
//                 : item.bundle_id?.toString() || "";
//         returnedQuantities[key] = (returnedQuantities[key] || 0) + item.returned_quantity;
// }
// }
