import { ProductModel } from '../../models/schema/admin/products';
import asyncHandler from 'express-async-handler';
import { NotFound } from '../../Errors/NotFound'
import { SuccessResponse } from '../../utils/response';
import { Request, Response } from "express";
import { CustomerModel } from '../../models/schema/admin/POS/customer';

// 1. Get All Products (With Wishlist Status)
export const getAllProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const products = await ProductModel.find().sort({ created_at: -1 });

    let wishlistIds: string[] = [];
    if (req.user?.id) {
        const user = await CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(id => id.toString());
        }
    }

    const productsWithStatus = products.map(product => {
        const productObj = product.toObject();
        return {
            ...productObj,
            is_favorite: wishlistIds.includes(productObj._id.toString())
        };
    });

    return SuccessResponse(res, {
        message: 'Products retrieved successfully',
        data: productsWithStatus
    }, 200);
});

// 2. Get Product By ID (With Wishlist Status)
export const getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const product = await ProductModel.findById(id);

    if (!product) {
        throw new NotFound('Product not found');
    }

    let isFavorite = false;
    if (req.user?.id) {
        const user = await CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            isFavorite = user.wishlist.some(wishId => wishId.toString() === id);
        }
    }

    const productData = {
        ...product.toObject(),
        is_favorite: isFavorite
    };

    return SuccessResponse(res, {
        message: 'Product retrieved successfully',
        data: productData
    }, 200);
});