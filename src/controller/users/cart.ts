import { CartModel } from "../../models/schema/users/Cart";
import { ProductModel } from "../../models/schema/admin/products";
import { ProductPriceModel } from "../../models/schema/admin/product_price";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { ServiceFeeModel } from "../../models/schema/admin/ServiceFee";
import { TaxesModel } from "../../models/schema/admin/Taxes";
import { CouponModel } from "../../models/schema/admin/coupons";
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
        req.headers['x-session-id'] ||
        (req.body && req.body.sessionId) ||
        req.query?.sessionId;

    if (userId) return { user: userId };
    if (sessionId) return { sessionId: sessionId };

    throw new BadRequest("User ID or Session ID is required to manage cart");
};

// 1. إضافة منتج للسلة
export const addToCart = asyncHandler(async (req: Request, res: Response) => {
    const { productId, productVariantId, quantity } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
        throw new BadRequest("Product ID is invalid");
    }

    const product = await ProductModel.findById(productId);
    if (!product) throw new NotFound("Product not found");

    let price = product.price || 0;
    if (productVariantId) {
        if (!mongoose.isValidObjectId(productVariantId)) {
            throw new BadRequest("Product Variant ID is invalid");
        }
        const variant = await ProductPriceModel.findById(productVariantId);
        if (!variant) throw new NotFound("Product Variant not found");
        price = variant.price;
    }

    const query = getCartQuery(req);

    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select("_id");
    const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);

    const stockMatch: any = {
        productId: new mongoose.Types.ObjectId(productId),
        warehouseId: { $in: onlineWarehouseIds },
    };

    if (productVariantId) {
        stockMatch.productPriceId = new mongoose.Types.ObjectId(productVariantId);
    } else {
        stockMatch.productPriceId = null;
    }

    const stockData = await Product_WarehouseModel.aggregate([
        { $match: stockMatch },
        {
            $group: {
                _id: "$productId",
                totalQuantity: { $sum: "$quantity" },
            },
        },
    ]);

    const availableStock = stockData.length > 0 ? stockData[0].totalQuantity : 0;

    // جلب السلة الحالية لمعرفة الكمية الموجودة مسبقاً من هذا المنتج (بنفس الفاريانت)
    let cart = await CartModel.findOneAndUpdate(
        query,
        { $setOnInsert: { cartItems: [], totalCartPrice: 0 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const existingItem = cart.cartItems.find(i =>
        i.product.toString() === productId &&
        (productVariantId ? i.variant?.toString() === productVariantId : !i.variant)
    );
    const existingQuantity = existingItem ? existingItem.quantity : 0;

    // التأكد من أن الكمية المطلوبة + الموجودة لا تتخطى المخزون
    if (availableStock < (existingQuantity + quantity)) {
        throw new BadRequest(`Stock is not enough. Available stock: ${availableStock}`);
    }

    // --- تحديث محتويات السلة ---
    if (existingItem) {
        // إذا كان المنتج موجوداً، نقوم بتحديث الكمية والسعر الحالي
        const itemIndex = cart.cartItems.findIndex(i =>
            i.product.toString() === productId &&
            (productVariantId ? i.variant?.toString() === productVariantId : !i.variant)
        );
        cart.cartItems[itemIndex].quantity += quantity;
        cart.cartItems[itemIndex].price = price;
    } else {
        // إذا كان منتجاً جديداً، نضيفه للمصفوفة
        cart.cartItems.push({
            product: new mongoose.Types.ObjectId(productId) as any,
            variant: productVariantId ? new mongoose.Types.ObjectId(productVariantId) as any : undefined,
            quantity: quantity,
            price: price
        });
    }

    cart.markModified('cartItems');

    await cart.save();

    SuccessResponse(res, {
        message: "Cart updated successfully",
        cart
    }, 201);
});

// 1. إضافة منتج للسلة
// export const addToCart = asyncHandler(async (req: Request, res: Response) => {
//     const { productId, quantity } = req.body;
//     const query = getCartQuery(req);

//     if (!mongoose.isValidObjectId(productId)) throw new BadRequest("Invalid Product ID");

//     const item = await ProductModel.findById(productId);
//     if (!item) throw new NotFound("Product not found");

//     let cart = await CartModel.findOne(query);

//     let existingQuantity = 0;
//     if (cart) {
//         const existingItem = cart.cartItems.find(p => p.product.toString() === productId);
//         if (existingItem) existingQuantity = existingItem.quantity;
//     }

//     // جلب المخازن الأونلاين والكمية المتاحة فيها
//     const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select("_id");
//     const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);

//     const stockData = await Product_WarehouseModel.aggregate([
//         {
//             $match: {
//                 productId: new mongoose.Types.ObjectId(productId),
//                 warehouseId: { $in: onlineWarehouseIds },
//             },
//         },
//         {
//             $group: {
//                 _id: "$productId",
//                 totalQuantity: { $sum: "$quantity" },
//             },
//         },
//     ]);

//     const availableStock = stockData.length > 0 ? stockData[0].totalQuantity : 0;

//     if (availableStock < existingQuantity + quantity) {
//         throw new BadRequest("Not enough stock available");
//     }

//     if (cart) {
//         const existingItemIndex = cart.cartItems.findIndex(i => i.product.toString() === productId);
//         if (existingItemIndex !== -1) {
//             cart.cartItems[existingItemIndex].quantity += quantity;
//             cart.cartItems[existingItemIndex].price = item.price || 0;
//         } else {
//             // استخدام as any هنا مقبول مع الحفظ الذكي
//             cart.cartItems.push({ product: productId as any, quantity, price: item.price || 0 });
//         }
//         await cart.save();
//     } else {
//         // الحل الذكي: التأكد من أنواع البيانات عند الإنشاء لأول مرة
//         cart = await CartModel.create({
//             ...query,
//             cartItems: [{ product: new mongoose.Types.ObjectId(productId), quantity, price: item.price || 0 }],
//         });
//     }

//     SuccessResponse(res, { message: "Cart updated successfully", cart }, 201);
// });

// 2. جلب بيانات السلة وحساب الشحن
export const getCart = asyncHandler(async (req: Request, res: Response) => {
    const query = getCartQuery(req);
    const userId = query.user;

    const cart = await CartModel.findOne(query)
        .populate({
            path: 'cartItems.product',
            select: 'name ar_name image price price_after_discount free_shipping taxesId',
            populate: { path: 'taxesId' }
        })
        .populate({
            path: 'cartItems.variant',
            populate: {
                path: 'productId',
                select: 'name ar_name'
            }
        });

    if (!cart) {
        return SuccessResponse(res, {
            message: "Cart is empty",
            cart: { cartItems: [], totalCartPrice: 0 },
            shippingCost: 0
        });
    }

    const formattedCartItems = await Promise.all(cart.cartItems.map(async (item: any) => {
        if (item.variant) {
            const options = await mongoose.model("ProductPriceOption").find({ product_price_id: item.variant._id })
                .populate({
                    path: "option_id",
                    populate: { path: "variationId", select: "name ar_name" }
                }).lean();

            const groupedOptions: Record<string, any[]> = {};
            options.forEach((po: any) => {
                const opt = po.option_id;
                if (!opt || !opt.variationId) return;
                const varName = opt.variationId.name;
                if (!groupedOptions[varName]) groupedOptions[varName] = [];
                groupedOptions[varName].push({
                    _id: opt._id,
                    name: opt.name,
                    variationName: varName,
                    variationArName: opt.variationId.ar_name
                });
            });

            const variationsArray = Object.keys(groupedOptions).map(name => ({
                name,
                options: groupedOptions[name]
            }));

            return {
                ...item.toObject(),
                variantDetails: {
                    ...item.variant.toObject(),
                    variations: variationsArray
                }
            };
        }
        return item.toObject();
    }));

    let isModified = false;
    let hasFreeShippingProduct = false;
    let totalTaxAmount = 0;
    let totalCartPrice = 0;

    for (const item of cart.cartItems) {
        const product = item.product as any;
        const variant = item.variant as any;

        let currentPrice = product?.price || 0;
        if (variant) {
            currentPrice = variant.price;
        }

        if (currentPrice !== item.price) {
            item.price = currentPrice;
            isModified = true;
        }

        if (product?.free_shipping) hasFreeShippingProduct = true;

        // حساب الضرائب
        if (product?.taxesId) {
            const tax = product.taxesId as any;
            if (tax.status) {
                const itemTotal = item.price * item.quantity;
                if (tax.type === "percentage") {
                    totalTaxAmount += (itemTotal * tax.amount) / 100;
                } else {
                    totalTaxAmount += tax.amount * item.quantity;
                }
            }
        }
        totalCartPrice += item.price * item.quantity;
    }

    // حساب مصاريف الخدمة (Service Fees)
    const activeFees = await ServiceFeeModel.find({ module: "online", status: true });
    let totalServiceFee = 0;
    activeFees.forEach(fee => {
        if (fee.type === "percentage") {
            totalServiceFee += (totalCartPrice * fee.amount) / 100;
        } else {
            totalServiceFee += fee.amount;
        }
    });

    cart.taxAmount = totalTaxAmount;
    cart.serviceFee = totalServiceFee;
    cart.totalCartPrice = totalCartPrice;

    // إعادة حساب خصم الكوبون لو موجود
    if (cart.coupon) {
        const coupon = await CouponModel.findById(cart.coupon);
        if (coupon && coupon.available > 0 && new Date(coupon.expired_date) > new Date()) {
            if (totalCartPrice >= (coupon.minimum_amount_for_use || 0)) {
                if (coupon.type === "percentage") {
                    cart.couponDiscount = (totalCartPrice * coupon.amount) / 100;
                } else {
                    cart.couponDiscount = coupon.amount;
                }
            } else {
                cart.coupon = undefined;
                cart.couponDiscount = 0;
            }
        } else {
            cart.coupon = undefined;
            cart.couponDiscount = 0;
        }
    }

    cart.markModified('cartItems');
    await cart.save();

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
        cart: {
            ...cart.toObject(),
            cartItems: formattedCartItems
        },
        shippingCost
    });
});

// 6. تطبيق الكوبون
export const applyCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { couponCode } = req.body;
    const query = getCartQuery(req);

    const coupon = await CouponModel.findOne({ coupon_code: couponCode });
    if (!coupon) throw new NotFound("Coupon not found");

    if (coupon.available <= 0) throw new BadRequest("Coupon is out of stock");
    if (new Date(coupon.expired_date) < new Date()) throw new BadRequest("Coupon has expired");

    const cart = await CartModel.findOne(query);
    if (!cart) throw new NotFound("Cart not found");

    if (cart.totalCartPrice < (coupon.minimum_amount_for_use || 0)) {
        throw new BadRequest(`Cart total must be at least ${coupon.minimum_amount_for_use} to use this coupon`);
    }

    let discount = 0;
    if (coupon.type === "percentage") {
        discount = (cart.totalCartPrice * coupon.amount) / 100;
    } else {
        discount = coupon.amount;
    }

    cart.coupon = coupon._id as any;
    cart.couponDiscount = discount;
    await cart.save();

    SuccessResponse(res, { message: "Coupon applied successfully", cart });
});

// 3. تحديث الكمية
export const updateQuantity = asyncHandler(async (req: Request, res: Response) => {
    const { productId, productVariantId, quantity } = req.body;
    const query = getCartQuery(req);

    const product = await ProductModel.findById(productId);
    if (!product) throw new NotFound("Product not found");

    let price = product.price || 0;
    if (productVariantId) {
        const variant = await ProductPriceModel.findById(productVariantId);
        if (!variant) throw new NotFound("Product Variant not found");
        price = variant.price;
    }

    // جلب المخازن الأونلاين والكمية المتاحة فيها
    const onlineWarehouses = await WarehouseModel.find({ Is_Online: true }).select("_id");
    const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);

    const stockMatch: any = {
        productId: new mongoose.Types.ObjectId(productId),
        warehouseId: { $in: onlineWarehouseIds },
    };
    if (productVariantId) stockMatch.productPriceId = new mongoose.Types.ObjectId(productVariantId);
    else stockMatch.productPriceId = null;

    const stockData = await Product_WarehouseModel.aggregate([
        { $match: stockMatch },
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

    const itemIndex = cart.cartItems.findIndex(p =>
        p.product.toString() === productId &&
        (productVariantId ? p.variant?.toString() === productVariantId : !p.variant)
    );
    if (itemIndex === -1) throw new NotFound("Product not in cart");

    cart.cartItems[itemIndex].quantity = quantity;
    cart.cartItems[itemIndex].price = price;

    cart.markModified('cartItems'); // تأكيد التعديل
    await cart.save();

    SuccessResponse(res, { message: "Quantity updated", cart });
});

// 4. حذف منتج
export const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { productVariantId } = req.query; // استلام productVariantId من الـ Query
    const query = getCartQuery(req);

    const pullQuery: any = { product: productId };
    if (productVariantId) {
        pullQuery.variant = productVariantId;
    } else {
        pullQuery.variant = { $exists: false }; // أو null حسب التخزين
    }

    const cart = await CartModel.findOneAndUpdate(
        query,
        { $pull: { cartItems: pullQuery } },
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