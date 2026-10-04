// src/controller/users/Order.js
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
import { DiscountModel } from "../../models/schema/admin/Discount";
import { saveBase64Image } from "../../utils/handleImages";
import { autoAssignOrder } from "../../services/deliveryAssignment.service";
import { UserModel } from "../../models/schema/admin/User";

// ===============================
// 🟢 CREATE ORDER
// ===============================
export const createOrder = async (
  req: Request,
  res: Response,
): Promise<any> => {
  const userId = req.user?.id;
  const sessionId = req.headers["x-session-id"] as string;
  const {
    shippingAddress,
    paymentMethod,
    proofImage,
    orderType = "delivery",
    warehouseId,
  } = req.body;

  try {
    // 1️⃣ Find Cart
    if (!userId && !sessionId) {
      throw new BadRequest(
        "User ID or Session ID is required to find your cart",
      );
    }

    const cartQuery = userId ? { user: userId } : { sessionId: sessionId };

    const cart = await CartModel.findOne(cartQuery).populate({
      path: "cartItems.product",
      select: "name ar_name free_shipping price discountId",
    });

    if (!cart || cart.cartItems.length === 0) {
      throw new BadRequest("Cart is empty");
    }

    // 2️⃣ Payment Method
    const paymentMethodDoc = await PaymentMethodModel.findOne({
      _id: paymentMethod,
      isActive: { $ne: false },
    });

    if (!paymentMethodDoc) throw new BadRequest("Invalid payment method");

    const name = (paymentMethodDoc.name || "").trim().toLowerCase();
    const arName = (paymentMethodDoc.ar_name || "").trim();

    const isCash =
      name === "cash" ||
      arName === "كاش" ||
      name.includes("cash") ||
      arName.includes("كاش");

    const requiresProof =
      (paymentMethodDoc as any).requiresProof === true ||
      (paymentMethodDoc.type === "manual" && !isCash);

    const hasProof =
      typeof proofImage === "string" && proofImage.trim().length > 0;

    if (requiresProof && !hasProof) {
      throw new BadRequest("Proof image required for manual payment");
    }

    // 3️⃣ Address, Warehouse, Shipping Cost
    let shippingCost = 0;
    let resolvedWarehouseId: any = null;
    let shippingAddressData: any = null;
    let rawAddressForPaymob: any = {};

    if (!orderType) throw new BadRequest("orderType is required");
    if (orderType !== "pickup" && orderType !== "delivery")
      throw new BadRequest("Invalid orderType");

    if (orderType === "pickup") {
      if (!warehouseId)
        throw new BadRequest("warehouseId is required for pickup orders");
      const warehouse = await WarehouseModel.findOne({
        _id: warehouseId,
        Is_Online: true,
      });
      if (!warehouse)
        throw new NotFound("Warehouse not found or not available");
      resolvedWarehouseId = warehouse._id;
      shippingCost = 0;
    } else if (orderType === "delivery") {
      const onlineWarehouse = await WarehouseModel.findOne({
        Is_Online: true,
      });
      if (!onlineWarehouse)
        throw new BadRequest("No online warehouse available");
      resolvedWarehouseId = onlineWarehouse._id;

      let initialShippingCost = 0;

      // ═══════════════════════════════════════════════════════════
      // 🔀 Address from ID (string)
      // ═══════════════════════════════════════════════════════════
      if (typeof shippingAddress === "string") {
        const addressDoc = await AddressModel.findOne({
          _id: shippingAddress,
          user: userId,
        }).populate("city zone country");
        if (!addressDoc) throw new NotFound("Address not found");

        shippingAddressData = {
          details: addressDoc.street,
          city: (addressDoc as any).city?.name,
          zone: (addressDoc as any).zone?.name,
          street: addressDoc.street,
          apartmentNumber: addressDoc.apartmentNumber,
          floorNumber: addressDoc.floorNumber,
          buildingNumber: addressDoc.buildingNumber,
          uniqueIdentifier: addressDoc.uniqueIdentifier,

          // 🆕 Bosta fields (لو العميل حفظهم)
          bostaCityId: (addressDoc as any).bostaCityId || "",
          bostaCityName: (addressDoc as any).bostaCityName || "",
          bostaZoneId: (addressDoc as any).bostaZoneId || "",
          bostaZoneName: (addressDoc as any).bostaZoneName || "",
          bostaDistrictId: (addressDoc as any).bostaDistrictId || "",
          bostaDistrictName: (addressDoc as any).bostaDistrictName || "",
        };

        rawAddressForPaymob = {
          apartmentNumber: addressDoc.apartmentNumber,
          floorNumber: addressDoc.floorNumber,
          buildingNumber: addressDoc.buildingNumber,
          uniqueIdentifier: addressDoc.uniqueIdentifier,
          street: addressDoc.street,
        };

        // Shipping cost: self من zone، bosta = 0
        const isBosta = (addressDoc as any).bostaCityId;
        if (isBosta) {
          initialShippingCost = 0;
        } else {
          initialShippingCost = Number(
            (addressDoc as any).zone?.shipingCost ||
              (addressDoc as any).city?.shipingCost ||
              0,
          );
        }
      } else {
        // ═══════════════════════════════════════════════════════════
        // 🔀 Address as object
        // ═══════════════════════════════════════════════════════════
        const isBosta =
          shippingAddress.bostaCityId && shippingAddress.bostaDistrictId;

        if (isBosta) {
          // ── Bosta address ──
          shippingAddressData = {
            details: shippingAddress.street,
            street: shippingAddress.street,
            city: shippingAddress.bostaCityName || "",
            zone:
              shippingAddress.bostaZoneName ||
              shippingAddress.bostaDistrictName ||
              "",
            apartmentNumber: shippingAddress.apartmentNumber,
            floorNumber: shippingAddress.floorNumber,
            buildingNumber: shippingAddress.buildingNumber,
            uniqueIdentifier: shippingAddress.uniqueIdentifier,

            // Bosta fields
            bostaCityId: shippingAddress.bostaCityId,
            bostaCityName: shippingAddress.bostaCityName || "",
            bostaZoneId: shippingAddress.bostaZoneId || "",
            bostaZoneName: shippingAddress.bostaZoneName || "",
            bostaDistrictId: shippingAddress.bostaDistrictId,
            bostaDistrictName: shippingAddress.bostaDistrictName || "",
          };

          rawAddressForPaymob = {
            apartmentNumber: shippingAddress.apartmentNumber,
            floorNumber: shippingAddress.floorNumber,
            buildingNumber: shippingAddress.buildingNumber,
            uniqueIdentifier: shippingAddress.uniqueIdentifier,
            street: shippingAddress.street,
          };

          initialShippingCost = 0;
        } else {
          // ── Self address ──
          const [cityDoc, zoneDoc] = await Promise.all([
            CityModels.findById(shippingAddress.city),
            ZoneModel.findById(shippingAddress.zone),
          ]);

          shippingAddressData = {
            details: shippingAddress.street,
            city: cityDoc?.name,
            zone: zoneDoc?.name,
            street: shippingAddress.street,
            apartmentNumber: shippingAddress.apartmentNumber,
            floorNumber: shippingAddress.floorNumber,
            buildingNumber: shippingAddress.buildingNumber,
            uniqueIdentifier: shippingAddress.uniqueIdentifier,
          };

          rawAddressForPaymob = {
            apartmentNumber: shippingAddress.apartmentNumber,
            floorNumber: shippingAddress.floorNumber,
            buildingNumber: shippingAddress.buildingNumber,
            uniqueIdentifier: shippingAddress.uniqueIdentifier,
            street: shippingAddress.street,
          };

          initialShippingCost = Number(
            zoneDoc?.shipingCost || cityDoc?.shipingCost || 0,
          );
        }
      }

      const hasFreeShippingProduct = cart.cartItems.some(
        (i: any) => i.product.free_shipping,
      );

      if (hasFreeShippingProduct) {
        shippingCost = 0;
      } else {
        shippingCost = initialShippingCost;
      }
    }

    // 3.5️⃣ Discounts
    const discountIds = cart.cartItems
      .map((i: any) => i.product?.discountId)
      .filter((id: any) => !!id);

    const discounts = discountIds.length
      ? await DiscountModel.find({
          _id: { $in: discountIds },
          status: true,
          applyIn: "E-commerce",
        })
      : [];

    const discountMap = new Map(
      discounts.map((d: any) => [d._id.toString(), d]),
    );

    const computeEffectivePrice = (product: any): number => {
      const basePrice = Number(product.price || 0);
      const discount = product.discountId
        ? discountMap.get(product.discountId.toString())
        : null;

      if (!discount) return basePrice;

      if (discount.type === "percentage") {
        const discounted = basePrice - basePrice * discount.amount;
        return Math.max(discounted, 0);
      }

      return Math.max(basePrice - discount.amount, 0);
    };

    // 4️⃣ Prepare items
    const finalItems: any[] = [];
    let recalculatedProductsTotal = 0;

    for (const item of cart.cartItems) {
      const qty = item.quantity;
      const variantId = item.variant;

      const stockUpdate = await Product_WarehouseModel.findOne({
        productId: item.product._id,
        warehouseId: resolvedWarehouseId,
        productPriceId: variantId || null,
      });
      if (!stockUpdate)
        throw new BadRequest(
          `Product ${(item.product as any).name} is not available in the warehouse`,
        );

      const effectivePrice = computeEffectivePrice(item.product);
      recalculatedProductsTotal += effectivePrice * qty;

      finalItems.push({
        product: item.product._id,
        variant: variantId,
        quantity: qty,
        price: effectivePrice,
      });
    }

    // 5️⃣ Final calculations
    const productsTotal = recalculatedProductsTotal;
    const totalTaxAmount = cart.taxAmount || 0;
    const totalServiceFee = cart.serviceFee || 0;
    let couponDiscount = 0;
    let appliedCouponId = null;

    if (cart.coupon) {
      const coupon = await CouponModel.findById(cart.coupon);
      if (coupon && coupon.available > 0) {
        couponDiscount = cart.couponDiscount;
        appliedCouponId = coupon._id;
        coupon.available -= 1;
        await coupon.save();
      }
    }

    const totalPrice =
      productsTotal +
      shippingCost +
      totalServiceFee +
      totalTaxAmount -
      couponDiscount;

    // 6️⃣ Payment gateways
    const geideaConfig =
      paymentMethodDoc.type === "automatic"
        ? await GeideaModel.findOne({
            payment_method_id: paymentMethodDoc._id,
            isActive: true,
          })
        : null;

    const paymobConfig =
      paymentMethodDoc.type === "automatic"
        ? await PaymobModel.findOne({
            payment_method_id: paymentMethodDoc._id,
            isActive: true,
          })
        : null;

    const fawryConfig =
      paymentMethodDoc.type === "automatic"
        ? await FawryModel.findOne({
            payment_method_id: paymentMethodDoc._id,
            isActive: true,
          })
        : null;

    let paymentGateway: "manual" | "paymob" | "geidea" | "fawry" = "manual";
    if (paymentMethodDoc.type === "automatic") {
      if (geideaConfig) paymentGateway = "geidea";
      else if (paymobConfig) paymentGateway = "paymob";
      else if (fawryConfig) paymentGateway = "fawry";
      else
        throw new BadRequest(
          "No active automatic gateway config found for selected payment method",
        );
    }
    let imageUrl: string | undefined;
    if (proofImage) {
      imageUrl = await saveBase64Image(
        proofImage,
        Date.now().toString(),
        req,
        "orders",
      );
    }

    // ═══════════════════════════════════════════════════════════
    // ✅ 6.5) حدد الميثود الفعلي (من العنوان)
    // ═══════════════════════════════════════════════════════════
    const addressIsBosta =
      typeof shippingAddress === "object" &&
      !!(shippingAddress as any)?.bostaCityId &&
      !!(shippingAddress as any)?.bostaDistrictId;

    let finalMethod: "self" | "bosta" | null = null;

    if (orderType === "delivery") {
      if (typeof shippingAddress === "string") {
        // address ID — ناخد الميثود من activeMethod
        try {
          const superadminUser = await UserModel.findOne({ role: "superadmin" })
            .select("_id")
            .lean();

          if (superadminUser) {
            const settings = await ShippingSettingsModel.findOne({
              superadminId: (superadminUser as any)._id,
            })
              .select("activeMethod")
              .lean();

            finalMethod = (settings?.activeMethod as any) || "self";
          } else {
            finalMethod = "self";
          }
        } catch (err) {
          console.warn(
            "⚠️ Could not fetch activeMethod, defaulting to self:",
            err,
          );
          finalMethod = "self";
        }
      } else {
        // object — نحدد من bostaCityId
        finalMethod = addressIsBosta ? "bosta" : "self";
      }
    }

    // 7️⃣ Create Order
    const order = await OrderModel.create([
      {
        user: userId || null,
        orderType,
        warehouse: resolvedWarehouseId || undefined,
        cartItems: finalItems,
        shippingAddress: shippingAddressData,
        shippingPrice: shippingCost,
        totalOrderPrice: productsTotal,
        totalPriceAfterDiscount: totalPrice,
        taxAmount: totalTaxAmount,
        serviceFee: totalServiceFee,
        coupon: appliedCouponId,
        couponDiscount: couponDiscount,
        paymentMethod: paymentMethod.toString(),
        proofImage: imageUrl,
        status: "pending",
        paymentGateway,
        paymentStatus:
          paymentMethodDoc.type === "automatic" ? "pending" : "unpaid",
        shippingMethod: finalMethod,
        shipmentType: finalMethod,
      },
    ]);

    // ✅ statusHistory مبدئي
    order[0].statusHistory = [
      {
        status: "pending",
        description: "Order placed successfully",
        source: "customer",
        updatedBy: null,
        updatedAt: new Date(),
      },
    ] as any;
    await order[0].save();

    let paymentData: any = null;
    let shouldClearCart = true;

    // ===============================
    // 🟢 PAYMENT INTEGRATIONS
    // ===============================
    if (paymentGateway !== "manual") {
      try {
        const customer = userId ? await CustomerModel.findById(userId) : null;

        if (paymentGateway === "paymob") {
          if (!paymobConfig) throw new BadRequest("Paymob not configured");

          const authToken = await PaymobService.getAuthToken(
            paymobConfig.api_key,
          );
          const amountCents = Math.round(totalPrice * 100);
          const paymobOrderId = await PaymobService.createOrder(
            authToken,
            amountCents,
            order[0]._id.toString(),
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
            billingData,
          );

          const iframeUrl = PaymobService.getIframeUrl(
            paymobConfig.iframe_id,
            paymentToken,
          );

          order[0].paymobOrderId = String(paymobOrderId);
          order[0].paymobIframeUrl = iframeUrl;
          await order[0].save();

          paymentData = { paymobOrderId: String(paymobOrderId), iframeUrl };
        } else if (paymentGateway === "geidea") {
          if (!geideaConfig) throw new BadRequest("Geidea not configured");

          const geideaPayment = await initializeGeideaPayment({
            localOrderId: order[0]._id.toString(),
            amount: totalPrice,
            geideaConfig: {
              publicKey: geideaConfig.publicKey,
              apiPassword: geideaConfig.apiPassword,
            },
            customer,
            address: rawAddressForPaymob,
          });

          (order[0] as any).geideaSessionId = geideaPayment.geideaSessionId;
          await order[0].save();

          paymentData = {
            geideaSessionId: geideaPayment.geideaSessionId,
            iframeUrl: geideaPayment.iframeUrl,
          };
        } else if (paymentGateway === "fawry") {
          if (!fawryConfig) throw new BadRequest("Fawry not configured");

          const fawryItems = finalItems.map((item) => ({
            itemId: item.product.toString(),
            description: "Product",
            price: item.price,
            quantity: item.quantity,
          }));

          if (shippingCost > 0) {
            fawryItems.push({
              itemId: "SHIPPING",
              description: "Shipping Fees",
              price: shippingCost,
              quantity: 1,
            });
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
            returnUrl:
              process.env.FAWRY_RETURN_URL ||
              "https://bcknd.systego.net/api/payment/success",
            items: fawryItems,
            isSandbox: fawryConfig.sandboxMode,
          });

          (order[0] as any).fawryReferenceId = fawryPayment.referenceNumber;
          await order[0].save();

          paymentData = {
            referenceNumber: fawryPayment.referenceNumber,
            iframeUrl: fawryPayment.nextAction?.redirectUrl || null,
          };
        }
      } catch (gatewayError: any) {
        for (const item of finalItems) {
          await Product_WarehouseModel.updateOne(
            { productId: item.product, warehouseId: resolvedWarehouseId },
            { $inc: { quantity: item.quantity } },
          );
          await ProductModel.updateOne(
            { _id: item.product },
            { $inc: { quantity: item.quantity } },
          );
        }

        order[0].status = "rejected";
        order[0].paymentStatus = "failed";

        if (paymentGateway === "paymob") {
          order[0].paymobCallbackPayload = {
            paymentInitError:
              gatewayError?.message || "Payment initialization failed",
          };
        } else if (paymentGateway === "geidea") {
          (order[0] as any).geideaCallbackPayload = {
            paymentInitError:
              gatewayError?.message || "Payment initialization failed",
          };
          order[0].markModified("geideaCallbackPayload");
        } else if (paymentGateway === "fawry") {
          (order[0] as any).fawryCallbackPayload = {
            paymentInitError:
              gatewayError?.message || "Payment initialization failed",
          };
          order[0].markModified("fawryCallbackPayload");
        }

        await order[0].save();
        shouldClearCart = false;

        throw new BadRequest(
          gatewayError?.message || "Payment failed. Order marked as rejected",
        );
      }
    }

    // 7️⃣ Clear cart
    if (shouldClearCart) {
      await CartModel.findOneAndDelete(cartQuery);
    }

    // ═══════════════════════════════════════════════════════════
    // ✅ 8️⃣ Auto-assign لو shipmentType = "self"
    // ═══════════════════════════════════════════════════════════
    if (order[0].shipmentType === "self") {
      try {
        const superadminUser = await UserModel.findOne({ role: "superadmin" })
          .select("_id")
          .lean();

        if (superadminUser) {
          await autoAssignOrder(
            order[0]._id.toString(),
            (superadminUser as any)._id.toString(),
          );
        }
      } catch (assignError: any) {
        console.warn(
          `⚠️ Auto-assign skipped for order ${order[0]._id}: ${assignError.message}`,
        );
      }
    }

    return SuccessResponse(
      res,
      {
        message: "Order created successfully",
        order: order[0],
        payment: paymentData,
      },
      201,
    );
  } catch (err) {
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
  })
    .populate("cartItems.product", "name ar_name image")
    .populate({
      path: "cartItems.variant",
      populate: { path: "productId", select: "name ar_name" },
    })
    .populate("paymentMethod", "name ar_name")
    .populate("warehouse", "name");

  if (!order) throw new NotFound("Order not found");

  SuccessResponse(res, { order });
};

export const getOrderStatusByRef = async (req: Request, res: Response) => {
  const order = await OrderModel.findOne({
    reference: req.params.ref,
  }).populate([
    { path: "cartItems.product", select: "name ar_name image price" },
    { path: "warehouse", select: "name address phone email" },
    { path: "paymentMethod" },
  ]);

  if (!order) throw new NotFound("Order not found");

  SuccessResponse(res, { order });
};

// ===============================
// 🟢 VERIFY PAYMOB PAYMENT STATUS
// ===============================
export const verifyPaymobPaymentStatus = async (
  req: Request,
  res: Response,
): Promise<any> => {
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

    const authToken = await PaymobService.getAuthToken(paymobConfig.api_key);
    const transactions = await PaymobService.getOrderTransactions(
      authToken,
      Number(order.paymobOrderId),
    );

    const status = PaymobService.getLatestTransactionStatus(transactions);

    if (status.success && order.status === "pending") {
      order.status = "processing";
      order.paymentStatus = "paid";
      order.paymobTransactionId = String(status.transactionId);
      order.paymobCallbackPayload = status;

      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: "processing",
        description: "Payment verified via Paymob",
        source: "system",
        updatedBy: null,
        updatedAt: new Date(),
      } as any);

      await order.save();
    } else if (
      (!status.success || status.isVoided) &&
      order.status === "pending"
    ) {
      order.status = "rejected";
      order.paymentStatus = "failed";
      order.paymobCallbackPayload = status;

      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: "rejected",
        description: "Payment failed via Paymob",
        source: "system",
        updatedBy: null,
        updatedAt: new Date(),
      } as any);

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
