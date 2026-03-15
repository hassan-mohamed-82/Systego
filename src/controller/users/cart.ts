import { CartModel } from "../../models/schema/users/Cart";
import { ProductModel } from "../../models/schema/admin/products";
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

    if ((item.quantity ?? 0) < quantity) {
        throw new BadRequest("Not enough stock available");
    }

    let cart = await CartModel.findOne({ user: userId });

    if (cart) {
        const existingItem = cart.cartItems.findIndex(item => item.product.toString() === productId);
        if (existingItem !== -1) {
            cart.cartItems[existingItem].quantity += quantity;
        } else {
            cart.cartItems.push({ product: productId, quantity, price: item.price });
        }
        await cart.save();
    } else {
        cart = await CartModel.create({
            user: userId,
            cartItems: [{ product: productId, quantity, price: item.price }],
        });
    }

    SuccessResponse(res, { message: "Cart added successfully", cart }, 201);
};

export const getCart = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const cart = await CartModel.find({ user: userId })

    if (!cart) {
        return SuccessResponse(res, { message: "Cart is empty", cartItems: [], totalCartPrice: 0 });
    }

    SuccessResponse(res, { message: "Cart fetched successfully", cart });
};

export const updateQuantity = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { productId, quantity } = req.body;

    const cart = await CartModel.findOne({ user: userId });
    if (!cart) throw new NotFound("Cart not found");

    const itemIndex = cart.cartItems.findIndex(p => p.product.toString() === productId);
    if (itemIndex === -1) throw new NotFound("Product not found in cart");

    cart.cartItems[itemIndex].quantity = quantity;
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