// src/routes/Shipping.ts
import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { authorizePermissions } from "../../middlewares/haspremission";

import {
  getShippingSettings,
  updateShippingSettings,
  getFreeShippingProducts,
  updateFreeShippingProducts,
  testBostaConnection,
  getBostaCities,
  getBostaDistricts,
  createBostaDeliveryFromOrder,
  bulkCreateBostaDeliveries,
  createBostaReturnDelivery,
  createBostaPickup,
  getBostaPickupTimeSlots,
  getBostaShipmentByOrder,
  syncBostaShipment,
  cancelBostaShipment,
  getBostaLabel,
  trackBostaShipment,
  refreshBostaTracking,
  getBostaTrackingHistory,
  listBostaShipments,
  getBostaShipmentsStats,
  getBostaShipmentPricing,
  getBostaSectorPricing,
  getBostaInsuranceEstimate,
} from "../../controller/admin/Shipping";
import {
  updateShippingSettingsSchema,
  updateFreeShippingProductsSchema,
  createBostaDeliverySchema,
  bulkCreateBostaDeliveriesSchema,
  createBostaReturnSchema,
} from "../../validation/admin/Shipping";

const route = Router();

// ═══════════════════════════════════════════════════════════
// Shipping Settings
// ═══════════════════════════════════════════════════════════
route.get(
  "/settings",
  authorizePermissions("zone", "View"),
  catchAsync(getShippingSettings),
);
route.put(
  "/settings",
  authorizePermissions("zone", "Edit"),
  validate(updateShippingSettingsSchema),
  catchAsync(updateShippingSettings),
);

// ═══════════════════════════════════════════════════════════
// Bosta lookup
// ═══════════════════════════════════════════════════════════
route.post(
  "/bosta/test",
  authorizePermissions("zone", "Edit"),
  catchAsync(testBostaConnection),
);
route.get(
  "/bosta/cities",
  authorizePermissions("zone", "View"),
  catchAsync(getBostaCities),
);
route.get(
  "/bosta/districts/:cityId",
  authorizePermissions("zone", "View"),
  catchAsync(getBostaDistricts),
);

route.get(
  "/bosta/pricing/shipment",
  authorizePermissions("zone", "View"),
  catchAsync(getBostaShipmentPricing),
);
route.get(
  "/bosta/pricing/sector",
  authorizePermissions("zone", "View"),
  catchAsync(getBostaSectorPricing),
);
route.get(
  "/bosta/pricing/insurance",
  authorizePermissions("zone", "View"),
  catchAsync(getBostaInsuranceEstimate),
);

// ═══════════════════════════════════════════════════════════
// 🚚 Bosta Pickup
// ═══════════════════════════════════════════════════════════
route.post(
  "/bosta/pickups",
  authorizePermissions("zone", "Edit"),
  catchAsync(createBostaPickup),
);
route.get(
  "/bosta/pickups/time-slots",
  authorizePermissions("zone", "View"),
  catchAsync(getBostaPickupTimeSlots),
);

// ═══════════════════════════════════════════════════════════
// 📊 Bosta Shipments — Stats + List
// ═══════════════════════════════════════════════════════════
route.get(
  "/bosta/shipments/stats",
  authorizePermissions("zone", "View"),
  catchAsync(getBostaShipmentsStats),
);
route.get(
  "/bosta/shipments",
  authorizePermissions("zone", "View"),
  catchAsync(listBostaShipments),
);

// ═══════════════════════════════════════════════════════════
// 🚚 Bosta Shipments — Bulk (لازم قبل /from-order)
// ═══════════════════════════════════════════════════════════
route.post(
  "/bosta/deliveries/bulk",
  authorizePermissions("zone", "Edit"),
  validate(bulkCreateBostaDeliveriesSchema),
  catchAsync(bulkCreateBostaDeliveries),
);
route.post(
  "/bosta/deliveries/from-order",
  authorizePermissions("zone", "Edit"),
  validate(createBostaDeliverySchema),
  catchAsync(createBostaDeliveryFromOrder),
);
route.post(
  "/bosta/deliveries/return",
  authorizePermissions("zone", "Edit"),
  validate(createBostaReturnSchema),
  catchAsync(createBostaReturnDelivery),
);
route.get(
  "/bosta/orders/:orderId/shipment",
  authorizePermissions("zone", "View"),
  catchAsync(getBostaShipmentByOrder),
);

// ═══════════════════════════════════════════════════════════
// 🔍 Bosta Tracking
// ═══════════════════════════════════════════════════════════
route.get(
  "/bosta/track/:trackingNumber",
  authorizePermissions("zone", "View"),
  catchAsync(trackBostaShipment),
);
route.post(
  "/bosta/shipments/:shipmentId/refresh",
  authorizePermissions("zone", "Edit"),
  catchAsync(refreshBostaTracking),
);
route.get(
  "/bosta/shipments/:shipmentId/history",
  authorizePermissions("zone", "View"),
  catchAsync(getBostaTrackingHistory),
);

// ═══════════════════════════════════════════════════════════
// 🔄 Bosta Sync / Cancel / Label
// ═══════════════════════════════════════════════════════════
route.post(
  "/bosta/shipments/:shipmentId/sync",
  authorizePermissions("zone", "Edit"),
  catchAsync(syncBostaShipment),
);
route.delete(
  "/bosta/shipments/:shipmentId",
  authorizePermissions("zone", "Edit"),
  catchAsync(cancelBostaShipment),
);
route.get(
  "/bosta/shipments/:shipmentId/label",
  authorizePermissions("zone", "View"),
  catchAsync(getBostaLabel),
);

// ═══════════════════════════════════════════════════════════
// Free shipping products
// ═══════════════════════════════════════════════════════════
route.get(
  "/free-products",
  authorizePermissions("product", "View"),
  catchAsync(getFreeShippingProducts),
);
route.put(
  "/free-products",
  authorizePermissions("product", "Edit"),
  validate(updateFreeShippingProductsSchema),
  catchAsync(updateFreeShippingProducts),
);

export default route;
