import { CartModel } from "../../models/schema/users/Cart";
import { ProductModel } from "../../models/schema/admin/products";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { AddressModel } from "../../models/schema/users/Address";
import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";

export const addToCart = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { productId, quantity } = req.body;

    const item = await ProductModel.findById(productId);
    if (!item) {
        throw new NotFound("Product not found");
    }

    let cart = await CartModel.findOne({ user: userId });

    let existingQuantity = 0;
    if (cart) {
        const existingItem = cart.cartItems.find(p => p.product.toString() === productId);
        if (existingItem) existingQuantity = existingItem.quantity;
    }

    // التأكد إن المخزن يكفي الكمية المطلوبة + الكمية اللي موجودة أصلاً في السلة
    if ((item.quantity ?? 0) < existingQuantity + quantity) {
        throw new BadRequest("Not enough stock available");
    }

    if (cart) {
        const existingItemIndex = cart.cartItems.findIndex(item => item.product.toString() === productId);
        if (existingItemIndex !== -1) {
            cart.cartItems[existingItemIndex].quantity += quantity;
            cart.cartItems[existingItemIndex].price = item.price || 0; // تحديث السعر
        } else {
            cart.cartItems.push({ product: productId, quantity, price: item.price || 0 });
        }
        await cart.save();
    } else {
        cart = await CartModel.create({
            user: userId,
            cartItems: [{ product: productId, quantity, price: item.price || 0 }],
        });
    }

    SuccessResponse(res, { message: "Cart added successfully", cart }, 201);
};

export const getCart = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    // استخدام findOne و populate بدلاً من تجريد البيانات
    const cart = await CartModel.findOne({ user: userId }).populate('cartItems.product', 'name image price price_after_discount free_shipping');

    if (!cart) {
        return SuccessResponse(res, { message: "Cart is empty", cart: { cartItems: [], totalCartPrice: 0 }, shippingCost: 0 });
    }

    // تحديث الأسعار بشكل تفاعلي لو اتغيرت في الداتابيز
    let isModified = false;
    let hasFreeShippingProduct = false;

    for (const item of cart.cartItems) {
        const product = item.product as any;
        if (product && product.price !== item.price) {
            item.price = product.price || 0;
            isModified = true;
        }
        if (product?.free_shipping) {
            hasFreeShippingProduct = true;
        }
    }
    
    if (isModified) {
        // نحدث السلة عن طريق updateOne لتجنب مشاكل الـ Populate مع Mongoose save
        const updatedItems = cart.cartItems.map(item => ({
            product: (item.product as any)._id || item.product,
            quantity: item.quantity,
            price: item.price
        }));
        await CartModel.updateOne({ _id: cart._id }, { $set: { cartItems: updatedItems } });
    }

    // حساب الشحن المبدئي للعرض في السلة
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
        const address = await AddressModel.findOne({ user: userId }).populate('city zone');
        shippingCost = address ? Number((address.zone as any)?.shipingCost || (address.city as any)?.shipingCost || 0) : 0;
    }

    SuccessResponse(res, { 
        message: "Cart fetched successfully", 
        cart,
        shippingCost
    });
};

export const updateQuantity = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { productId, quantity } = req.body;

    // جلب المنتج من المخزون لمعرفة المتاح والسعر 
    const item = await ProductModel.findById(productId);
    if (!item) throw new NotFound("Product not found");

    // التأكد إن الكمية المطلوبة متوفرة
    if ((item.quantity ?? 0) < quantity) {
        throw new BadRequest("Not enough stock available to update quantity");
    }

    const cart = await CartModel.findOne({ user: userId });
    if (!cart) throw new NotFound("Cart not found");

    const itemIndex = cart.cartItems.findIndex(p => p.product.toString() === productId);
    if (itemIndex === -1) throw new NotFound("Product not found in cart");

    cart.cartItems[itemIndex].quantity = quantity;
    cart.cartItems[itemIndex].price = item.price || 0; // تحديث السعر أيضاً
    await cart.save();

    SuccessResponse(res, { message: "Cart updated successfully", cart });
};

export const removeFromCart = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const userId = req.user?.id;

    const cart = await CartModel.findOneAndUpdate(
        { user: userId },
        { $pull: { cartItems: { product: productId } } },
        { new: true }
    );

    SuccessResponse(res, { message: "Product removed from cart", cart });
};

export const clearCart = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const cart = await CartModel.findOneAndDelete({ user: userId });

    if (!cart) throw new NotFound("Cart is already empty");

    SuccessResponse(res, { message: "Cart has been cleared successfully" });
};