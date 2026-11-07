import { Router } from "express";
import { getPublicProducts } from "../controller/public/products";
import {
  acceptEcommerceOnlineOrder,
  createEcommerceOnlineOrder,
  rejectEcommerceOnlineOrder,
} from "../controller/public/onlineOrders";
import { ecommerceApiKey } from "../middlewares/ecommerceApiKey";
import { catchAsync } from "../utils/catchAsync";

const publicRouter = Router();

// Open public storefront data (no key, kept for backwards compatibility).
publicRouter.get("/products", getPublicProducts);

// 🔑 Ecommerce integration — X-API-KEY only (no JWT).
// The key is the tenant key, so it differs for every client/deployment.
publicRouter.post(
  "/online-orders",
  ecommerceApiKey,
  catchAsync(createEcommerceOnlineOrder)
);
publicRouter.post(
  "/online-orders/accept",
  ecommerceApiKey,
  catchAsync(acceptEcommerceOnlineOrder)
);
publicRouter.post(
  "/online-orders/reject",
  ecommerceApiKey,
  catchAsync(rejectEcommerceOnlineOrder)
);

export default publicRouter;
