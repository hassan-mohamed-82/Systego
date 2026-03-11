import { Request, Response } from "express";
import mongoose from "mongoose";
import { CartModel } from "../../models/schema/users/Cart";
import { OrderModel } from "../../models/schema/users/Order";
import { ProductModel } from "../../models/schema/admin/products";
import { AddressModel } from "../../models/schema/users/Address";
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

        // ب. التأكد من وجود العنوان وجلب بيانات الشحن منه (Populate Zone)
        const address = await AddressModel.findOne({ _id: shippingAddress, user: userId })
            .populate('city zone')
            .session(session);

        if (!address) throw new NotFound("Shipping address not found");

        // ج. حساب تكلفة الشحن (بناءً على النقاش السابق: الأولوية للزون ثم المدينة)
        const shippingCost = (address.zone as any)?.shippingCost || (address.city as any)?.shippingCost || 0;
        const finalTotalPrice = cart.totalCartPrice + shippingCost;

        // د. تحديث المخزن لكل منتج في السلة
        for (const item of cart.cartItems) {
            const product = await ProductModel.findById(item.product).session(session);

            const requestedQuantity = item.quantity ?? 1;

            if (!product || product.quantity == null || product.quantity < requestedQuantity) {
                throw new BadRequest(`Product ${product?.name || 'unknown'} is out of stock or insufficient`);
            }

            // خصم الكمية من المخزن
            product.quantity -= requestedQuantity;
            await product.save({ session });
        }

        // هـ. إنشاء الأوردر (أخذ لقطة Snapshot من البيانات الحالية)
        const order = await OrderModel.create([{
            user: userId,
            cartItems: cart.cartItems, // تخزين المنتجات بأسعارها وقت الشراء
            shippingAddress: {
                details: `${address.street}, Bldg ${address.buildingNumber}`,
                city: (address.city as any).name,
                zone: (address.zone as any).name,
            },
            shippingPrice: shippingCost,
            totalPrice: finalTotalPrice,
            paymentMethod,
            proofImage,
            status: 'pending'
        }], { session });

        // و. مسح السلة بعد نجاح العملية
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
        .sort({ createdAt: -1 });

    SuccessResponse(res, { orders });
};

export const getOrderDetails = async (req: Request, res: Response) => {
    const { id } = req.params;

    const order = await OrderModel.findOne({ _id: id, user: req.user?.id })
        .populate('cartItems.product', 'name image');

    if (!order) throw new NotFound("Order not found");

    SuccessResponse(res, { order });
};