import { CartModel } from "../../models/schema/users/Cart";
import { ProductModel } from "../../models/schema/admin/products";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { AddressModel } from "../../models/schema/users/Address";
import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';

// دالة مساعدة لتحديد المعرف (User أو Session)
const getCartQuery = (req: Request) => {
    const userId = req.user?.id;

    const sessionId =
        req.query?.sessionId ||
        req.headers['x-session-id'] ||
        (req.body && req.body.sessionId);

    if (userId) return { user: userId };
    if (sessionId) return { sessionId: sessionId };

    throw new BadRequest("User ID or Session ID is required to manage cart");
};

// 1. إضافة منتج للسلة
export const addToCart = asyncHandler(async (req: Request, res: Response) => {
    const { productId, quantity } = req.body;
    const query = getCartQuery(req);

    if (!mongoose.isValidObjectId(productId)) throw new BadRequest("Invalid Product ID");

    const item = await ProductModel.findById(productId);
    if (!item) throw new NotFound("Product not found");

    let cart = await CartModel.findOne(query);

    let existingQuantity = 0;
    if (cart) {
        const existingItem = cart.cartItems.find(p => p.product.toString() === productId);
        if (existingItem) existingQuantity = existingItem.quantity;
    }

    // جلب المخازن الأونلاين والكمية المتاحة فيها
    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select("_id");
    const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);

    const stockData = await Product_WarehouseModel.aggregate([
        {
            $match: {
                productId: new mongoose.Types.ObjectId(productId),
                warehouseId: { $in: onlineWarehouseIds },
            },
        },
        {
            $group: {
                _id: "$productId",
                totalQuantity: { $sum: "$quantity" },
            },
        },
    ]);

    const availableStock = stockData.length > 0 ? stockData[0].totalQuantity : 0;

    if (availableStock < existingQuantity + quantity) {
        throw new BadRequest("Not enough stock available");
    }

    if (cart) {
        const existingItemIndex = cart.cartItems.findIndex(i => i.product.toString() === productId);
        if (existingItemIndex !== -1) {
            cart.cartItems[existingItemIndex].quantity += quantity;
            cart.cartItems[existingItemIndex].price = item.price || 0;
        } else {
            // استخدام as any هنا مقبول مع الحفظ الذكي
            cart.cartItems.push({ product: productId as any, quantity, price: item.price || 0 });
        }
        await cart.save();
    } else {
        // الحل الذكي: التأكد من أنواع البيانات عند الإنشاء لأول مرة
        cart = await CartModel.create({
            ...query,
            cartItems: [{ product: new mongoose.Types.ObjectId(productId), quantity, price: item.price || 0 }],
        });
    }

    SuccessResponse(res, { message: "Cart updated successfully", cart }, 201);
});

// 2. جلب بيانات السلة وحساب الشحن
export const getCart = asyncHandler(async (req: Request, res: Response) => {
    const query = getCartQuery(req);
    const userId = query.user;

    const cart = await CartModel.findOne(query).populate('cartItems.product', 'name image price price_after_discount free_shipping');

    if (!cart) {
        return SuccessResponse(res, {
            message: "Cart is empty",
            cart: { cartItems: [], totalCartPrice: 0 },
            shippingCost: 0
        });
    }

    let isModified = false;
    let hasFreeShippingProduct = false;

    for (const item of cart.cartItems) {
        const product = item.product as any;
        if (product && product.price !== item.price) {
            item.price = product.price || 0;
            isModified = true;
        }
        if (product?.free_shipping) hasFreeShippingProduct = true;
    }

    // هنا الـ "تعديل الذكي" لضمان عدم حدوث Error الـ Populate
    if (isModified) {
        // بنستخدم markModified عشان نقول لمونجوس إن الـ Array اللي جواها Objects اتغيرت
        cart.markModified('cartItems');
        await cart.save();
    }

    const shippingSettings = await ShippingSettingsModel.findOne({ singletonKey: "default" });
    const selectedMethod = shippingSettings?.shippingMethod || "zone";
    let shippingCost = 0;

    if (shippingSettings?.freeShippingEnabled || hasFreeShippingProduct) {
        shippingCost = 0;
    } else if (selectedMethod === "flat_rate") {
        shippingCost = Number(shippingSettings?.flatRate || 0);
    } else if (selectedMethod === "carrier") {
        shippingCost = Number(shippingSettings?.carrierRate || 0);
    } else {
        if (userId) {
            const address = await AddressModel.findOne({ user: userId }).populate('city zone');
            shippingCost = address ? Number((address.zone as any)?.shipingCost || (address.city as any)?.shipingCost || 0) : 0;
        } else {
            shippingCost = 0;
        }
    }

    SuccessResponse(res, {
        message: "Cart fetched successfully",
        cart,
        shippingCost
    });
});

// 3. تحديث الكمية
export const updateQuantity = asyncHandler(async (req: Request, res: Response) => {
    const { productId, quantity } = req.body;
    const query = getCartQuery(req);

    const item = await ProductModel.findById(productId);
    if (!item) throw new NotFound("Product not found");

    // جلب المخازن الأونلاين والكمية المتاحة فيها
    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select("_id");
    const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);

    const stockData = await Product_WarehouseModel.aggregate([
        {
            $match: {
                productId: new mongoose.Types.ObjectId(productId),
                warehouseId: { $in: onlineWarehouseIds },
            },
        },
        {
            $group: {
                _id: "$productId",
                totalQuantity: { $sum: "$quantity" },
            },
        },
    ]);

    const availableStock = stockData.length > 0 ? stockData[0].totalQuantity : 0;

    if (availableStock < quantity) {
        throw new BadRequest("Not enough stock available");
    }

    const cart = await CartModel.findOne(query);
    if (!cart) throw new NotFound("Cart not found");

    const itemIndex = cart.cartItems.findIndex(p => p.product.toString() === productId);
    if (itemIndex === -1) throw new NotFound("Product not in cart");

    cart.cartItems[itemIndex].quantity = quantity;
    cart.cartItems[itemIndex].price = item.price || 0;

    cart.markModified('cartItems'); // تأكيد التعديل
    await cart.save();

    SuccessResponse(res, { message: "Quantity updated", cart });
});

// 4. حذف منتج (تم استخدام findOneAndUpdate لضمان السرعة)
export const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const query = getCartQuery(req);

    const cart = await CartModel.findOneAndUpdate(
        query,
        { $pull: { cartItems: { product: productId } } },
        { new: true }
    );

    SuccessResponse(res, { message: "Product removed from cart", cart });
});

// 5. مسح السلة
export const clearCart = asyncHandler(async (req: Request, res: Response) => {
    const query = getCartQuery(req);
    const cart = await CartModel.findOneAndDelete(query);
    if (!cart) throw new NotFound("Cart is empty");

    SuccessResponse(res, { message: "Cart has been cleared successfully" });
});