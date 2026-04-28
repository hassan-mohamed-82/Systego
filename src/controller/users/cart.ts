import { Request, Response } from "express";
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import { CartModel } from "../../models/schema/users/Cart";
import { ProductModel } from "../../models/schema/admin/products";
import { ProductPriceModel } from "../../models/schema/admin/product_price";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { ServiceFeeModel } from "../../models/schema/admin/ServiceFee";
import { CouponModel } from "../../models/schema/admin/coupons";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { AddressModel } from "../../models/schema/users/Address";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";

// --- دالة مساعدة لجلب معرف السلة ---
const getCartQuery = (req: Request) => {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || req.body?.sessionId;

    if (userId) return { user: userId };
    if (sessionId) return { sessionId: sessionId };
    throw new BadRequest("User ID or Session ID is required");
};

// --- دالة الحسابات المركزية ---
const calculateCartTotals = async (cart: any, userId?: string) => {
    let totalCartPrice = 0;
    let totalTaxAmount = 0;
    let hasFreeShippingProduct = false;

    for (const item of cart.cartItems) {
        const product = item.product as any;
        const variant = item.variant as any;

        // جلب السعر الأحدث (بعد الخصم إن وجد)
        const currentPrice = variant ? variant.price : (product.price_after_discount || product.price || 0);
        item.price = currentPrice;

        if (product.free_shipping) hasFreeShippingProduct = true;

        if (product.taxesId?.status) {
            const tax = product.taxesId;
            const itemTotal = currentPrice * item.quantity;
            totalTaxAmount += tax.type === "percentage" ? (itemTotal * tax.amount) / 100 : tax.amount * item.quantity;
        }
        totalCartPrice += currentPrice * item.quantity;
    }

    const activeFees = await ServiceFeeModel.find({ module: "online", status: true });
    let totalServiceFee = 0;
    activeFees.forEach(fee => {
        totalServiceFee += fee.type === "percentage" ? (totalCartPrice * fee.amount) / 100 : fee.amount;
    });

    const shippingSettings = await ShippingSettingsModel.findOne({ singletonKey: "default" });
    let shippingCost = 0;
    if (!(shippingSettings?.freeShippingEnabled || hasFreeShippingProduct)) {
        if (shippingSettings?.shippingMethod === "flat_rate") {
            shippingCost = Number(shippingSettings.flatRate || 0);
        } else if (userId) {
            const address = await AddressModel.findOne({ user: userId }).populate('city zone');
            shippingCost = address ? Number((address.zone as any)?.shipingCost || (address.city as any)?.shipingCost || 0) : 0;
        }
    }

    cart.totalCartPrice = totalCartPrice;
    cart.taxAmount = totalTaxAmount;
    cart.serviceFee = totalServiceFee;

    // --- إعادة حساب الكوبون (Coupon Recalculation) ---
    if (cart.coupon) {
        const coupon = await CouponModel.findById(cart.coupon);
        if (coupon && coupon.available > 0 && new Date(coupon.expired_date) > new Date()) {
            if (totalCartPrice >= (coupon.minimum_amount_for_use || 0)) {
                cart.couponDiscount = coupon.type === "percentage" ? (totalCartPrice * coupon.amount) / 100 : coupon.amount;
            } else {
                // إذا قل السعر عن الحد الأدنى، نحذف الكوبون
                cart.coupon = undefined;
                cart.couponDiscount = 0;
            }
        } else {
            // إذا انتهى الكوبون أو نفذت كميته، نحذفه
            cart.coupon = undefined;
            cart.couponDiscount = 0;
        }
    }

    return { totalCartPrice, shippingCost };
};

// 1. مزامنة السلة بالكامل (The Sync Endpoint)
export const syncCart = asyncHandler(async (req: Request, res: Response) => {
    const { items } = req.body;
    const query = getCartQuery(req);

    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select("_id");
    const onlineWarehouseIds = onlineWarehouses.map(w => w._id);

    const validatedItems = [];

    for (const item of items) {
        const { productId, productVariantId, quantity } = item;

        const stockMatch: any = {
            productId: new mongoose.Types.ObjectId(productId),
            warehouseId: { $in: onlineWarehouseIds },
            productPriceId: productVariantId ? new mongoose.Types.ObjectId(productVariantId) : null
        };

        const stock = await Product_WarehouseModel.aggregate([
            { $match: stockMatch },
            { $group: { _id: null, total: { $sum: "$quantity" } } }
        ]);

        const availableStock = stock[0]?.total || 0;
        if (quantity > availableStock) {
            throw new BadRequest(`Product ${productId} only has ${availableStock} in stock`);
        }

        let currentPrice = 0;
        if (productVariantId) {
            const variant = await ProductPriceModel.findById(productVariantId);
            currentPrice = variant?.price || 0;
        } else {
            const product = await ProductModel.findById(productId);
            currentPrice = product?.price || 0;
        }

        validatedItems.push({
            product: productId,
            variant: productVariantId || undefined,
            quantity: quantity,
            price: currentPrice
        });
    }

    // تحديث السلة
    await CartModel.findOneAndUpdate(
        query,
        { cartItems: validatedItems },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // جلب السلة كاملة مع الحسابات (حل مشكلة fullCart is possibly null)
    const fullCart = await CartModel.findOne(query)
        .populate({
            path: 'cartItems.product',
            select: 'name ar_name image price price_after_discount free_shipping taxesId',
            populate: { path: 'taxesId' }
        })
        .populate('cartItems.variant');

    if (!fullCart) throw new NotFound("Cart processing failed");

    const { shippingCost } = await calculateCartTotals(fullCart, (query as any).user);
    await fullCart.save();

    SuccessResponse(res, { message: "Cart synced successfully", cart: fullCart, shippingCost }, 200);
});

// 2. جلب السلة
export const getCart = asyncHandler(async (req: Request, res: Response) => {
    const query = getCartQuery(req);
    const cart = await CartModel.findOne(query)
        .populate({
            path: 'cartItems.product',
            select: 'name ar_name image price price_after_discount free_shipping taxesId',
            populate: { path: 'taxesId' }
        })
        .populate('cartItems.variant');

    if (!cart || cart.cartItems.length === 0) {
        return SuccessResponse(res, { message: "Empty", cart: { cartItems: [] }, shippingCost: 0 });
    }

    const { shippingCost } = await calculateCartTotals(cart, (query as any).user);
    await cart.save();
    SuccessResponse(res, { cart, shippingCost });
});

// 3. تطبيق كوبون
export const applyCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { couponCode } = req.body;
    const query = getCartQuery(req);

    const cart = await CartModel.findOne(query)
        .populate({ path: 'cartItems.product', populate: { path: 'taxesId' } })
        .populate('cartItems.variant');

    if (!cart) throw new NotFound("Cart is empty");

    if (!couponCode) {
        cart.coupon = undefined;
        cart.couponDiscount = 0;
        await calculateCartTotals(cart, (query as any).user);
        await cart.save();
        return SuccessResponse(res, { message: "Coupon removed successfully", cart });
    }

    const coupon = await CouponModel.findOne({
        coupon_code: couponCode,
        available: { $gt: 0 },
        expired_date: { $gt: new Date() }
    });

    if (!coupon) throw new BadRequest("Invalid coupon");

    const { totalCartPrice } = await calculateCartTotals(cart, (query as any).user);
    if (totalCartPrice < (coupon.minimum_amount_for_use || 0)) {
        throw new BadRequest(`Minimum order is ${coupon.minimum_amount_for_use}`);
    }

    cart.coupon = coupon._id as any;
    cart.couponDiscount = coupon.type === "percentage" ? (totalCartPrice * coupon.amount) / 100 : coupon.amount;

    await cart.save();
    SuccessResponse(res, { message: "Coupon applied successfully", cart });
});

// 4. مسح السلة
export const clearCart = asyncHandler(async (req: Request, res: Response) => {
    await CartModel.findOneAndDelete(getCartQuery(req));
    SuccessResponse(res, { message: "Cart cleared" });
});