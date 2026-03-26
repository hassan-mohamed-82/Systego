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
import { PaymobService } from "../../utils/paymobService";
import { CityModels } from "../../models/schema/admin/City";
import { ZoneModel } from "../../models/schema/admin/Zone";

// ===============================
// 🟢 CREATE ORDER
// ===============================
export const createOrder = async (req: Request, res: Response): Promise<any> => {
    const userId = req.user?.id;
    const sessionId = req.headers["x-session-id"] as string;
    const { shippingAddress, paymentMethod, proofImage } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1️⃣ تحديد السلة (Cart)
        if (!userId && !sessionId) {
            throw new BadRequest("User ID or Session ID is required to find your cart");
        }

        const cartQuery = userId ? { user: userId } : { sessionId: sessionId };
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

        // 3️⃣ Hybrid Address Logic
        let shippingAddressData: any;
        let shippingCost = 0;
        let rawAddressForPaymob: any;

        if (typeof shippingAddress === "string") {
            // Registered user (ID): populate to get names and prices
            const addressDoc = await AddressModel.findOne({
                _id: shippingAddress,
                user: userId
            })
                .populate("city zone country")
                .session(session);

            if (!addressDoc) throw new NotFound("Address not found");

            const populated = addressDoc as any;
            shippingAddressData = {
                details: `${populated.street}`,
                city: populated.city?.name || "",
                zone: populated.zone?.name || "",
            };
            shippingCost = Number(populated.zone?.shipingCost || populated.city?.shipingCost || 0);
            rawAddressForPaymob = populated;
        } else {
            // حالة الضيف (Object): نجلب الموديلات يدوياً لحساب الشحن بدقة
            const [cityDoc, zoneDoc] = await Promise.all([
                CityModels.findById(shippingAddress.city).session(session),
                ZoneModel.findById(shippingAddress.zone).session(session)
            ]);

            shippingAddressData = {
                details: `${shippingAddress.street}`,
                city: cityDoc?.name || "",
                zone: zoneDoc?.name || "",
            };
            shippingCost = Number(zoneDoc?.shipingCost || cityDoc?.shipingCost || 0);
            rawAddressForPaymob = shippingAddress;
        }

        // 4️⃣ Shipping Settings
        const productIds = cart.cartItems.map((i) => i.product);

        const freeShippingProductsCount = await ProductModel.countDocuments({
            _id: { $in: productIds },
            free_shipping: true,
        }).session(session);

        const shippingSettings = await ShippingSettingsModel.findOne({
            singletonKey: "default",
        }).session(session);



        if (shippingSettings?.freeShippingEnabled || freeShippingProductsCount > 0) {
            shippingCost = 0;
        } else if (shippingSettings?.shippingMethod === "flat_rate") {
            shippingCost = Number(shippingSettings.flatRate || 0);
        } else {
            shippingCost =
                Number(rawAddressForPaymob.zone?.shipingCost) ||
                Number(rawAddressForPaymob.city?.shipingCost) ||
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

            if (!product) throw new BadRequest(`Product ${item.product} is out of stock`);

            const price = product.price || 0;
            productsTotal += price * qty;

            finalItems.push({
                product: product._id.toString(),
                quantity: qty,
                price,
            });
        }

        const totalPrice = productsTotal + shippingCost;

        // 6️⃣ Create Order
        const order = await OrderModel.create(
            [
                {
                    user: userId || null,
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

            // للضيوف: نحاول نجيب بيانات العميل لو موجود أو نستخدم بيانات افتراضية
            const customer = userId ? await CustomerModel.findById(userId).session(session) : null;

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
                first_name: customer?.name || "Guest",
                last_name: "Customer",
                email: customer?.email || "guest@systego.com",
                phone_number: customer?.phone_number || "01000000000",
                apartment: rawAddressForPaymob.apartmentNumber || "NA",
                floor: rawAddressForPaymob.floorNumber || "NA",
                street: shippingAddressData.details || "NA",
                building: rawAddressForPaymob.buildingNumber || "NA",
                shipping_method: "NA",
                postal_code: "NA",
                city: shippingAddressData.city || "Cairo",
                country: "EG",
                state: shippingAddressData.zone || "NA",
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