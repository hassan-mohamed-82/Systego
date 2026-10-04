// src/controller/admin/Shipping.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { BostaShipmentModel } from "../../models/schema/admin/BostaShipment";
import { ProductModel } from "../../models/schema/admin/products";
import { CustomerModel } from "../../models/schema/admin/POS/customer";
import { getSuperadminId } from "../../utils/shipping/getSuperadminId";
import { getBostaCreds } from "../../utils/shipping/getBostaCreds";
import bostaService from "../../services/bosta.service";
import { OrderModel } from "../../models/schema/users/Order";

// ═══════════════════════════════════════════════════════════
// Helper: ensure settings
// ═══════════════════════════════════════════════════════════
const ensureSettings = async (superadminId: string) => {
  let settings = await ShippingSettingsModel.findOne({ superadminId });
  if (!settings) {
    settings = await ShippingSettingsModel.create({ superadminId });
  }
  return settings;
};

// ═══════════════════════════════════════════════════════════
// GET SHIPPING SETTINGS
// ═══════════════════════════════════════════════════════════
export const getShippingSettings = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  SuccessResponse(res, {
    message: "Shipping settings fetched successfully",
    settings,
  });
};

// ═══════════════════════════════════════════════════════════
// UPDATE SHIPPING SETTINGS
// ═══════════════════════════════════════════════════════════
export const updateShippingSettings = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);

  const {
    activeMethod,
    self: selfConfig,
    bosta: bostaConfig,
    freeShippingEnabled,
  } = req.body;

  if (activeMethod !== undefined) {
    if (!["self", "bosta"].includes(activeMethod)) {
      throw new BadRequest("activeMethod must be 'self' or 'bosta'");
    }
    settings.activeMethod = activeMethod;
  }

  if (selfConfig) {
    if (
      selfConfig.method &&
      !["zone", "flat_rate"].includes(selfConfig.method)
    ) {
      throw new BadRequest("self.method must be 'zone' or 'flat_rate'");
    }
    if (
      selfConfig.method === "flat_rate" &&
      selfConfig.flatRate === undefined
    ) {
      throw new BadRequest("self.flatRate is required for flat_rate method");
    }
    settings.self = { ...settings.self, ...selfConfig } as any;
  }

  if (bostaConfig) {
    if (
      bostaConfig.apiKey !== undefined &&
      String(bostaConfig.apiKey).trim() === ""
    ) {
      throw new BadRequest("bosta.apiKey cannot be empty");
    }
    const willBeEnabled = bostaConfig.enabled ?? settings.bosta?.enabled;
    const newKey = bostaConfig.apiKey ?? settings.bosta?.apiKey;
    if (willBeEnabled && !newKey) {
      throw new BadRequest("bosta.apiKey is required when Bosta is enabled");
    }
    settings.bosta = { ...(settings.bosta as any), ...bostaConfig } as any;
  }

  if (freeShippingEnabled !== undefined) {
    settings.freeShippingEnabled = freeShippingEnabled;
  }

  await settings.save();
  SuccessResponse(res, {
    message: "Shipping settings updated successfully",
    settings,
  });
};

// ═══════════════════════════════════════════════════════════
// TEST BOSTA CONNECTION
// ═══════════════════════════════════════════════════════════
export const testBostaConnection = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  try {
    const cities = await bostaService.getCities(creds);
    settings.bosta!.lastTestedAt = new Date();
    settings.bosta!.lastTestStatus = "success";
    await settings.save();
    SuccessResponse(res, {
      message: "✅ Bosta API connected successfully",
      citiesCount: cities.length,
      cities,
    });
  } catch (error: any) {
    settings.bosta!.lastTestedAt = new Date();
    settings.bosta!.lastTestStatus = "failed";
    await settings.save();
    throw new BadRequest(
      `❌ Failed to connect to Bosta: ${
        error.response?.data?.message || error.message || "Unknown error"
      }`,
    );
  }
};

// ═══════════════════════════════════════════════════════════
// GET BOSTA CITIES
// ═══════════════════════════════════════════════════════════
export const getBostaCities = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);
  const cities = await bostaService.getCities(creds);
  SuccessResponse(res, { cities });
};

// ═══════════════════════════════════════════════════════════
// GET BOSTA DISTRICTS
// ═══════════════════════════════════════════════════════════
export const getBostaDistricts = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);
  const { cityId } = req.params;
  if (!cityId) throw new BadRequest("cityId is required");
  const districts = await bostaService.getDistricts(creds, cityId);
  SuccessResponse(res, { districts });
};

// ═══════════════════════════════════════════════════════════
// 💰 BOSTA PRICING — 1) Shipment Calculator (by city)
// ═══════════════════════════════════════════════════════════
export const getBostaShipmentPricing = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  const { pickupCity, dropOffCity, size, type, cod } = req.query as any;

  if (!pickupCity) {
    throw new BadRequest("pickupCity is required");
  }
  if (!dropOffCity) {
    throw new BadRequest("dropOffCity is required");
  }

  const pricing = await bostaService.getShipmentPricing(creds, {
    pickupCity,
    dropOffCity,
    size,
    type,
    cod: cod !== undefined ? Number(cod) : undefined,
  });

  SuccessResponse(res, {
    message: "Shipment pricing calculated successfully",
    pricing,
  });
};

// ═══════════════════════════════════════════════════════════
// 💰 BOSTA PRICING — 2) Sector Calculator (by sector IDs)
// ═══════════════════════════════════════════════════════════
export const getBostaSectorPricing = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  const {
    pickupSectorId,
    dropoffSectorId,
    tierIdSelector = "c__CT4DU9I",
    type,
    vatIncluded,
  } = req.query as any;

  if (!pickupSectorId) {
    throw new BadRequest("pickupSectorId is required");
  }

  const pricing = await bostaService.getSectorPricing(creds, {
    pickupSectorId: Number(pickupSectorId),
    dropoffSectorId:
      dropoffSectorId !== undefined ? Number(dropoffSectorId) : undefined,
    tierIdSelector,
    type,
    vatIncluded: vatIncluded !== undefined ? vatIncluded === "true" : undefined,
  });

  SuccessResponse(res, {
    message: "Sector pricing calculated successfully",
    pricing,
  });
};

// ═══════════════════════════════════════════════════════════
// 💰 BOSTA PRICING — 3) Insurance Fee Estimate
// ═══════════════════════════════════════════════════════════
export const getBostaInsuranceEstimate = async (
  req: Request,
  res: Response,
) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  const { goodsValue } = req.query as any;

  if (!goodsValue || Number(goodsValue) <= 0) {
    throw new BadRequest("goodsValue must be a positive number");
  }

  const estimate = await bostaService.getInsuranceFeeEstimate(
    creds,
    Number(goodsValue),
  );

  SuccessResponse(res, {
    message: "Insurance fee estimate calculated successfully",
    estimate,
  });
};

// ═══════════════════════════════════════════════════════════
// CREATE BOSTA DELIVERY (Send)
// ═══════════════════════════════════════════════════════════
export const createBostaDeliveryFromOrder = async (
  req: Request,
  res: Response,
) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  if (!settings.bosta?.enabled) {
    throw new BadRequest("Bosta is not enabled in shipping settings");
  }

  const {
    order_id,
    receiver: receiverInput,
    dropOffAddress,
    cod,
    weight,
    notes,
    allowToOpenPackage,
  } = req.body;

  if (!order_id) throw new BadRequest("order_id is required");
  if (!dropOffAddress?.city)
    throw new BadRequest("dropOffAddress.city is required");
  if (!dropOffAddress?.zoneId)
    throw new BadRequest("dropOffAddress.zoneId is required");
  if (!dropOffAddress?.districtId)
    throw new BadRequest("dropOffAddress.districtId is required");
  if (!dropOffAddress?.firstLine)
    throw new BadRequest("dropOffAddress.firstLine is required");

  const order = await OrderModel.findById(order_id);
  if (!order) throw new BadRequest("Order not found");

  const existingShipment = await BostaShipmentModel.findOne({
    relatedModel: "Order",
    relatedId: order._id.toString(),
    type: 10,
  });
  if (existingShipment?.deliveryId) {
    throw new BadRequest(
      `Order already has a Bosta shipment. Tracking: ${existingShipment.trackingNumber}`,
    );
  }

  let receiver = receiverInput;
  if (!receiver && order.user) {
    const customer = await CustomerModel.findById(order.user);
    if (customer) {
      const nameParts = (customer.name || "").trim().split(/\s+/);
      receiver = {
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        phone: customer.phone_number || "",
        email: customer.email || "",
      };
    }
  }
  if (!receiver || !receiver.phone) {
    throw new BadRequest(
      "Receiver phone is required. Provide it in body or ensure Customer has a phone number.",
    );
  }

  const codAmount =
    cod !== undefined
      ? Number(cod)
      : Math.max(
          0,
          (order.totalPriceAfterDiscount || order.totalOrderPrice || 0) -
            (order.paymentStatus === "paid" ? order.totalOrderPrice : 0),
        );

  const packageWeight = Number(weight) || settings.bosta?.defaults?.weight || 1;

  const pickup = settings.bosta?.pickup;
  if (
    !pickup?.city ||
    !pickup?.zoneId ||
    !pickup?.districtId ||
    !pickup?.firstLine
  ) {
    throw new BadRequest(
      "Bosta pickup address is not configured. Please set it in shipping settings (city, zoneId, districtId, firstLine).",
    );
  }

  const pickupAddress = {
    city: pickup.city,
    zoneId: pickup.zoneId,
    districtId: pickup.districtId,
    firstLine: pickup.firstLine,
    secondLine: pickup.secondLine || "",
    buildingNumber: String(pickup.buildingNumber || ""),
    floor: String(pickup.floor || ""),
    apartment: String(pickup.apartment || ""),
  };

  const payload: any = {
    type: 10,
    specs: {
      packageType: settings.bosta?.defaults?.packageType || "Parcel",
      size: settings.bosta?.defaults?.size || "MEDIUM",
      packageDetails: {
        itemsCount:
          order.cartItems?.length || settings.bosta?.defaults?.itemsCount || 1,
        description:
          settings.bosta?.defaults?.description || `Order #${order.reference}`,
      },
      weight: packageWeight,
    },
    receiver: {
      firstName: receiver.firstName || "",
      lastName: receiver.lastName || "",
      phone: receiver.phone,
      email: receiver.email || "",
    },
    dropOffAddress: {
      city: dropOffAddress.city,
      zoneId: dropOffAddress.zoneId,
      districtId: dropOffAddress.districtId,
      firstLine: dropOffAddress.firstLine,
      secondLine: dropOffAddress.secondLine || "",
      buildingNumber: String(dropOffAddress.buildingNumber || ""),
      floor: String(dropOffAddress.floor || ""),
      apartment: String(dropOffAddress.apartment || ""),
    },
    pickupAddress,
    returnAddress: pickupAddress,
    businessReference: order._id.toString(),
    notes: notes || `Order #${order.reference}`,
  };

  if (allowToOpenPackage !== undefined) {
    payload.allowToOpenPackage = allowToOpenPackage;
  }
  if (codAmount > 0 && settings.bosta?.codEnabled !== false) {
    payload.cod = codAmount;
  }
  if (settings.bosta?.webhookUrl) {
    payload.webhookUrl = settings.bosta.webhookUrl;
  }

  const bostaResponse = await bostaService.createDelivery(creds, payload);

  const shipment = await BostaShipmentModel.create({
    superadminId,
    relatedModel: "Order",
    relatedId: order._id.toString(),
    type: 10,

    deliveryId: bostaResponse?.deliveryId || null,
    trackingNumber:
      bostaResponse?.trackingNumber || bostaResponse?.tracking?.number || null,
    awb: bostaResponse?.awb || null,
    status: bostaResponse?.state?.value || bostaResponse?.status || null,
    statusCode: bostaResponse?.state?.code || null,
    labelUrl: bostaResponse?.labelUrl || bostaResponse?.label || null,

    cod: codAmount,
    shippingCost: bostaResponse?.pricing?.total || 0,

    receiver: payload.receiver,
    dropOffAddress: payload.dropOffAddress,

    weight: packageWeight,
    itemsCount: payload.specs.packageDetails.itemsCount,
    description: payload.specs.packageDetails.description,
    notes: payload.notes,

    trackingHistory: [
      {
        status: bostaResponse?.state?.value || null,
        statusCode: bostaResponse?.state?.code || null,
        snapshotAt: new Date(),
        data: bostaResponse,
      },
    ],

    lastSyncAt: new Date(),
    lastTrackAt: new Date(),
    rawResponse: bostaResponse,
  });

  order.status = "processing";
  await order.save();

  SuccessResponse(res, {
    message: "✅ Shipment created successfully",
    shipment,
    order: {
      _id: order._id,
      reference: order.reference,
      status: order.status,
    },
  });
};

// ═══════════════════════════════════════════════════════════
// 🚚 BULK CREATE BOSTA DELIVERIES
// ═══════════════════════════════════════════════════════════
export const bulkCreateBostaDeliveries = async (
  req: Request,
  res: Response,
) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  if (!settings.bosta?.enabled) {
    throw new BadRequest("Bosta is not enabled in shipping settings");
  }

  const { orders } = req.body;

  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    throw new BadRequest("orders array is required and cannot be empty");
  }

  if (orders.length > 50) {
    throw new BadRequest("Maximum 50 orders per bulk request");
  }

  const pickup = settings.bosta?.pickup;
  if (
    !pickup?.city ||
    !pickup?.zoneId ||
    !pickup?.districtId ||
    !pickup?.firstLine
  ) {
    throw new BadRequest(
      "Bosta pickup address is not configured. Please set it in shipping settings.",
    );
  }

  const pickupAddress = {
    city: pickup.city,
    zoneId: pickup.zoneId,
    districtId: pickup.districtId,
    firstLine: pickup.firstLine,
    secondLine: pickup.secondLine || "",
    buildingNumber: String(pickup.buildingNumber || ""),
    floor: String(pickup.floor || ""),
    apartment: String(pickup.apartment || ""),
  };

  const validOrders: Array<{
    orderId: string;
    order: any;
    payload: any;
    codAmount: number;
    packageWeight: number;
  }> = [];

  const errors: Array<{ order_id: string; error: string }> = [];

  for (const item of orders) {
    const { order_id, dropOffAddress, cod, weight, notes } = item;

    try {
      if (!order_id) throw new Error("order_id is required");
      if (!dropOffAddress?.city)
        throw new Error("dropOffAddress.city is required");
      if (!dropOffAddress?.zoneId)
        throw new Error("dropOffAddress.zoneId is required");
      if (!dropOffAddress?.districtId)
        throw new Error("dropOffAddress.districtId is required");
      if (!dropOffAddress?.firstLine)
        throw new Error("dropOffAddress.firstLine is required");

      const order = await OrderModel.findById(order_id);
      if (!order) throw new Error("Order not found");

      const existing = await BostaShipmentModel.findOne({
        relatedModel: "Order",
        relatedId: order._id.toString(),
        type: 10,
      });
      if (existing?.deliveryId) {
        throw new Error(
          `Order already has a shipment. Tracking: ${existing.trackingNumber}`,
        );
      }

      let receiver = item.receiver;
      if (!receiver && order.user) {
        const customer = await CustomerModel.findById(order.user);
        if (customer) {
          const nameParts = (customer.name || "").trim().split(/\s+/);
          receiver = {
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            phone: customer.phone_number || "",
            email: customer.email || "",
          };
        }
      }
      if (!receiver || !receiver.phone) {
        throw new Error(
          "Receiver phone is required. Provide it or ensure Customer has a phone number.",
        );
      }

      const codAmount =
        cod !== undefined
          ? Number(cod)
          : Math.max(
              0,
              (order.totalPriceAfterDiscount || order.totalOrderPrice || 0) -
                (order.paymentStatus === "paid" ? order.totalOrderPrice : 0),
            );

      const packageWeight =
        Number(weight) || settings.bosta?.defaults?.weight || 1;

      const payload: any = {
        type: 10,
        specs: {
          packageType: settings.bosta?.defaults?.packageType || "Parcel",
          size: settings.bosta?.defaults?.size || "MEDIUM",
          packageDetails: {
            itemsCount:
              order.cartItems?.length ||
              settings.bosta?.defaults?.itemsCount ||
              1,
            description:
              settings.bosta?.defaults?.description ||
              `Order #${order.reference}`,
          },
          weight: packageWeight,
        },
        receiver: {
          firstName: receiver.firstName || "",
          lastName: receiver.lastName || "",
          phone: receiver.phone,
          email: receiver.email || "",
        },
        dropOffAddress: {
          city: dropOffAddress.city,
          zoneId: dropOffAddress.zoneId,
          districtId: dropOffAddress.districtId,
          firstLine: dropOffAddress.firstLine,
          secondLine: dropOffAddress.secondLine || "",
          buildingNumber: String(dropOffAddress.buildingNumber || ""),
          floor: String(dropOffAddress.floor || ""),
          apartment: String(dropOffAddress.apartment || ""),
        },
        pickupAddress,
        returnAddress: pickupAddress,
        businessReference: order._id.toString(),
        notes: notes || `Order #${order.reference}`,
      };

      if (codAmount > 0 && settings.bosta?.codEnabled !== false) {
        payload.cod = codAmount;
      }
      if (settings.bosta?.webhookUrl) {
        payload.webhookUrl = settings.bosta.webhookUrl;
      }

      validOrders.push({
        orderId: order._id.toString(),
        order,
        payload,
        codAmount,
        packageWeight,
      });
    } catch (error: any) {
      errors.push({
        order_id: order_id || "unknown",
        error: error.message || "Unknown error",
      });
    }
  }

  if (validOrders.length === 0) {
    return SuccessResponse(res, {
      message: "No valid orders to process",
      total: orders.length,
      valid: 0,
      succeeded: 0,
      failed: errors.length,
      usedBulkEndpoint: false,
      created: [],
      errors,
    });
  }

  const payloads = validOrders.map((v) => v.payload);

  let bostaIds: string[] = [];
  let bulkFailed = false;

  try {
    const bulkResult = await bostaService.createBulkDeliveries(creds, payloads);
    if (Array.isArray(bulkResult)) {
      bostaIds = bulkResult;
    } else {
      bulkFailed = true;
    }
  } catch (bulkError: any) {
    console.error(
      "❌ Bulk failed, falling back to individual:",
      bulkError.message,
    );
    bulkFailed = true;
  }

  if (bulkFailed) {
    for (const v of validOrders) {
      try {
        const singleResponse = await bostaService.createDelivery(
          creds,
          v.payload,
        );
        bostaIds.push(singleResponse?._id || singleResponse?.deliveryId || "");
      } catch (singleError: any) {
        errors.push({
          order_id: v.orderId,
          error:
            singleError.response?.data?.message ||
            singleError.message ||
            "Failed to create",
        });
        bostaIds.push("");
      }
    }
  }

  const created: any[] = [];

  for (let i = 0; i < validOrders.length; i++) {
    const v = validOrders[i];
    const deliveryId = bostaIds[i];

    if (!deliveryId) {
      errors.push({
        order_id: v.orderId,
        error: "No delivery ID returned from Bosta",
      });
      continue;
    }

    let shipment;
    try {
      shipment = await BostaShipmentModel.create({
        superadminId,
        relatedModel: "Order",
        relatedId: v.orderId,
        type: 10,

        deliveryId,
        trackingNumber: null,
        awb: null,
        status: "PendingPickup",
        statusCode: null,
        labelUrl: null,

        cod: v.codAmount,
        shippingCost: 0,

        receiver: v.payload.receiver,
        dropOffAddress: v.payload.dropOffAddress,

        weight: v.packageWeight,
        itemsCount: v.payload.specs.packageDetails.itemsCount,
        description: v.payload.specs.packageDetails.description,
        notes: v.payload.notes,

        trackingHistory: [],
        lastSyncAt: null,
        lastTrackAt: null,
      });

      v.order.status = "processing";
      await v.order.save();
    } catch (createError: any) {
      errors.push({
        order_id: v.orderId,
        error: `Bosta created ID (${deliveryId}) but failed to save: ${
          createError.message || "Unknown error"
        }`,
      });
      continue;
    }

    let refreshed = false;
    try {
      const bostaData = await bostaService.getDelivery(creds, deliveryId);

      shipment.trackingNumber =
        bostaData?.trackingNumber || bostaData?.tracking?.number || null;
      shipment.awb = bostaData?.awb || null;
      shipment.status = bostaData?.state?.value || shipment.status;
      shipment.statusCode = bostaData?.state?.code || null;
      shipment.labelUrl = bostaData?.labelUrl || bostaData?.label || null;
      shipment.shippingCost = bostaData?.pricing?.total || 0;
      shipment.rawResponse = bostaData;
      shipment.lastSyncAt = new Date();
      shipment.lastTrackAt = new Date();

      shipment.trackingHistory = [
        {
          status: bostaData?.state?.value || null,
          statusCode: bostaData?.state?.code || null,
          snapshotAt: new Date(),
          data: bostaData,
        },
      ] as any;

      await shipment.save();
      refreshed = true;
    } catch (fetchError: any) {
      console.warn(
        `⚠️ Bulk: Created (${deliveryId}) but couldn't fetch details yet: ${fetchError.message}`,
      );
    }

    created.push({
      order_id: v.orderId,
      reference: v.order.reference,
      shipmentId: shipment._id,
      deliveryId: shipment.deliveryId,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      refreshed,
    });
  }

  SuccessResponse(res, {
    message: `✅ Bulk complete: ${created.length} created, ${errors.length} failed`,
    total: orders.length,
    valid: validOrders.length,
    succeeded: created.length,
    failed: errors.length,
    usedBulkEndpoint: !bulkFailed,
    created,
    errors,
  });
};

// ═══════════════════════════════════════════════════════════
// 🚚 CREATE BOSTA PICKUP — طلب مندوب يستلم من الفرع
// ═══════════════════════════════════════════════════════════
export const createBostaPickup = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  if (!settings.bosta?.enabled) {
    throw new BadRequest("Bosta is not enabled in shipping settings");
  }

  const { shipmentId, scheduledDate, scheduledTimeSlot, contactPerson, notes } =
    req.body;

  if (!shipmentId) throw new BadRequest("shipmentId is required");
  if (!scheduledDate)
    throw new BadRequest("scheduledDate is required (YYYY-MM-DD)");

  const shipment = await BostaShipmentModel.findOne({
    _id: shipmentId,
    superadminId,
  });
  if (!shipment) throw new BadRequest("Shipment not found");
  if (!shipment.deliveryId) {
    throw new BadRequest("Shipment has no Bosta deliveryId");
  }

  const pickup = settings.bosta?.pickup;
  const finalContact = contactPerson || {
    firstName: pickup?.firstName || "Store",
    lastName: pickup?.lastName || "",
    phone: pickup?.phone || "",
    email: pickup?.email || "",
  };

  if (!finalContact.phone) {
    throw new BadRequest(
      "Contact phone is required. Set it in Bosta pickup settings or send it.",
    );
  }

  const payload: any = {
    scheduledDate,
    contactPerson: finalContact,
    numberOfPackages: 1,
  };

  if (scheduledTimeSlot?.from && scheduledTimeSlot?.to) {
    payload.scheduledTimeSlot = scheduledTimeSlot;
  }
  if (pickup?.businessLocationId) {
    payload.businessLocationId = pickup.businessLocationId;
  }
  if (notes) payload.notes = notes;

  const bostaResponse = await bostaService.createPickup(creds, payload);

  (shipment as any).pickup = {
    pickupId: bostaResponse?._id || bostaResponse?.pickupId || null,
    scheduledDate,
    scheduledTimeSlot: payload.scheduledTimeSlot || null,
    status: bostaResponse?.state?.value || "scheduled",
    createdAt: new Date(),
    rawResponse: bostaResponse,
  };
  shipment.lastSyncAt = new Date();
  await shipment.save();

  SuccessResponse(res, {
    message: "✅ Pickup scheduled successfully",
    pickup: (shipment as any).pickup,
    shipment: {
      _id: shipment._id,
      deliveryId: shipment.deliveryId,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
    },
  });
};

// ═══════════════════════════════════════════════════════════
// 📅 GET PICKUP TIME SLOTS
// ═══════════════════════════════════════════════════════════
export const getBostaPickupTimeSlots = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  const { date, businessLocationId } = req.query as any;

  if (!date) throw new BadRequest("date is required (YYYY-MM-DD)");

  const slots = await bostaService.getPickupTimeSlots(creds, {
    date,
    businessLocationId:
      businessLocationId || settings.bosta?.pickup?.businessLocationId,
  });

  SuccessResponse(res, {
    message: "Pickup time slots fetched successfully",
    slots,
  });
};

// ═══════════════════════════════════════════════════════════
// 🔄 CREATE BOSTA RETURN DELIVERY
// ═══════════════════════════════════════════════════════════
export const createBostaReturnDelivery = async (
  req: Request,
  res: Response,
) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  if (!settings.bosta?.enabled) {
    throw new BadRequest("Bosta is not enabled in shipping settings");
  }

  const { order_id, dropOffAddress, notes, weight, allowToOpenPackage } =
    req.body;

  const returnType = Number(req.body.type) || 30;

  if (!order_id) throw new BadRequest("order_id is required");

  const order = await OrderModel.findById(order_id);
  if (!order) throw new BadRequest("Order not found");

  const originalShipment = await BostaShipmentModel.findOne({
    relatedModel: "Order",
    relatedId: order._id.toString(),
    type: 10,
  });

  if (!originalShipment) {
    throw new BadRequest(
      "No original shipment found for this order. Cannot create a return.",
    );
  }

  if (!originalShipment.dropOffAddress?.zoneId) {
    throw new BadRequest(
      "Original shipment has no valid dropOffAddress. Cannot create a return.",
    );
  }

  const existingReturn = await BostaShipmentModel.findOne({
    relatedModel: "Order",
    relatedId: order._id.toString(),
    type: returnType,
  });
  if (existingReturn) {
    throw new BadRequest(
      `Return already exists for this order. Tracking: ${existingReturn.trackingNumber}`,
    );
  }

  const pickup = settings.bosta?.pickup;
  if (
    !pickup?.city ||
    !pickup?.zoneId ||
    !pickup?.districtId ||
    !pickup?.firstLine
  ) {
    throw new BadRequest(
      "Bosta pickup address is not configured. Please set it in shipping settings.",
    );
  }

  const receiverForReturn = {
    firstName: pickup.firstName || "Store",
    lastName: pickup.lastName || "",
    phone: pickup.phone || "",
    email: pickup.email || "",
  };

  const pickupFromCustomer = {
    city: dropOffAddress?.city || originalShipment.dropOffAddress.city,
    zoneId: dropOffAddress?.zoneId || originalShipment.dropOffAddress.zoneId,
    districtId:
      dropOffAddress?.districtId || originalShipment.dropOffAddress.districtId,
    firstLine:
      dropOffAddress?.firstLine || originalShipment.dropOffAddress.firstLine,
    secondLine:
      dropOffAddress?.secondLine || originalShipment.dropOffAddress.secondLine,
    buildingNumber: String(
      dropOffAddress?.buildingNumber ||
        originalShipment.dropOffAddress.buildingNumber ||
        "",
    ),
    floor: String(
      dropOffAddress?.floor || originalShipment.dropOffAddress.floor || "",
    ),
    apartment: String(
      dropOffAddress?.apartment ||
        originalShipment.dropOffAddress.apartment ||
        "",
    ),
  };

  const dropOffToStore = {
    city: pickup.city,
    zoneId: pickup.zoneId,
    districtId: pickup.districtId,
    firstLine: pickup.firstLine,
    secondLine: pickup.secondLine || "",
    buildingNumber: String(pickup.buildingNumber || ""),
    floor: String(pickup.floor || ""),
    apartment: String(pickup.apartment || ""),
  };

  const packageWeight = Number(weight) || settings.bosta?.defaults?.weight || 1;

  const payload: any = {
    type: returnType,
    specs: {
      packageType: settings.bosta?.defaults?.packageType || "Parcel",
      size: settings.bosta?.defaults?.size || "MEDIUM",
      packageDetails: {
        itemsCount:
          order.cartItems?.length || settings.bosta?.defaults?.itemsCount || 1,
        description:
          settings.bosta?.defaults?.description ||
          `Return for Order #${order.reference}`,
      },
      weight: packageWeight,
    },
    receiver: receiverForReturn,
    dropOffAddress: dropOffToStore,
    pickupAddress: pickupFromCustomer,
    returnAddress: dropOffToStore,
    businessReference: order._id.toString(),
    notes: notes || `Return for Order #${order.reference}`,
  };

  if (allowToOpenPackage !== undefined) {
    payload.allowToOpenPackage = allowToOpenPackage;
  }
  if (settings.bosta?.webhookUrl) {
    payload.webhookUrl = settings.bosta.webhookUrl;
  }

  const bostaResponse = await bostaService.createDelivery(creds, payload);

  const shipment = await BostaShipmentModel.create({
    superadminId,
    relatedModel: "Order",
    relatedId: order._id.toString(),
    type: returnType,

    deliveryId: bostaResponse?._id || bostaResponse?.deliveryId || null,
    trackingNumber:
      bostaResponse?.trackingNumber || bostaResponse?.tracking?.number || null,
    awb: bostaResponse?.awb || null,
    status: bostaResponse?.state?.value || bostaResponse?.status || null,
    statusCode: bostaResponse?.state?.code || null,
    labelUrl: bostaResponse?.labelUrl || bostaResponse?.label || null,

    cod: 0,
    shippingCost: bostaResponse?.pricing?.total || 0,

    receiver: payload.receiver,
    dropOffAddress: payload.dropOffAddress,

    weight: packageWeight,
    itemsCount: payload.specs.packageDetails.itemsCount,
    description: payload.specs.packageDetails.description,
    notes: payload.notes,

    trackingHistory: [
      {
        status: bostaResponse?.state?.value || null,
        statusCode: bostaResponse?.state?.code || null,
        snapshotAt: new Date(),
        data: bostaResponse,
      },
    ],

    lastSyncAt: new Date(),
    lastTrackAt: new Date(),
    rawResponse: bostaResponse,
  });

  order.status = "returned";
  await order.save();

  SuccessResponse(res, {
    message: "✅ Return shipment created successfully",
    shipment,
    order: {
      _id: order._id,
      reference: order.reference,
      status: order.status,
    },
  });
};

// ═══════════════════════════════════════════════════════════
// GET BOSTA SHIPMENT BY ORDER
// ═══════════════════════════════════════════════════════════
export const getBostaShipmentByOrder = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const shipment = await BostaShipmentModel.findOne({
    relatedModel: "Order",
    relatedId: orderId,
  }).sort({ createdAt: -1 });
  if (!shipment) {
    throw new BadRequest("No Bosta shipment for this order");
  }
  SuccessResponse(res, {
    message: "Bosta shipment fetched successfully",
    shipment,
  });
};

// ═══════════════════════════════════════════════════════════
// 📋 LIST BOSTA SHIPMENTS
// ═══════════════════════════════════════════════════════════
export const listBostaShipments = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);

  const {
    status,
    relatedModel,
    type,
    from,
    to,
    search,
    page = "1",
    limit = "20",
  } = req.query as Record<string, string>;

  const filter: any = { superadminId };

  if (status) filter.status = status;
  if (relatedModel) filter.relatedModel = relatedModel;
  if (type) filter.type = Number(type);

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }

  if (search) {
    filter.$or = [
      { trackingNumber: { $regex: search, $options: "i" } },
      { deliveryId: { $regex: search, $options: "i" } },
      { "receiver.phone": { $regex: search, $options: "i" } },
      { "receiver.firstName": { $regex: search, $options: "i" } },
      { "receiver.lastName": { $regex: search, $options: "i" } },
    ];
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [shipments, total] = await Promise.all([
    BostaShipmentModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("-trackingHistory -rawResponse"),
    BostaShipmentModel.countDocuments(filter),
  ]);

  SuccessResponse(res, {
    message: "Shipments fetched successfully",
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
    count: shipments.length,
    shipments,
  });
};

// ═══════════════════════════════════════════════════════════
// 📊 BOSTA SHIPMENTS STATS
// ═══════════════════════════════════════════════════════════
export const getBostaShipmentsStats = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const { from, to } = req.query as Record<string, string>;

  const superadminObjectId = new mongoose.Types.ObjectId(superadminId);

  const matchFilter: any = { superadminId: superadminObjectId };

  if (from || to) {
    matchFilter.createdAt = {};
    if (from) matchFilter.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      matchFilter.createdAt.$lte = toDate;
    }
  }

  const [overallStats] = await BostaShipmentModel.aggregate([
    { $match: matchFilter },
    {
      $facet: {
        total: [{ $count: "count" }],
        byStatus: [
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byRelatedModel: [
          { $group: { _id: "$relatedModel", count: { $sum: 1 } } },
        ],
        byType: [{ $group: { _id: "$type", count: { $sum: 1 } } }],
        totals: [
          {
            $group: {
              _id: null,
              totalCOD: { $sum: "$cod" },
              totalShippingCost: { $sum: "$shippingCost" },
            },
          },
        ],
      },
    },
  ]);

  const total = overallStats?.total?.[0]?.count || 0;
  const byStatusArr = overallStats?.byStatus || [];
  const byRelatedModelArr = overallStats?.byRelatedModel || [];
  const byTypeArr = overallStats?.byType || [];
  const totals = overallStats?.totals?.[0] || {
    totalCOD: 0,
    totalShippingCost: 0,
  };

  const byStatus: Record<string, number> = {};
  for (const item of byStatusArr) {
    byStatus[item._id || "unknown"] = item.count;
  }

  const byRelatedModel: Record<string, number> = {};
  for (const item of byRelatedModelArr) {
    byRelatedModel[item._id || "unknown"] = item.count;
  }

  const byType: Record<string, number> = {};
  for (const item of byTypeArr) {
    byType[item._id === 10 ? "send" : item._id === 30 ? "return" : "unknown"] =
      item.count;
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const last7DaysData = await BostaShipmentModel.aggregate([
    {
      $match: {
        superadminId: superadminObjectId,
        createdAt: { $gte: sevenDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);

  const dailyBreakdown: Record<
    string,
    { created: number; delivered: number; cancelled: number }
  > = {};

  for (const item of last7DaysData) {
    const date = item._id.date;
    const status = item._id.status;

    if (!dailyBreakdown[date]) {
      dailyBreakdown[date] = { created: 0, delivered: 0, cancelled: 0 };
    }

    dailyBreakdown[date].created += item.count;

    if (status === "Delivered") {
      dailyBreakdown[date].delivered += item.count;
    }
    if (status === "Cancelled" || status === "Canceled") {
      dailyBreakdown[date].cancelled += item.count;
    }
  }

  SuccessResponse(res, {
    message: "Shipments stats fetched successfully",
    filters: { from: from || null, to: to || null },
    total,
    byStatus,
    byRelatedModel,
    byType,
    totalCOD: totals.totalCOD || 0,
    totalShippingCost: totals.totalShippingCost || 0,
    averageCOD: total > 0 ? Number((totals.totalCOD / total).toFixed(2)) : 0,
    last7Days: dailyBreakdown,
  });
};

// ═══════════════════════════════════════════════════════════
// 🔍 TRACK FROM DB
// ═══════════════════════════════════════════════════════════
export const trackBostaShipment = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const { trackingNumber } = req.params;

  if (!trackingNumber) {
    throw new BadRequest("trackingNumber is required");
  }

  const shipment = await BostaShipmentModel.findOne({
    trackingNumber,
    superadminId,
  });

  if (!shipment) {
    throw new BadRequest(
      `No shipment found with tracking number: ${trackingNumber}`,
    );
  }

  SuccessResponse(res, {
    message: "Shipment fetched successfully",
    shipment: {
      _id: shipment._id,
      trackingNumber: shipment.trackingNumber,
      deliveryId: shipment.deliveryId,
      type: shipment.type,
      status: shipment.status,
      statusCode: shipment.statusCode,
      labelUrl: shipment.labelUrl,
      cod: shipment.cod,
      receiver: shipment.receiver,
      dropOffAddress: shipment.dropOffAddress,
      createdAt: shipment.createdAt,
      lastSyncAt: shipment.lastSyncAt,
      lastTrackAt: shipment.lastTrackAt,
      history: shipment.trackingHistory || [],
    },
  });
};

// ═══════════════════════════════════════════════════════════
// 🔄 REFRESH FROM BOSTA
// ═══════════════════════════════════════════════════════════
export const refreshBostaTracking = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  const { shipmentId } = req.params;

  const shipment = await BostaShipmentModel.findOne({
    _id: shipmentId,
    superadminId,
  });

  if (!shipment) throw new BadRequest("Shipment not found");

  if (!shipment.trackingNumber && !shipment.deliveryId) {
    throw new BadRequest("Shipment has no tracking number or deliveryId");
  }

  let bostaData: any = null;
  let endpointUsed = "";

  if (shipment.trackingNumber) {
    try {
      bostaData = await bostaService.getDeliveryByTrackingNumber(
        creds,
        shipment.trackingNumber,
      );
      endpointUsed = `/deliveries/business/${shipment.trackingNumber}`;
    } catch (err) {
      console.warn("⚠️ Tracking endpoint failed, trying deliveryId...");
    }
  }

  if (!bostaData && shipment.deliveryId) {
    bostaData = await bostaService.getDelivery(creds, shipment.deliveryId);
    endpointUsed = `/deliveries/${shipment.deliveryId}`;
  }

  if (!bostaData) {
    throw new BadRequest("Failed to fetch from Bosta (no data returned)");
  }

  const newStatus = bostaData?.state?.value || shipment.status;
  const newStatusCode = bostaData?.state?.code || shipment.statusCode;

  const statusChanged =
    newStatus !== shipment.status || newStatusCode !== shipment.statusCode;

  shipment.status = newStatus;
  shipment.statusCode = newStatusCode;
  shipment.lastSyncAt = new Date();
  shipment.lastTrackAt = new Date();
  shipment.rawResponse = bostaData;

  if (!shipment.trackingNumber) {
    shipment.trackingNumber =
      bostaData?.trackingNumber || bostaData?.tracking?.number || null;
  }

  if (bostaData?.labelUrl) shipment.labelUrl = bostaData.labelUrl;

  shipment.trackingHistory = shipment.trackingHistory || [];
  shipment.trackingHistory.push({
    status: newStatus,
    statusCode: newStatusCode,
    snapshotAt: new Date(),
    data: bostaData,
  });

  await shipment.save();

  if (statusChanged && shipment.relatedModel === "Order") {
    const map: Record<string, string> = {
      "Pickup requested": "processing",
      "Picked up": "processing",
      "In transit": "out_for_delivery",
      "Out for delivery": "out_for_delivery",
      Delivered: "delivered",
      Cancelled: "canceled",
      "Failed to deliver": "failed_to_deliver",
      Returned: "returned",
    };
    const newOrderStatus = newStatus ? map[newStatus] : null;
    if (newOrderStatus) {
      await OrderModel.findByIdAndUpdate(shipment.relatedId, {
        status: newOrderStatus,
      });
    }
  }

  SuccessResponse(res, {
    message: "✅ Tracking refreshed successfully",
    shipment: {
      _id: shipment._id,
      trackingNumber: shipment.trackingNumber,
      deliveryId: shipment.deliveryId,
      type: shipment.type,
      status: shipment.status,
      statusCode: shipment.statusCode,
      lastSyncAt: shipment.lastSyncAt,
      lastTrackAt: shipment.lastTrackAt,
      statusChanged,
      historyCount: shipment.trackingHistory.length,
      history: shipment.trackingHistory,
      rawResponse: bostaData,
    },
    endpointUsed,
  });
};

// ═══════════════════════════════════════════════════════════
// 📜 HISTORY FROM DB
// ═══════════════════════════════════════════════════════════
export const getBostaTrackingHistory = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const { shipmentId } = req.params;

  const shipment = await BostaShipmentModel.findOne({
    _id: shipmentId,
    superadminId,
  }).select("trackingNumber deliveryId type status statusCode trackingHistory");

  if (!shipment) throw new BadRequest("Shipment not found");

  SuccessResponse(res, {
    message: "Tracking history fetched successfully",
    trackingNumber: shipment.trackingNumber,
    deliveryId: shipment.deliveryId,
    type: shipment.type,
    currentStatus: shipment.status,
    currentStatusCode: shipment.statusCode,
    count: shipment.trackingHistory?.length || 0,
    history: shipment.trackingHistory || [],
  });
};

// ═══════════════════════════════════════════════════════════
// SYNC BOSTA SHIPMENT
// ═══════════════════════════════════════════════════════════
export const syncBostaShipment = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  const { shipmentId } = req.params;

  const shipment = await BostaShipmentModel.findOne({
    _id: shipmentId,
    superadminId,
  });
  if (!shipment) throw new BadRequest("Shipment not found");
  if (!shipment.deliveryId) {
    throw new BadRequest("Shipment has no Bosta deliveryId");
  }

  const bostaData = await bostaService.getDelivery(creds, shipment.deliveryId);

  shipment.status = bostaData?.state?.value || shipment.status;
  shipment.statusCode = bostaData?.state?.code || shipment.statusCode;
  shipment.lastSyncAt = new Date();
  shipment.rawResponse = bostaData;
  if (bostaData?.labelUrl) shipment.labelUrl = bostaData.labelUrl;

  await shipment.save();

  SuccessResponse(res, {
    message: "✅ Shipment synced successfully",
    shipment,
  });
};

// ═══════════════════════════════════════════════════════════
// CANCEL BOSTA SHIPMENT
// ═══════════════════════════════════════════════════════════
export const cancelBostaShipment = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  const { shipmentId } = req.params;

  const shipment = await BostaShipmentModel.findOne({
    _id: shipmentId,
    superadminId,
  });
  if (!shipment) throw new BadRequest("Shipment not found");

  if (!shipment.trackingNumber && !shipment.deliveryId) {
    throw new BadRequest("Shipment has no tracking number or deliveryId");
  }

  let cancelled = false;
  let lastError: any = null;

  // ✅ جرّب بالـ trackingNumber الأول (المسار الصح)
  if (shipment.trackingNumber) {
    try {
      await bostaService.cancelDeliveryByTracking(
        creds,
        shipment.trackingNumber,
      );
      cancelled = true;
    } catch (err: any) {
      lastError = err;
      console.warn(
        `⚠️ Terminate by trackingNumber (${shipment.trackingNumber}) failed: ${err.message}`,
      );
    }
  }

  // ✅ لو فشل، جرّب بالـ deliveryId
  if (!cancelled && shipment.deliveryId) {
    try {
      await bostaService.cancelDelivery(creds, shipment.deliveryId);
      cancelled = true;
    } catch (err: any) {
      lastError = err;
      console.warn(
        `⚠️ Cancel by deliveryId (${shipment.deliveryId}) failed: ${err.message}`,
      );
    }
  }

  if (!cancelled) {
    throw new BadRequest(
      lastError?.message || "Failed to cancel shipment in Bosta",
    );
  }

  shipment.status = "Cancelled";
  shipment.lastSyncAt = new Date();
  await shipment.save();

  SuccessResponse(res, {
    message: "✅ Shipment cancelled successfully",
    shipment,
  });
};

// ═══════════════════════════════════════════════════════════
// GET BOSTA LABEL
// ═══════════════════════════════════════════════════════════
export const getBostaLabel = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  const { shipmentId } = req.params;

  const shipment = await BostaShipmentModel.findOne({
    _id: shipmentId,
    superadminId,
  });
  if (!shipment) throw new BadRequest("Shipment not found");
  if (!shipment.deliveryId) {
    throw new BadRequest("Shipment has no Bosta deliveryId");
  }

  const bostaData = await bostaService.getDelivery(creds, shipment.deliveryId);
  const labelUrl = bostaData?.labelUrl || bostaData?.label || shipment.labelUrl;
  if (!labelUrl) throw new BadRequest("Label is not available yet");

  SuccessResponse(res, {
    message: "Label URL fetched successfully",
    labelUrl,
  });
};

// ═══════════════════════════════════════════════════════════
// FREE SHIPPING PRODUCTS
// ═══════════════════════════════════════════════════════════
export const getFreeShippingProducts = async (_req: Request, res: Response) => {
  const products = await ProductModel.find(
    { free_shipping: true },
    { name: 1, ar_name: 1, code: 1, free_shipping: 1 },
  ).sort({ createdAt: -1 });

  SuccessResponse(res, {
    message: "Free shipping products fetched successfully",
    count: products.length,
    products,
  });
};

export const updateFreeShippingProducts = async (
  req: Request,
  res: Response,
) => {
  const { productIds } = req.body as { productIds: string[] };
  const uniqueProductIds = Array.from(new Set(productIds || []));

  for (const id of uniqueProductIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequest(`Invalid product id: ${id}`);
    }
  }

  const existingProductsCount = await ProductModel.countDocuments({
    _id: { $in: uniqueProductIds },
  });

  if (existingProductsCount !== uniqueProductIds.length) {
    throw new BadRequest("One or more products were not found");
  }

  await ProductModel.updateMany({}, { $set: { free_shipping: false } });

  if (uniqueProductIds.length > 0) {
    await ProductModel.updateMany(
      { _id: { $in: uniqueProductIds } },
      { $set: { free_shipping: true } },
    );
  }

  const products = await ProductModel.find(
    { free_shipping: true },
    { name: 1, ar_name: 1, code: 1, free_shipping: 1 },
  ).sort({ createdAt: -1 });

  SuccessResponse(res, {
    message: "Free shipping products updated successfully",
    count: products.length,
    products,
  });
};
