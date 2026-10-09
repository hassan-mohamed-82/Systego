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
// Helper: sanitize Bosta address
// ═══════════════════════════════════════════════════════════
const sanitizeBostaAddress = (addr: any) => ({
  city: String(addr?.city || "").trim(),
  zoneId: String(addr?.zoneId || "").trim(),
  districtId: String(addr?.districtId || "").trim(),
  firstLine: String(addr?.firstLine || "").trim(),
  secondLine: String(addr?.secondLine || "").trim(),
  buildingNumber: String(addr?.buildingNumber || "").trim() || "0",
  floor: String(addr?.floor || "").trim() || "0",
  apartment: String(addr?.apartment || "").trim() || "0",
});

// ═══════════════════════════════════════════════════════════
// Helper: validate Bosta address
// ═══════════════════════════════════════════════════════════
const validateBostaAddress = (
  addr: any,
  label: string,
): { valid: boolean; missing: string[] } => {
  const required = ["city", "zoneId", "districtId", "firstLine"];
  const missing = required.filter((f) => !addr[f]);
  return { valid: missing.length === 0, missing };
};

// ═══════════════════════════════════════════════════════════
// ⚙️ SHIPPING SETTINGS
// ═══════════════════════════════════════════════════════════

export const getShippingSettings = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  SuccessResponse(res, {
    message: "Shipping settings fetched successfully",
    settings,
  });
};

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

    // ✅ Deep merge
    const existingBosta = (settings.bosta as any) || {};
    const existingPickup = existingBosta.pickup || {};

    settings.bosta = {
      ...existingBosta,
      ...bostaConfig,
      // ✅ Deep merge للـ pickup
      pickup: {
        ...existingPickup,
        ...(bostaConfig.pickup || {}),
      },
      // ✅ Deep merge للـ defaults
      defaults: {
        ...(existingBosta.defaults || {}),
        ...(bostaConfig.defaults || {}),
      },
    } as any;
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
// 🆕 SYNC PICKUP LOCATION — ينشئ أو يحدّث Pickup Location
// ═══════════════════════════════════════════════════════════
export const syncPickupLocation = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  if (!settings.bosta?.enabled) {
    throw new BadRequest("Bosta is not enabled");
  }

  const pickup = settings.bosta?.pickup;

  if (
    !pickup?.city ||
    !pickup?.zoneId ||
    !pickup?.districtId ||
    !pickup?.firstLine
  ) {
    throw new BadRequest(
      "Pickup address is incomplete. Please fill city, district, and address line first.",
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 1) جيب كل الـ Locations الموجودة
  // ═══════════════════════════════════════════════════════════
  const existingData = await bostaService.getPickupLocations(creds);
  const existing = existingData?.list || existingData || [];

  // ═══════════════════════════════════════════════════════════
  // 2) دوّر على Location بنفس العنوان
  // ═══════════════════════════════════════════════════════════
  const matchingLocation = existing.find((loc: any) => {
    return (
      loc.address?.district?._id === pickup.districtId ||
      loc.address?.districtId === pickup.districtId
    );
  });

  let locationId: string;
  let isNew = false;

  // ═══════════════════════════════════════════════════════════
  // 3) لو موجود → استخدمه
  // ═══════════════════════════════════════════════════════════
  if (matchingLocation) {
    locationId = matchingLocation._id;

    // ✅ حدّث العنوان لو اتغير
    try {
      await bostaService.updatePickupLocation(creds, locationId, {
        locationName: pickup.firstName
          ? `${pickup.firstName} ${pickup.lastName || ""}`.trim()
          : "Store Location",
        contacts: [
          {
            firstName: pickup.firstName || "Store",
            lastName: pickup.lastName || "",
            phone: pickup.phone || "",
            isDefault: true,
          },
        ],
        address: {
          districtId: pickup.districtId,
          firstLine: pickup.firstLine,
          secondLine: pickup.secondLine || "",
          buildingNumber: pickup.buildingNumber || "",
          floor: pickup.floor || "",
          apartment: pickup.apartment || "",
        },
      });
    } catch (updateErr: any) {
      console.warn("⚠️ Could not update location:", updateErr.message);
    }
  } else {
    // ═══════════════════════════════════════════════════════════
    // 4) لو مش موجود → أنشئ واحد جديد
    // ═══════════════════════════════════════════════════════════
    try {
      const createRes = await bostaService.createPickupLocation(creds, {
        locationName: pickup.firstName
          ? `${pickup.firstName} ${pickup.lastName || ""}`.trim()
          : "Store Location",
        contacts: [
          {
            firstName: pickup.firstName || "Store",
            lastName: pickup.lastName || "",
            phone: pickup.phone || "",
            isDefault: true,
          },
        ],
        address: {
          city: pickup.city,
          zoneId: pickup.zoneId,
          districtId: pickup.districtId,
          firstLine: pickup.firstLine,
          secondLine: pickup.secondLine || "",
          buildingNumber: pickup.buildingNumber || "",
          floor: pickup.floor || "",
          apartment: pickup.apartment || "",
        },
      });

      locationId = createRes?.pickupId || createRes?._id;
      isNew = true;
    } catch (createErr: any) {
      throw new BadRequest(
        `Failed to create pickup location in Bosta: ${createErr.message}`,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 5) خليه الـ Default
  // ═══════════════════════════════════════════════════════════
  try {
    await bostaService.setDefaultPickupLocation(creds, locationId);
  } catch (defaultErr: any) {
    console.warn("⚠️ Could not set default:", defaultErr.message);
  }

  // ═══════════════════════════════════════════════════════════
  // 6) احفظ الـ ID في الإعدادات
  // ═══════════════════════════════════════════════════════════
  if (settings.bosta?.pickup) {
    settings.bosta.pickup.businessLocationId = locationId;
    await settings.save();
  }

  SuccessResponse(res, {
    message: isNew
      ? "✅ New pickup location created and set as default"
      : "✅ Existing pickup location updated and set as default",
    locationId,
    isNew,
  });
};

// ═══════════════════════════════════════════════════════════
// 🔌 BOSTA CONNECTION
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
// 📍 BOSTA LOOKUP
// ═══════════════════════════════════════════════════════════

export const getBostaCities = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);
  const cities = await bostaService.getCities(creds);
  SuccessResponse(res, { cities });
};

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
// 📍 PICKUP LOCATIONS
// ═══════════════════════════════════════════════════════════

export const listPickupLocations = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  if (!settings.bosta?.enabled) {
    throw new BadRequest("Bosta is not enabled");
  }

  const data = await bostaService.getPickupLocations(creds);

  SuccessResponse(res, {
    message: "Pickup locations fetched successfully",
    locations: data?.list || data || [],
    total: data?.total || 0,
  });
};

export const setDefaultPickupLocation = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  const { locationId } = req.params;

  if (!locationId) {
    throw new BadRequest("locationId is required");
  }

  const data = await bostaService.setDefaultPickupLocation(creds, locationId);

  if (settings.bosta?.pickup) {
    settings.bosta.pickup.businessLocationId = locationId;
    await settings.save();
  }

  SuccessResponse(res, {
    message: "Default pickup location updated successfully",
    data,
  });
};

// ═══════════════════════════════════════════════════════════
// 💰 PRICING
// ═══════════════════════════════════════════════════════════

export const getBostaShipmentPricing = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  const { pickupCity, dropOffCity, size, type, cod } = req.query as any;

  if (!pickupCity) throw new BadRequest("pickupCity is required");
  if (!dropOffCity) throw new BadRequest("dropOffCity is required");

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

  if (!pickupSectorId) throw new BadRequest("pickupSectorId is required");

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
// 📦 DELIVERIES
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

  const pickup = settings.bosta?.pickup || {};
  const pickupAddress = sanitizeBostaAddress(pickup);

  const pickupCheck = validateBostaAddress(pickupAddress, "pickup");
  if (!pickupCheck.valid) {
    throw new BadRequest(
      `Bosta pickup address is incomplete. Missing: ${pickupCheck.missing.join(
        ", ",
      )}. Please configure them in Shipping Settings → Bosta → Advanced Settings.`,
    );
  }

  const dropOffAddressClean = sanitizeBostaAddress(dropOffAddress);

  const dropOffCheck = validateBostaAddress(dropOffAddressClean, "drop-off");
  if (!dropOffCheck.valid) {
    throw new BadRequest(
      `Drop-off address is incomplete. Missing: ${dropOffCheck.missing.join(
        ", ",
      )}. Customer must select Bosta city/district.`,
    );
  }

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
    dropOffAddress: dropOffAddressClean,
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

  const newDeliveryId =
    bostaResponse?.deliveryId ||
    bostaResponse?._id ||
    bostaResponse?.data?.deliveryId ||
    bostaResponse?.data?._id ||
    null;

  const newTrackingNumber =
    bostaResponse?.trackingNumber ||
    bostaResponse?.tracking?.number ||
    bostaResponse?.data?.trackingNumber ||
    bostaResponse?.data?.tracking?.number ||
    null;

  if (!newDeliveryId && !newTrackingNumber) {
    throw new BadRequest(
      "Bosta did not return a deliveryId or trackingNumber. Please check the Bosta API response.",
    );
  }

  const shipment = await BostaShipmentModel.create({
    superadminId,
    relatedModel: "Order",
    relatedId: order._id.toString(),
    type: 10,

    deliveryId: newDeliveryId,
    trackingNumber: newTrackingNumber,
    awb: bostaResponse?.awb || null,
    status:
      bostaResponse?.state?.value || bostaResponse?.status || "PendingPickup",
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
        status: bostaResponse?.state?.value || "PendingPickup",
        statusCode: bostaResponse?.state?.code || null,
        snapshotAt: new Date(),
        data: bostaResponse,
      },
    ],

    lastSyncAt: new Date(),
    lastTrackAt: new Date(),
    rawResponse: bostaResponse,
  });

  (order as any).bostaShipment = shipment._id;
  order.status = "processing";

  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    status: "processing",
    description: `Bosta shipment created (${newTrackingNumber || newDeliveryId})`,
    source: "bosta",
    updatedBy: (req.user as any)?.id || null,
    updatedAt: new Date(),
  } as any);

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

  const pickup = settings.bosta?.pickup || {};
  const pickupAddress = sanitizeBostaAddress(pickup);

  const pickupCheck = validateBostaAddress(pickupAddress, "pickup");
  if (!pickupCheck.valid) {
    throw new BadRequest(
      `Bosta pickup address is incomplete. Missing: ${pickupCheck.missing.join(
        ", ",
      )}.`,
    );
  }

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

      const dropOffClean = sanitizeBostaAddress(dropOffAddress);
      const dropCheck = validateBostaAddress(dropOffClean, "drop-off");
      if (!dropCheck.valid) {
        throw new Error(
          `Drop-off address incomplete. Missing: ${dropCheck.missing.join(", ")}`,
        );
      }

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
        dropOffAddress: dropOffClean,
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
        const id =
          singleResponse?._id ||
          singleResponse?.deliveryId ||
          singleResponse?.data?._id ||
          "";
        bostaIds.push(id);
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

      v.order.bostaShipment = shipment._id;
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
// 🚚 PICKUPS
// ═══════════════════════════════════════════════════════════

export const getPendingPickups = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);

  const shipments = await BostaShipmentModel.find({
    superadminId,
    type: 10,
    deliveryId: { $ne: null },
    status: {
      $nin: ["Delivered", "Cancelled", "Returned", "Failed to deliver"],
    },
    $or: [
      { "pickup.status": { $exists: false } },
      { "pickup.status": null },
      { "pickup.status": { $ne: "scheduled" } },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  const orderIds = shipments.map((s) => s.relatedId);
  const orders = await OrderModel.find({
    _id: { $in: orderIds },
  })
    .select("_id reference user totalPriceAfterDiscount status")
    .lean();

  const ordersMap = new Map(orders.map((o) => [o._id.toString(), o]));

  const pending = shipments.map((s) => ({
    _id: s._id,
    deliveryId: s.deliveryId,
    trackingNumber: s.trackingNumber,
    status: s.status,
    cod: s.cod,
    dropOffAddress: s.dropOffAddress,
    receiver: s.receiver,
    createdAt: s.createdAt,
    order: ordersMap.get(s.relatedId) || null,
  }));

  SuccessResponse(res, {
    message: "Pending pickups fetched successfully",
    count: pending.length,
    shipments: pending,
  });
};

export const createDailyPickup = async (req: Request, res: Response) => {
  const superadminId = await getSuperadminId(req);
  const settings = await ensureSettings(superadminId);
  const creds = getBostaCreds(settings);

  if (!settings.bosta?.enabled) {
    throw new BadRequest("Bosta is not enabled in shipping settings");
  }

  const { scheduledDate, scheduledTimeSlot, contactPerson, notes } = req.body;

  if (!scheduledDate) {
    throw new BadRequest("scheduledDate is required (YYYY-MM-DD)");
  }
  if (!scheduledTimeSlot) {
    throw new BadRequest("scheduledTimeSlot is required");
  }

  const pendingShipments = await BostaShipmentModel.find({
    superadminId,
    type: 10,
    deliveryId: { $ne: null },
    status: {
      $nin: ["Delivered", "Cancelled", "Returned", "Failed to deliver"],
    },
    $or: [
      { "pickup.status": { $exists: false } },
      { "pickup.status": null },
      { "pickup.status": { $ne: "scheduled" } },
    ],
  });

  if (pendingShipments.length === 0) {
    throw new BadRequest("No pending shipments to schedule pickup for");
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
    scheduledTimeSlot:
      typeof scheduledTimeSlot === "string"
        ? scheduledTimeSlot
        : `${scheduledTimeSlot.from} to ${scheduledTimeSlot.to}`,
    contactPerson: finalContact,
    numberOfPackages: pendingShipments.length,
  };

  if (pickup?.businessLocationId) {
    payload.businessLocationId = pickup.businessLocationId;
  }
  if (notes) payload.notes = notes;

  console.log("🐛 Daily pickup payload:", JSON.stringify(payload, null, 2));

  let bostaResponse: any = null;
  let pickupAlreadyExists = false;
  let errorMessage = "";

  try {
    bostaResponse = await bostaService.createPickup(creds, payload);
  } catch (err: any) {
    errorMessage = err.message || "";

    if (
      errorMessage.includes("one pickup per district per day") ||
      errorMessage.includes("only one pickup") ||
      errorMessage.includes("already") ||
      errorMessage.includes("Can not choose today")
    ) {
      console.log("⚠️ Pickup already exists — treating as success");
      pickupAlreadyExists = true;
    } else {
      throw new BadRequest(`Bosta pickup failed: ${errorMessage}`);
    }
  }

  const pickupId = bostaResponse?._id || bostaResponse?.pickupId || "existing";
  const pickupStatus = bostaResponse?.state?.value || "scheduled";

  const updatedShipments = [];

  for (const shipment of pendingShipments) {
    try {
      (shipment as any).pickup = {
        pickupId,
        scheduledDate,
        scheduledTimeSlot: payload.scheduledTimeSlot,
        status: pickupAlreadyExists ? "scheduled" : pickupStatus,
        contactPerson: finalContact,
        notes: notes || "",
        createdAt: new Date(),
        rawResponse: bostaResponse || {
          note: "Pickup reused from existing",
        },
      };

      if (shipment.status === "Pickup requested") {
        shipment.status = pickupAlreadyExists
          ? "Pickup requested"
          : bostaResponse?.state?.value || "Pickup scheduled";
      }

      shipment.lastSyncAt = new Date();
      await shipment.save();

      updatedShipments.push({
        _id: shipment._id,
        trackingNumber: shipment.trackingNumber,
        deliveryId: shipment.deliveryId,
        status: shipment.status,
      });
    } catch (saveErr: any) {
      console.warn(`⚠️ Failed to update shipment ${shipment._id}:`, saveErr);
    }
  }

  SuccessResponse(res, {
    message: pickupAlreadyExists
      ? `✅ Pickup already existed — ${updatedShipments.length} shipments linked to it`
      : `✅ Daily pickup created for ${updatedShipments.length} shipments`,
    pickup: {
      pickupId,
      scheduledDate,
      scheduledTimeSlot: payload.scheduledTimeSlot,
      status: pickupAlreadyExists ? "scheduled" : pickupStatus,
      numberOfPackages: pendingShipments.length,
      reused: pickupAlreadyExists,
    },
    shipmentsCount: updatedShipments.length,
    shipments: updatedShipments,
    bostaResponse: bostaResponse || null,
  });
};

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

  if (!shipment.trackingNumber && !shipment.deliveryId) {
    throw new BadRequest("Shipment has no Bosta tracking number or deliveryId");
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

  if (scheduledTimeSlot) {
    if (typeof scheduledTimeSlot === "string") {
      payload.scheduledTimeSlot = scheduledTimeSlot;
    } else if (scheduledTimeSlot?.from && scheduledTimeSlot?.to) {
      payload.scheduledTimeSlot = `${scheduledTimeSlot.from} to ${scheduledTimeSlot.to}`;
    }
  }

  if (pickup?.businessLocationId) {
    payload.businessLocationId = pickup.businessLocationId;
  }
  if (notes) payload.notes = notes;

  let bostaResponse: any;
  try {
    bostaResponse = await bostaService.createPickup(creds, payload);
  } catch (err: any) {
    console.error("❌ Bosta pickup error:", err.message);

    if (
      err.message?.includes("one pickup per district per day") ||
      err.message?.includes("only one pickup") ||
      err.message?.includes("already") ||
      err.message?.includes("Can not choose today")
    ) {
      try {
        let fresh = null;
        if (shipment.trackingNumber) {
          fresh = await bostaService.getDeliveryByTrackingNumber(
            creds,
            shipment.trackingNumber,
          );
        } else if (shipment.deliveryId) {
          fresh = await bostaService.getDelivery(creds, shipment.deliveryId);
        }

        if (fresh) {
          shipment.status = fresh?.state?.value || shipment.status;
          shipment.statusCode = fresh?.state?.code || shipment.statusCode;
          shipment.lastSyncAt = new Date();
          shipment.rawResponse = fresh;
        }

        (shipment as any).pickup = {
          pickupId: "existing",
          scheduledDate,
          scheduledTimeSlot: payload.scheduledTimeSlot || null,
          status: "scheduled",
          contactPerson: finalContact,
          notes: notes || "",
          createdAt: new Date(),
          rawResponse: { note: "Pickup already exists" },
        };

        await shipment.save();

        return SuccessResponse(res, {
          message: "✅ Pickup already scheduled (existing pickup reused)",
          pickup: (shipment as any).pickup,
          shipment: {
            _id: shipment._id,
            deliveryId: shipment.deliveryId,
            trackingNumber: shipment.trackingNumber,
            status: shipment.status,
          },
        });
      } catch (refreshErr: any) {
        console.warn("⚠️ Could not refresh shipment:", refreshErr.message);
      }
    }

    try {
      if (shipment.trackingNumber) {
        const fresh = await bostaService.getDeliveryByTrackingNumber(
          creds,
          shipment.trackingNumber,
        );
        if (fresh) {
          shipment.deliveryId =
            fresh?.deliveryId || fresh?._id || shipment.deliveryId;
          shipment.status = fresh?.state?.value || shipment.status;
          shipment.lastSyncAt = new Date();
          await shipment.save();
        }
      }
    } catch (refreshErr) {
      console.warn("⚠️ Refresh attempt failed:", refreshErr);
    }

    throw new BadRequest(`Bosta pickup failed: ${err.message}`);
  }

  (shipment as any).pickup = {
    pickupId: bostaResponse?._id || bostaResponse?.pickupId || null,
    scheduledDate,
    scheduledTimeSlot: payload.scheduledTimeSlot || null,
    status: bostaResponse?.state?.value || "scheduled",
    contactPerson: finalContact,
    notes: notes || "",
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
// 🔄 RETURNS
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

  const pickupFromCustomer = sanitizeBostaAddress({
    city: dropOffAddress?.city || originalShipment.dropOffAddress.city,
    zoneId: dropOffAddress?.zoneId || originalShipment.dropOffAddress.zoneId,
    districtId:
      dropOffAddress?.districtId || originalShipment.dropOffAddress.districtId,
    firstLine:
      dropOffAddress?.firstLine || originalShipment.dropOffAddress.firstLine,
    secondLine:
      dropOffAddress?.secondLine || originalShipment.dropOffAddress.secondLine,
    buildingNumber:
      dropOffAddress?.buildingNumber ||
      originalShipment.dropOffAddress.buildingNumber,
    floor: dropOffAddress?.floor || originalShipment.dropOffAddress.floor,
    apartment:
      dropOffAddress?.apartment || originalShipment.dropOffAddress.apartment,
  });

  const dropOffToStore = sanitizeBostaAddress(pickup);

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

  const newDeliveryId =
    bostaResponse?.deliveryId ||
    bostaResponse?._id ||
    bostaResponse?.data?.deliveryId ||
    bostaResponse?.data?._id ||
    null;

  const newTrackingNumber =
    bostaResponse?.trackingNumber ||
    bostaResponse?.tracking?.number ||
    bostaResponse?.data?.trackingNumber ||
    bostaResponse?.data?.tracking?.number ||
    null;

  const shipment = await BostaShipmentModel.create({
    superadminId,
    relatedModel: "Order",
    relatedId: order._id.toString(),
    type: returnType,

    deliveryId: newDeliveryId,
    trackingNumber: newTrackingNumber,
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
// 📋 SHIPMENTS MANAGEMENT
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
// 🔍 TRACKING
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

  if (shipment.status === "Cancelled") {
    throw new BadRequest("Shipment is cancelled. Cannot refresh tracking.");
  }

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

  if (!shipment.deliveryId) {
    shipment.deliveryId =
      bostaData?.deliveryId || bostaData?._id || shipment.deliveryId;
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

  if (shipment.status === "Cancelled") {
    throw new BadRequest("Shipment is cancelled. Cannot sync.");
  }

  if (!shipment.deliveryId && !shipment.trackingNumber) {
    throw new BadRequest("Shipment has no Bosta deliveryId or trackingNumber");
  }

  let bostaData: any = null;
  if (shipment.deliveryId) {
    bostaData = await bostaService.getDelivery(creds, shipment.deliveryId);
  } else {
    bostaData = await bostaService.getDeliveryByTrackingNumber(
      creds,
      shipment.trackingNumber!,
    );
  }

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

  if (shipment.status === "Cancelled") {
    throw new BadRequest("Shipment is already cancelled.");
  }
  if (shipment.status === "Delivered") {
    throw new BadRequest("Cannot cancel a delivered shipment.");
  }

  if (!shipment.trackingNumber && !shipment.deliveryId) {
    throw new BadRequest("Shipment has no tracking number or deliveryId");
  }

  let cancelled = false;
  let lastError: any = null;

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

  if (shipment.status === "Cancelled") {
    throw new BadRequest("Shipment is cancelled. Label not available.");
  }

  if (!shipment.deliveryId && !shipment.trackingNumber) {
    throw new BadRequest("Shipment has no Bosta deliveryId or trackingNumber");
  }

  let bostaData: any = null;
  if (shipment.deliveryId) {
    bostaData = await bostaService.getDelivery(creds, shipment.deliveryId);
  } else {
    bostaData = await bostaService.getDeliveryByTrackingNumber(
      creds,
      shipment.trackingNumber!,
    );
  }

  const labelUrl = bostaData?.labelUrl || bostaData?.label || shipment.labelUrl;
  if (!labelUrl) throw new BadRequest("Label is not available yet");

  SuccessResponse(res, {
    message: "Label URL fetched successfully",
    labelUrl,
  });
};

// ═══════════════════════════════════════════════════════════
// 🎁 FREE SHIPPING PRODUCTS
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
