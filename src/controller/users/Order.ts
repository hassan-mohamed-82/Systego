import { Request, Response } from "express";
import mongoose from "mongoose";
import { CartModel } from "../../models/schema/users/Cart";
import { OrderModel } from "../../models/schema/users/Order";
import { ProductModel } from "../../models/schema/admin/products";
import { AddressModel } from "../../models/schema/users/Address";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { PaymentMethodModel } from "../../models/schema/admin/payment_methods";
import { PaymobModel } from "../../models/schema/admin/Paymob";
import { CustomerModel } from "../../models/schema/admin/POS/customer";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";
import { PaymobService} from "../../utils/paymobService";

// ===============================
// 🟢 CREATE ORDER
// ===============================
export const createOrder = async (req: Request, res: Response): Promise<any> => {
    const userId = req.user?.id;
    const sessionId = req.headers["x-session-id"];
    const { shippingAddress, paymentMethod, proofImage } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1️⃣ Cart
        const cartQuery = userId ? { user: userId } : { sessionId };
        if (!userId && !sessionId) throw new BadRequest("User or session required");

        const cart = await CartModel.findOne(cartQuery).session(session);
        if (!cart || cart.cartItems.length === 0) {
            throw new BadRequest("Cart is empty");
        }

        // 2️⃣ Payment Method
        const paymentMethodDoc = await PaymentMethodModel.findOne({
            _id: paymentMethod,
            isActive: { $ne: false },
        }).session(session);

        if (!paymentMethodDoc) throw new BadRequest("Invalid payment method");

        if (paymentMethodDoc.type === "manual" && !proofImage) {
            throw new BadRequest("Proof image required for manual payment");
        }

        // 3️⃣ Address
        const address = await AddressModel.findOne({
            _id: shippingAddress,
            user: userId,
        })
            .populate("city zone country")
            .session(session);

        if (!address) throw new NotFound("Address not found");

        const populatedAddress = address as any;

        // 4️⃣ Shipping
        const productIds = cart.cartItems.map((i) => i.product);

        const freeShippingProductsCount = await ProductModel.countDocuments({
            _id: { $in: productIds },
            free_shipping: true,
        }).session(session);

        const shippingSettings = await ShippingSettingsModel.findOne({
            singletonKey: "default",
        }).session(session);

        let shippingCost = 0;

        if (shippingSettings?.freeShippingEnabled || freeShippingProductsCount > 0) {
            shippingCost = 0;
        } else if (shippingSettings?.shippingMethod === "flat_rate") {
            shippingCost = Number(shippingSettings.flatRate || 0);
        } else {
            shippingCost =
                Number(populatedAddress.zone?.shipingCost) ||
                Number(populatedAddress.city?.shipingCost) ||
                0;
        }

        // 5️⃣ Products & Stock
        let productsTotal = 0;
        const finalItems: any[] = [];

        for (const item of cart.cartItems) {
            const qty = item.quantity ?? 1;

            const product = await ProductModel.findOneAndUpdate(
                { _id: item.product, quantity: { $gte: qty } },
                { $inc: { quantity: -qty } },
                { new: true, session }
            );

            if (!product) throw new BadRequest("Product out of stock");

            const price = product.price || 0;
            productsTotal += price * qty;

            finalItems.push({
                product: product._id.toString(),
                quantity: qty,
                price,
            });
        }

        const totalPrice = productsTotal + shippingCost;

        const shippingAddressData = {
            details: `${populatedAddress.street}`,
            city: populatedAddress.city?.name || "",
            zone: populatedAddress.zone?.name || "",
        };

        // 6️⃣ Create Order
        const order = await OrderModel.create(
            [
                {
                    user: userId,
                    cartItems: finalItems,
                    shippingAddress: shippingAddressData,
                    shippingPrice: shippingCost,
                    totalOrderPrice: totalPrice,
                    paymentMethod: paymentMethod.toString(),
                    proofImage,
                    status: "pending",
                    paymentGateway:
                        paymentMethodDoc.type === "automatic" ? "paymob" : "manual",
                    paymentStatus:
                        paymentMethodDoc.type === "automatic" ? "pending" : "unpaid",
                },
            ],
            { session }
        );

        let paymobData: any = null;

        // ===============================
        // 🟢 PAYMOB INTEGRATION
        // ===============================
        if (paymentMethodDoc.type === "automatic") {
            const paymobConfig = await PaymobModel.findOne({
                payment_method_id: paymentMethodDoc._id,
                isActive: true,
            }).session(session);

            if (!paymobConfig) throw new BadRequest("Paymob not configured");

            const customer = await CustomerModel.findById(userId).session(session);
            if (!customer) throw new NotFound("Customer not found");

            const authToken = await PaymobService.getAuthToken(
                paymobConfig.api_key
            );

            const amountCents = Math.round(totalPrice * 100);

            const paymobOrderId = await PaymobService.createOrder(
                authToken,
                amountCents,
                order[0]._id.toString()
            );

            const billingData = {
                first_name: customer.name || "Customer",
                last_name: "User",
                email: customer.email || "test@test.com",
                phone_number: customer.phone_number || "01000000000",
                apartment: "NA",
                floor: "NA",
                street: populatedAddress.street || "NA",
                building: populatedAddress.buildingNumber || "NA",
                shipping_method: "NA",
                postal_code: "NA",
                city: (populatedAddress.city as any)?.name || "Cairo",
                country: "EG",
                state: (populatedAddress.zone as any)?.name || "NA",
            };

            const paymentToken = await PaymobService.generatePaymentKey(
                authToken,
                amountCents,
                paymobOrderId,
                Number(paymobConfig.integration_id),
                billingData
            );

            const iframeUrl = PaymobService.getIframeUrl(
                paymobConfig.iframe_id,
                paymentToken
            );

            order[0].paymobOrderId = String(paymobOrderId);
            order[0].paymobIframeUrl = iframeUrl;

            await order[0].save({ session });

            paymobData = {
                paymobOrderId: String(paymobOrderId),
                iframeUrl,
            };
        }

        // 7️⃣ Clear cart
        await CartModel.findOneAndDelete(cartQuery).session(session);

        await session.commitTransaction();
        session.endSession();

        return SuccessResponse(
            res,
            {
                message: "Order created successfully",
                order: order[0],
                payment: paymobData,
            },
            201
        );
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
};

// ===============================
// 🟢 GET MY ORDERS
// ===============================
export const getMyOrders = async (req: Request, res: Response) => {
    const orders = await OrderModel.find({ user: req.user?.id })
        .populate("paymentMethod", "name ar_name")
        .sort({ createdAt: -1 });

    SuccessResponse(res, { orders });
};

// ===============================
// 🟢 ORDER DETAILS
// ===============================
export const getOrderDetails = async (req: Request, res: Response) => {
    const order = await OrderModel.findOne({
        _id: req.params.id,
        user: req.user?.id,
    })
        .populate("cartItems.product", "name image")
        .populate("paymentMethod", "name ar_name");

    if (!order) throw new NotFound("Order not found");

    SuccessResponse(res, { order });
};