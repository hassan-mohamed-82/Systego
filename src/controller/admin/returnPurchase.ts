import { Request, Response } from 'express';
import { NotFound } from '../../Errors';
import { SuccessResponse } from '../../utils/response';
import { BadRequest } from '../../Errors/BadRequest';
import mongoose from 'mongoose';
import { PurchaseModel } from '../../models/schema/admin/Purchase';
import { PurchaseItemModel } from '../../models/schema/admin/purchase_item';
import { ReturnPurchaseModel } from '../../models/schema/admin/ReturnPurchase';
import { ProductModel } from '../../models/schema/admin/products';
import { ProductPriceModel } from '../../models/schema/admin/product_price';
import { WarehouseModel } from '../../models/schema/admin/Warehouse';
import { Product_WarehouseModel } from '../../models/schema/admin/Product_Warehouse';
import { BankAccountModel } from '../../models/schema/admin/Financial_Account';
import { saveBase64Image } from "../../utils/handleImages";
import { PurchaseItemOptionModel } from "../../models/schema/admin/purchase_item_option";

// ═══════════════════════════════════════════════════════════
// GET PURCHASE FOR RETURN
// ═══════════════════════════════════════════════════════════
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

    const previousReturns = await ReturnPurchaseModel.find({ purchase_id: purchase._id })
        .populate("refund_account_id", "name ar_name")
        .lean();

    const returnedQuantities: { [key: string]: number } = {};

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

    const itemsWithAvailable = purchaseItems.map((item: any) => {
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

    const totalReturnedAmount = previousReturns.reduce(
        (sum, ret: any) => sum + (ret.total_amount || 0),
        0
    );

    const totalReturnedItems = previousReturns.reduce((sum, ret: any) => {
        return sum + ret.items.reduce((itemSum: number, item: any) => itemSum + item.returned_quantity, 0);
    }, 0);

    const purchaseData = fullPurchase as any;

    return SuccessResponse(res, {
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
            total_quantity: purchaseItems.reduce((sum, item: any) => sum + item.quantity, 0),
            total_available_to_return: itemsWithAvailable.reduce(
                (sum, item) => sum + item.available_to_return,
                0
            ),
            total_already_returned: totalReturnedItems,
        },
        previous_returns: previousReturns,
        previous_returns_count: previousReturns.length,
        total_returned_amount: totalReturnedAmount,
    });
};

// ═══════════════════════════════════════════════════════════
// CREATE RETURN
// ═══════════════════════════════════════════════════════════
export const createReturn = async (req: Request, res: Response) => {
    const jwtUser = req.user as any;
    const userId = jwtUser?.id;

    if (!userId) {
        throw new BadRequest("Unauthorized: user not found in token");
    }

    const {
        purchase_id,
        items,
        reason,
        note,
        refund_account_id,
        image,
    } = req.body;

    if (!purchase_id) {
        throw new BadRequest("purchase_id is required");
    }

    if (!mongoose.Types.ObjectId.isValid(purchase_id)) {
        throw new BadRequest("Invalid purchase_id");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new BadRequest("At least one item is required for return");
    }

    const purchase = await PurchaseModel.findById(purchase_id);
    if (!purchase) {
        throw new NotFound("Purchase not found");
    }

    const warehouseId = purchase.warehouse_id.toString();

    const purchaseItems = await PurchaseItemModel.find({ purchase_id: purchase._id }).lean();

    const previousReturns = await ReturnPurchaseModel.find({ purchase_id: purchase._id }).lean();

    const returnedQuantities: { [key: string]: number } = {};
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

    const returnItems: Array<{
        product_id?: mongoose.Types.ObjectId;
        product_price_id?: mongoose.Types.ObjectId;
        original_quantity: number;
        returned_quantity: number;
        price: number;
        subtotal: number;
    }> = [];

    let totalReturnAmount = 0;

    for (const item of items) {
        const {
            purchase_item_id,
            product_id,
            product_price_id,
            quantity,
        } = item;

        if (!quantity || Number(quantity) <= 0) {
            throw new BadRequest("Return quantity must be greater than 0");
        }

        const returnQuantity = Number(quantity);

        let purchaseItem: any = null;

        if (purchase_item_id) {
            purchaseItem = purchaseItems.find(
                (si: any) => si._id.toString() === purchase_item_id
            );
        } else if (product_price_id) {
            purchaseItem = purchaseItems.find(
                (si: any) => si.product_price_id?.toString() === product_price_id
            );
        } else if (product_id) {
            purchaseItem = purchaseItems.find(
                (si: any) =>
                    si.product_id?.toString() === product_id && !si.product_price_id
            );
        }

        if (!purchaseItem) {
            throw new BadRequest("One or more items not found in this purchase");
        }

        const key = purchaseItem.product_price_id
            ? purchaseItem.product_price_id.toString()
            : purchaseItem.product_id
                ? purchaseItem.product_id.toString()
                : "";

        const alreadyReturned = returnedQuantities[key] || 0;
        const availableToReturn = purchaseItem.quantity - alreadyReturned;

        if (returnQuantity > availableToReturn) {
            throw new BadRequest(
                `Cannot return ${returnQuantity} items. Only ${availableToReturn} available for return.`
            );
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
        if (!mongoose.Types.ObjectId.isValid(refund_account_id)) {
            throw new BadRequest("Invalid refund_account_id");
        }

        const bankAccount = await BankAccountModel.findById(refund_account_id);
        if (!bankAccount) {
            throw new BadRequest("Refund account is not valid");
        }
    }

    let image_url = "";
    if (image) {
        image_url = await saveBase64Image(image, Date.now().toString(), req, "return_purchase");
    }

    const returnDoc = await ReturnPurchaseModel.create({
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
            await ProductPriceModel.findByIdAndUpdate(item.product_price_id, {
                $inc: { quantity: -item.returned_quantity },
            });
        }

        if (item.product_id) {
            await ProductModel.findByIdAndUpdate(item.product_id, {
                $inc: { quantity: -item.returned_quantity },
            });

            // Update Product_Warehouse
            const productWarehouse = await Product_WarehouseModel.findOne({
                productId: item.product_id,
                warehouseId: warehouseId
            });
            if (productWarehouse) {
                await Product_WarehouseModel.findByIdAndUpdate(productWarehouse._id, {
                    $inc: { quantity: -item.returned_quantity },
                });
            }
        }
    }

    // Update warehouse total stock
    const totalReturnedQty = returnItems.reduce((sum, item) => sum + item.returned_quantity, 0);
    await WarehouseModel.findByIdAndUpdate(warehouseId, {
        $inc: { stock_Quantity: -totalReturnedQty },
    });

    // Financial: Money comes BACK to us (supplier refunds us)
    if (refund_account_id) {
        await BankAccountModel.findByIdAndUpdate(refund_account_id, {
            $inc: { balance: totalReturnAmount },
        });
    }

    const fullReturn = await ReturnPurchaseModel.findById(returnDoc._id)
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

    return SuccessResponse(res, {
        message: "Return created successfully",
        return: fullReturn,
    });
};

// ═══════════════════════════════════════════════════════════
// GET ALL RETURNS
// ═══════════════════════════════════════════════════════════
export const getAllReturns = async (req: Request, res: Response) => {
    const { supplier_id, from_date, to_date } = req.query;

    const query: any = {};

    if (supplier_id && mongoose.Types.ObjectId.isValid(supplier_id as string)) {
        query.supplier_id = supplier_id;
    }

    if (from_date || to_date) {
        query.date = {};
        if (from_date) {
            query.date.$gte = new Date(from_date as string);
        }
        if (to_date) {
            query.date.$lte = new Date(to_date as string);
        }
    }

    const returns = await ReturnPurchaseModel.find(query)
        .populate("purchase_id", "reference grand_total")
        .populate("supplier_id", "username company_name phone_number")
        .populate("user_id", "name")
        .sort({ createdAt: -1 })
        .lean();

    const totalAmount = await ReturnPurchaseModel.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$total_amount" } } },
    ]);

    return SuccessResponse(res, {
        message: "Returns fetched successfully",
        returns: returns,
        summary: {
            total_returns: returns.length,
            total_amount: totalAmount[0]?.total || 0,
        },
    });
};

// ═══════════════════════════════════════════════════════════
// GET RETURN BY ID
// ═══════════════════════════════════════════════════════════
export const getReturnById = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequest("Return ID is required");
    }

    let returnDoc;

    if (mongoose.Types.ObjectId.isValid(id)) {
        returnDoc = await ReturnPurchaseModel.findById(id);
    }

    if (!returnDoc) {
        returnDoc = await ReturnPurchaseModel.findOne({ reference: id });
    }

    if (!returnDoc) {
        throw new NotFound("Return not found");
    }

    const fullReturn = await ReturnPurchaseModel.findById(returnDoc._id)
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

    return SuccessResponse(res, {
        message: "Return fetched successfully",
        return: fullReturn,
    });
};

// ═══════════════════════════════════════════════════════════
// GET PURCHASE RETURNS
// ═══════════════════════════════════════════════════════════
export const getPurchaseReturns = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequest("Purchase ID is required");
    }

    let purchaseObjectId;

    if (mongoose.Types.ObjectId.isValid(id)) {
        purchaseObjectId = id;
    } else {
        const purchase = await PurchaseModel.findOne({ _id: id });
        if (!purchase) {
            throw new NotFound("Purchase not found");
        }
        purchaseObjectId = purchase._id;
    }

    const returns = await ReturnPurchaseModel.find({ purchase_id: purchaseObjectId })
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

    return SuccessResponse(res, {
        message: "Purchase returns fetched successfully",
        purchase_id: purchaseObjectId,
        returns_count: returns.length,
        total_returned: totalReturned,
        returns: returns,
    });
};
