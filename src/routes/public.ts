import { Router } from "express";
import { getPublicProducts } from "../controller/public/products";
import {
  acceptCustomOrder,
  rejectCustomOrder,
} from "../controller/public/customOrderWebhook";
import { requireWebhookApiKey } from "../middlewares/webhookApiKey";
import { catchAsync } from "../utils/catchAsync";

const publicRouter = Router();

// Open public storefront data (no key, kept for backwards compatibility).
publicRouter.get("/products", getPublicProducts);

// Public (no JWT) e-commerce order status endpoints — protected by x-api-key.
// The order identifier is sent as a query string: ?order_id=ORD-5091
publicRouter.get(
  "/orders/accept",
  requireWebhookApiKey,
  catchAsync(acceptCustomOrder),
);
publicRouter.post(
  "/orders/accept",
  requireWebhookApiKey,
  catchAsync(acceptCustomOrder),
);
publicRouter.get(
  "/orders/reject",
  requireWebhookApiKey,
  catchAsync(rejectCustomOrder),
);
publicRouter.post(
  "/orders/reject",
  requireWebhookApiKey,
  catchAsync(rejectCustomOrder),
);

export default publicRouter;
