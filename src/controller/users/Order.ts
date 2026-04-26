import { Request, Response } from "express";
import mongoose from "mongoose";
import { CartModel } from "../../models/schema/users/Cart";
import { OrderModel } from "../../models/schema/users/Order";
import { ProductModel } from "../../models/schema/admin/products";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { AddressModel } from "../../models/schema/users/Address";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { PaymentMethodModel } from "../../models/schema/admin/payment_methods";
import { PaymobModel } from "../../models/schema/admin/Paymob";
import { GeideaModel } from "../../models/schema/admin/Geidea";
import { CustomerModel } from "../../models/schema/admin/POS/customer";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";
import { PaymobService } from "../../utils/paymobService";
import { initializeGeideaPayment } from "../../utils/geadiaService";
import { CityModels } from "../../models/schema/admin/City";
import { ZoneModel } from "../../models/schema/admin/Zone";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { FawryModel } from "../../models/schema/admin/Fawry";
import { FawryService } from "../../utils/fawryService";
import { CouponModel } from "../../models/schema/admin/coupons";
import { ServiceFeeModel } from "../../models/schema/admin/ServiceFee";
import { TaxesModel } from "../../models/schema/admin/Taxes";

// ===============================
// 🟢 CREATE ORDER
export const createOrder = async (req: Request, res: Response): Promise<any> => {
    const userId = req.user?.id;
    const sessionId = req.headers["x-session-id"] as string;
    const { shippingAddress, paymentMethod, proofImage, orderType = "delivery", warehouseId } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();
    let isTransactionCommitted = false;

    try {
        // 1️⃣ Find Cart
        if (!userId && !sessionId) {
            throw new BadRequest("User ID or Session ID is required to find your cart");
        }

        const cartQuery = userId ? { user: userId } : { sessionId: sessionId };

        // 2️⃣ Get Cart and Prepared Data
        const cart = await CartModel.findOne(cartQuery)
            .populate({ path: 'cartItems.product', select: 'name ar_name free_shipping' })
            .session(session);

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

        // 3️⃣ Address, Warehouse, Shipping Cost
        let shippingCost = 0;
        let resolvedWarehouseId: any = null;
        let shippingAddressData: any = null;
        let rawAddressForPaymob: any = {};

        if (!orderType) throw new BadRequest("orderType is required");
        if (orderType !== "pickup" && orderType !== "delivery") throw new BadRequest("Invalid orderType");

        if (orderType === "pickup") {
            // PICKUP: require a warehouseId
            if (!warehouseId) throw new BadRequest("warehouseId is required for pickup orders");
            const warehouse = await WarehouseModel.findOne({ _id: warehouseId, Is_Online: true }).session(session);
            if (!warehouse) throw new NotFound("Warehouse not found or not available");
            resolvedWarehouseId = warehouse._id;
            shippingCost = 0; // no shipping for pickup
        }
        else if (orderType === "delivery") {
            // 1. تحديد المخزن
            const onlineWarehouse = await WarehouseModel.findOne({ Is_Online: true }).session(session);
            if (!onlineWarehouse) throw new BadRequest("No online warehouse available");
            resolvedWarehouseId = onlineWarehouse._id;

            // 2. جلب العنوان وحساب التكلفة المبدئية
            let initialShippingCost = 0;
            if (typeof shippingAddress === "string") {
                const addressDoc = await AddressModel.findOne({ _id: shippingAddress, user: userId }).populate("city zone country").session(session);
                if (!addressDoc) throw new NotFound("Address not found");
                shippingAddressData = { details: addressDoc.street, city: (addressDoc as any).city?.name, zone: (addressDoc as any).zone?.name };
                initialShippingCost = Number((addressDoc as any).zone?.shipingCost || (addressDoc as any).city?.shipingCost || 0);
            } else {
                const [cityDoc, zoneDoc] = await Promise.all([
                    CityModels.findById(shippingAddress.city).session(session),
                    ZoneModel.findById(shippingAddress.zone).session(session)
                ]);
                shippingAddressData = { details: shippingAddress.street, city: cityDoc?.name, zone: zoneDoc?.name };
                initialShippingCost = Number(zoneDoc?.shipingCost || cityDoc?.shipingCost || 0);
            }

            // 3. تطبيق قواعد الشحن (Free / Flat Rate / Zone Rate)
            const shippingSettings = await ShippingSettingsModel.findOne({ singletonKey: "default" }).session(session);
            const hasFreeShippingProduct = cart.cartItems.some((i: any) => i.product.free_shipping);

            if (shippingSettings?.freeShippingEnabled || hasFreeShippingProduct) {
                shippingCost = 0;
            } else if (shippingSettings?.shippingMethod === "flat_rate") {
                shippingCost = Number(shippingSettings.flatRate || 0);
            } else {
                shippingCost = initialShippingCost; // نعتمد هنا على الحسبة اللي عملناها فوق من الـ Zone/City
            }
        }

        // 4️⃣ Warehouse discount and prepare items
        const finalItems: any[] = [];
        for (const item of cart.cartItems) {
            const qty = item.quantity;
            const variantId = item.variant;

            const stockUpdate = await Product_WarehouseModel.findOneAndUpdate(
                { productId: item.product._id, warehouseId: resolvedWarehouseId, productPriceId: variantId || null, quantity: { $gte: qty } },
                { $inc: { quantity: -qty } },
                { new: true, session }
            );
            if (!stockUpdate) throw new BadRequest(`Product ${(item.product as any).name} is not available in the warehouse`);

            await ProductModel.findByIdAndUpdate(item.product._id, { $inc: { quantity: -qty } }, { session });
            if (variantId) await mongoose.model("ProductPrice").findByIdAndUpdate(variantId, { $inc: { quantity: -qty } }, { session });

            finalItems.push({ product: item.product._id, variant: variantId, quantity: qty, price: item.price });
        }

        // 5️⃣ Final calculations from cart
        const productsTotal = cart.totalCartPrice;
        const totalTaxAmount = cart.taxAmount || 0;
        const totalServiceFee = cart.serviceFee || 0;
        let couponDiscount = 0;
        let appliedCouponId = null;


        if (cart.coupon) {
            const coupon = await CouponModel.findById(cart.coupon).session(session);
            if (coupon && coupon.available > 0) {
                couponDiscount = cart.couponDiscount;
                appliedCouponId = coupon._id;
                coupon.available -= 1;
                await coupon.save({ session });
            }
        }

        const totalPrice = (productsTotal + shippingCost + totalServiceFee + totalTaxAmount) - couponDiscount;

        // 6️⃣ Get payment gateways configurations
        const geideaConfig = paymentMethodDoc.type === "automatic"
            ? await GeideaModel.findOne({ payment_method_id: paymentMethodDoc._id, isActive: true }).session(session) : null;

        const paymobConfig = paymentMethodDoc.type === "automatic"
            ? await PaymobModel.findOne({ payment_method_id: paymentMethodDoc._id, isActive: true }).session(session) : null;

        const fawryConfig = paymentMethodDoc.type === "automatic"
            ? await FawryModel.findOne({ payment_method_id: paymentMethodDoc._id, isActive: true }).session(session) : null;

        let paymentGateway: "manual" | "paymob" | "geidea" | "fawry" = "manual";
        if (paymentMethodDoc.type === "automatic") {
            if (geideaConfig) paymentGateway = "geidea";
            else if (paymobConfig) paymentGateway = "paymob";
            else if (fawryConfig) paymentGateway = "fawry";
            else throw new BadRequest("No active automatic gateway config found for selected payment method");
        }

        // 7️⃣ Create Order
        const order = await OrderModel.create(
            [
                {
                    user: userId || null,
                    orderType,
                    warehouse: resolvedWarehouseId || undefined,
                    cartItems: finalItems,
                    shippingAddress: shippingAddressData,
                    shippingPrice: shippingCost,
                    totalOrderPrice: productsTotal, // old price
                    totalPriceAfterDiscount: totalPrice, // new price after discount
                    taxAmount: totalTaxAmount,
                    serviceFee: totalServiceFee,
                    coupon: appliedCouponId,
                    couponDiscount: couponDiscount,
                    paymentMethod: paymentMethod.toString(),
                    proofImage,
                    status: "pending",
                    paymentGateway,
                    paymentStatus:
                        paymentMethodDoc.type === "automatic" ? "pending" : "unpaid",
                },
            ],
            { session }
        );

        let paymentData: any = null;
        let shouldClearCart = true;

        // ===============================
        // 🟢 PAYMENT INTEGRATIONS
        // ===============================
        if (paymentGateway !== "manual") {
            try {
                const customer = userId ? await CustomerModel.findById(userId).session(session) : null;

                if (paymentGateway === "paymob") {
                    if (!paymobConfig) throw new BadRequest("Paymob not configured");

                    const authToken = await PaymobService.getAuthToken(paymobConfig.api_key);
                    const amountCents = Math.round(totalPrice * 100);
                    const paymobOrderId = await PaymobService.createOrder(authToken, amountCents, order[0]._id.toString());

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
                        authToken, amountCents, paymobOrderId, Number(paymobConfig.integration_id), billingData
                    );

                    const iframeUrl = PaymobService.getIframeUrl(paymobConfig.iframe_id, paymentToken);

                    order[0].paymobOrderId = String(paymobOrderId);
                    order[0].paymobIframeUrl = iframeUrl;
                    await order[0].save({ session });

                    paymentData = { paymobOrderId: String(paymobOrderId), iframeUrl };

                } else if (paymentGateway === "geidea") {
                    if (!geideaConfig) throw new BadRequest("Geidea not configured");

                    const geideaPayment = await initializeGeideaPayment({
                        localOrderId: order[0]._id.toString(),
                        amount: totalPrice,
                        geideaConfig: { publicKey: geideaConfig.publicKey, apiPassword: geideaConfig.apiPassword },
                        customer,
                        address: rawAddressForPaymob,
                    });

                    (order[0] as any).geideaSessionId = geideaPayment.geideaSessionId;
                    await order[0].save({ session });

                    paymentData = { geideaSessionId: geideaPayment.geideaSessionId, iframeUrl: geideaPayment.iframeUrl };

                } else if (paymentGateway === "fawry") {
                    if (!fawryConfig) throw new BadRequest("Fawry not configured");

                    const fawryItems = finalItems.map(item => ({
                        itemId: item.product.toString(),
                        description: "Product",
                        price: item.price,
                        quantity: item.quantity
                    }));

                    if (shippingCost > 0) {
                        fawryItems.push({ itemId: "SHIPPING", description: "Shipping Fees", price: shippingCost, quantity: 1 });
                    }

                    const fawryPayment: any = await FawryService.createChargeRequest({
                        merchantCode: fawryConfig.merchantCode,
                        secureKey: fawryConfig.secureKey,
                        merchantRefNum: order[0]._id.toString(),
                        customerProfileId: userId?.toString() || "guest",
                        customerName: customer?.name || "Guest Customer",
                        customerMobile: customer?.phone_number || "01000000000",
                        customerEmail: customer?.email || "guest@systego.com",
                        amount: totalPrice,
                        returnUrl: process.env.FAWRY_RETURN_URL || "https://bcknd.systego.net/api/payment/success",
                        items: fawryItems,
                        isSandbox: fawryConfig.sandboxMode
                    });

                    (order[0] as any).fawryReferenceId = fawryPayment.referenceNumber;
                    await order[0].save({ session });

                    paymentData = {
                        referenceNumber: fawryPayment.referenceNumber,
                        iframeUrl: fawryPayment.nextAction?.redirectUrl || null,
                    };
                }
            } catch (gatewayError: any) {
                // إرجاع الكميات للمخزن في حالة فشل البوابة
                for (const item of finalItems) {
                    await Product_WarehouseModel.updateOne(
                        { productId: item.product, warehouseId: resolvedWarehouseId },
                        { $inc: { quantity: item.quantity } },
                        { session }
                    );
                    await ProductModel.updateOne(
                        { _id: item.product },
                        { $inc: { quantity: item.quantity } },
                        { session }
                    );
                }

                order[0].status = "rejected";
                order[0].paymentStatus = "failed";

                if (paymentGateway === "paymob") {
                    order[0].paymobCallbackPayload = { paymentInitError: gatewayError?.message || "Payment initialization failed" };
                } else if (paymentGateway === "geidea") {
                    (order[0] as any).geideaCallbackPayload = { paymentInitError: gatewayError?.message || "Payment initialization failed" };
                    order[0].markModified("geideaCallbackPayload");
                } else if (paymentGateway === "fawry") {
                    (order[0] as any).fawryCallbackPayload = { paymentInitError: gatewayError?.message || "Payment initialization failed" };
                    order[0].markModified("fawryCallbackPayload");
                }

                await order[0].save({ session });
                shouldClearCart = false;

                await session.commitTransaction();
                isTransactionCommitted = true;
                session.endSession();

                throw new BadRequest(gatewayError?.message || "Payment failed. Order marked as rejected");
            }
        }

        // 7️⃣ Clear cart
        if (shouldClearCart) {
            await CartModel.findOneAndDelete(cartQuery).session(session);
        }

        await session.commitTransaction();
        isTransactionCommitted = true;
        session.endSession();

        return SuccessResponse(res, {
            message: "Order created successfully",
            order: order[0],
            payment: paymentData,
        }, 201);

    } catch (err) {
        if (!isTransactionCommitted) {
            await session.abortTransaction();
            session.endSession();
        }
        throw err;
    }
};

// ===============================
// 🟢 GET MY ORDERS
// ===============================
export const getMyOrders = async (req: Request, res: Response) => {
    const orders = await OrderModel.find({ user: req.user?.id })
        .populate("paymentMethod", "name ar_name")
        .populate("warehouse", "name")
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
        .populate("cartItems.product", "name ar_name image")
        .populate({
            path: "cartItems.variant",
            populate: { path: "productId", select: "name ar_name" }
        })
        .populate("paymentMethod", "name ar_name")
        .populate("warehouse", "name");

    if (!order) throw new NotFound("Order not found");

    SuccessResponse(res, { order });
};

// ===============================
// 🟢 VERIFY PAYMOB PAYMENT STATUS
// ===============================
export const verifyPaymobPaymentStatus = async (req: Request, res: Response): Promise<any> => {
    const { orderId } = req.params;
    const userId = req.user?.id;

    const order = await OrderModel.findOne({
        _id: orderId,
        user: userId,
    });

    if (!order) throw new NotFound("Order not found");

    if (order.paymentGateway !== "paymob") {
        throw new BadRequest("Order is not a Paymob order");
    }

    if (!order.paymobOrderId) {
        throw new BadRequest("Order does not have a Paymob transaction");
    }

    try {
        const paymobConfig = await PaymobModel.findOne({
            isActive: true,
        });

        if (!paymobConfig) {
            throw new BadRequest("Paymob configuration not found");
        }

        // Get auth token and fetch transactions
        const authToken = await PaymobService.getAuthToken(paymobConfig.api_key);
        const transactions = await PaymobService.getOrderTransactions(
            authToken,
            Number(order.paymobOrderId)
        );

        const status = PaymobService.getLatestTransactionStatus(transactions);

        // If payment was successful and order status is still pending, update it
        if (status.success && order.status === "pending") {
            order.status = "approved";
            order.paymentStatus = "paid";
            order.paymobTransactionId = String(status.transactionId);
            order.paymobCallbackPayload = status;
            await order.save();
        }
        // If payment failed or voided and order status is still pending, mark as rejected
        else if (
            (!status.success || status.isVoided) &&
            order.status === "pending"
        ) {
            order.status = "rejected";
            order.paymentStatus = "failed";
            order.paymobCallbackPayload = status;
            await order.save();
        }

        return SuccessResponse(res, {
            orderId: order._id,
            currentStatus: order.status,
            paymentStatus: order.paymentStatus,
            paymobStatus: status,
            updated: true,
        });
    } catch (error: any) {
        throw new BadRequest(`Failed to verify payment: ${error.message}`);
    }
};