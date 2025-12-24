import { Request, Response } from "express";
import { NotFound } from '../../Errors';
import { SuccessResponse } from '../../utils/response';
import { BadRequest } from '../../Errors/BadRequest';
import mongoose from 'mongoose';
import { PurchaseModel } from '../../models/schema/admin/Purchase';
import { PurchaseItemModel } from '../../models/schema/admin/purchase_item';
import { ReturnPurchaseModel } from '../../models/schema/admin/ReturnPurchase';
export const getPurchaseForReturn = async (req: Request, res: Response) => {
    const { reference } = req.body;

    if (!reference) {
        throw new BadRequest("Purchase reference is required");
    }

    let purchase;
    if (mongoose.Types.ObjectId.isValid(reference)) {
        purchase = await PurchaseModel.findById(reference);
    }
    if (!purchase) {
        purchase = await PurchaseModel.findOne({ reference: reference });
    }
    if (!purchase) {
        throw new NotFound("Purchase not found");
    }

    const fullPurchase = await PurchaseModel.findById(purchase._id)
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

    const purchaseItems = await PurchaseItemModel.find({ purchase_id: purchase._id })
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
