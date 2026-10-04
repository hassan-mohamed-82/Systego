// src/routes/users/Shipping.ts
import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
  getActiveShippingMethod,
  getBostaCitiesForUser,
  getBostaDistrictsForUser,
} from "../../controller/users/shipping";

const route = Router();

// ═══════════════════════════════════════════════════════════
// 🛒 Store Shipping Routes
// ═══════════════════════════════════════════════════════════

// Active method — العميل يعرف هو self ولا bosta
route.get("/active-method", catchAsync(getActiveShippingMethod));

// Bosta Cities (لو bosta مفعّل)
route.get("/bosta/cities", catchAsync(getBostaCitiesForUser));

// Bosta Districts
route.get("/bosta/districts/:cityId", catchAsync(getBostaDistrictsForUser));

export default route;
