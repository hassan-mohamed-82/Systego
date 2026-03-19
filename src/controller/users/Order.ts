import { Request, Response } from "express";
import mongoose from "mongoose";
import { CartModel } from "../../models/schema/users/Cart";
import { OrderModel } from "../../models/schema/users/Order";
import { ProductModel } from "../../models/schema/admin/products";
import { AddressModel } from "../../models/schema/users/Address";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { PaymentMethodModel } from "../../models/schema/admin/payment_methods";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";

// (Checkout)
export const createOrder = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { shippingAddress, paymentMethod, proofImage } = req.body;

    // نبدأ الجلسة (Transaction) لضمان سلامة البيانات
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // أ. التأكد من وجود السلة وأنها ليست فارغة
        const cart = await CartModel.findOne({ user: userId }).session(session);
        if (!cart || cart.cartItems.length === 0) {
            throw new BadRequest("Your cart is empty");
        }

        // أ-2. تأكيد صحة وسيلة الدفع وأنها مفعلة
        const paymentMethodDoc = await PaymentMethodModel.findOne({ 
            _id: paymentMethod, 
            isActive: { $ne: false } 
        }).session(session);
        
        if (!paymentMethodDoc) {
            throw new BadRequest("Invalid or inactive payment method selected");
        }

        if (paymentMethodDoc.type === "manual" && !proofImage) {
            throw new BadRequest("Proof image is required for manual payment methods");
        }

        // ب. التأكد من وجود العنوان وجلب بيانات الشحن منه (Populate Zone)
        const address = await AddressModel.findOne({ _id: shippingAddress, user: userId })
            .populate('city zone')
            .session(session);

        if (!address) throw new NotFound("Shipping address not found");

        // ج. تحديد ما إذا كانت أياً من منتجات السلة مؤهلة للشحن المجاني (Marketing free shipping per product)
        const productIds = cart.cartItems.map((item) => item.product);
        const freeShippingProductsCount = await ProductModel.countDocuments({
            _id: { $in: productIds },
            free_shipping: true,
        }).session(session);

        const hasFreeShippingProduct = freeShippingProductsCount > 0;

        // د. جلب إعدادات الشحن الحالية (اختيار طريقة واحدة فقط)
        const shippingSettings = await ShippingSettingsModel.findOne({ singletonKey: "default" }).session(session);

        const selectedMethod = shippingSettings?.shippingMethod || "zone";
        const zoneShippingCost = (address.zone as any)?.shipingCost || (address.city as any)?.shipingCost || 0;

        let shippingCost = 0;

        if (shippingSettings?.freeShippingEnabled || hasFreeShippingProduct) {
            shippingCost = 0;
        } else if (selectedMethod === "flat_rate") {
            shippingCost = Number(shippingSettings?.flatRate || 0);
        } else if (selectedMethod === "carrier") {
            shippingCost = Number(shippingSettings?.carrierRate || 0);
        } else {
            shippingCost = Number(zoneShippingCost || 0);
        }

        // هـ. تحديث المخزن وإعادة احتساب أسعار المنتجات
        let actualProductsTotal = 0;
        const finalCartItems = [];

        for (const item of cart.cartItems) {
            const requestedQuantity = item.quantity ?? 1;

            // استخدام findOneAndUpdate لضمان عدم حدوث Race Condition
            const updatedProduct = await ProductModel.findOneAndUpdate(
                { _id: item.product, quantity: { $gte: requestedQuantity } },
                { $inc: { quantity: -requestedQuantity } },
                { session, new: true }
            );

            if (!updatedProduct) {
                throw new BadRequest(`Product with ID ${item.product} is out of stock or insufficient`);
            }

            const currentPrice = updatedProduct.price || 0;
            actualProductsTotal += (currentPrice * requestedQuantity);

            finalCartItems.push({
                product: updatedProduct._id,
                quantity: requestedQuantity,
                price: currentPrice
            });
        }

        const finalTotalPrice = actualProductsTotal + shippingCost;

        // و. إنشاء الأوردر (أخذ لقطة Snapshot من البيانات الحالية)
        const order = await OrderModel.create([{
            user: userId,
            cartItems: finalCartItems, // تخزين المنتجات بأسعارها الحالية
            shippingAddress: {
                details: `${address.street}, Bldg ${address.buildingNumber}`,
                city: (address.city as any)?.name || "",
                zone: (address.zone as any)?.name || "",
            },
            shippingPrice: shippingCost,
            totalOrderPrice: finalTotalPrice,
            paymentMethod,
            proofImage,
            status: 'pending'
        }], { session });

        // ز. مسح السلة بعد نجاح العملية
        await CartModel.findOneAndDelete({ user: userId }).session(session);

        // إنهاء العملية بنجاح
        await session.commitTransaction();
        session.endSession();

        SuccessResponse(res, { message: "Order placed successfully", order: order[0] }, 201);

    } catch (error: any) {
        // في حالة حدوث أي خطأ، تراجع عن كل التغييرات (خصم المخزن لن يتم)
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const getMyOrders = async (req: Request, res: Response) => {
    const orders = await OrderModel.find({ user: req.user?.id })
        .populate('paymentMethod', 'name ar_name')
        .sort({ createdAt: -1 });

    SuccessResponse(res, { orders });
};

export const getOrderDetails = async (req: Request, res: Response) => {
    const { id } = req.params;

    const order = await OrderModel.findOne({ _id: id, user: req.user?.id })
        .populate('cartItems.product', 'name image')
        .populate('paymentMethod', 'name ar_name');

    if (!order) throw new NotFound("Order not found");

    SuccessResponse(res, { order });
};