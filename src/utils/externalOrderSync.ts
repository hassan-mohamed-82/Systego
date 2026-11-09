import axios from "axios";
import { CustomerModel } from "../models/schema/admin/POS/customer";
import { OrderModel } from "../models/schema/users/Order";

/**
 * Sends a newly created storefront order to the external e-commerce platform.
 *
 * The external platform exposes:
 *   POST https://bcknd.smartego.org/api/webhooks/custom/order
 * with the header `x-api-key`.
 *
 * The API key is the one issued by Super Systego Back for this tenant
 * (`SUPER_SYSTEGO_API_KEY`), unless `ECOMMERCE_WEBHOOK_API_KEY` overrides it.
 *
 * This call is best-effort: the checkout must never fail because the external
 * platform is down. Errors are logged and swallowed.
 */

const DEFAULT_WEBHOOK_URL =
  "https://bcknd.smartego.org/api/webhooks/custom/order";

export interface ExternalOrderSyncInput {
  orderId: string;
  reference?: string | null;
  userId?: string | null;
  totalPrice: number;
  currency?: string;
  fallbackCustomerName?: string;
  fallbackCustomerPhone?: string;
}

const getWebhookUrl = (): string =>
  (process.env.ECOMMERCE_WEBHOOK_URL || DEFAULT_WEBHOOK_URL).trim();

const getWebhookApiKey = (): string =>
  (process.env.ECOMMERCE_WEBHOOK_API_KEY || process.env.SUPER_SYSTEGO_API_KEY || "").trim();

/**
 * Tries to read the external platform's order id from a response body so the
 * platform can call accept/reject with its own `?id=` later.
 */
const extractExternalOrderId = (payload: any): string | null => {
  if (!payload || typeof payload !== "object") return null;

  const roots = [
    payload,
    payload.data,
    payload.order,
    payload.data?.order,
    payload.data?.data,
    payload.data?.data?.order,
  ];

  for (const root of roots) {
    if (!root || typeof root !== "object") continue;

    for (const key of ["id", "_id", "order_id", "orderId"]) {
      const value = (root as any)[key];
      if (typeof value === "string" || typeof value === "number") {
        const text = String(value).trim();
        if (text) return text;
      }
    }
  }

  return null;
};

export const syncOrderToExternalPlatform = async (
  input: ExternalOrderSyncInput,
): Promise<boolean> => {
  const url = getWebhookUrl();
  const apiKey = getWebhookApiKey();

  if (!url) {
    console.warn("[externalOrderSync] ECOMMERCE_WEBHOOK_URL is empty — skipped");
    return false;
  }

  if (!apiKey) {
    console.warn(
      "[externalOrderSync] No webhook API key configured (SUPER_SYSTEGO_API_KEY) — skipped",
    );
    return false;
  }

  let customerName = (input.fallbackCustomerName || "").trim();
  let customerPhone = (input.fallbackCustomerPhone || "").trim();

  if (input.userId) {
    try {
      const customer = await CustomerModel.findById(input.userId)
        .select("name phone_number")
        .lean();

      if (customer) {
        customerName = (customer as any).name || customerName;
        customerPhone = (customer as any).phone_number || customerPhone;
      }
    } catch (error) {
      console.warn("[externalOrderSync] Failed to load customer:", error);
    }
  }

  const payload = {
    id: input.reference || input.orderId,
    customer_name: customerName || "Guest Customer",
    customer_phone: customerPhone,
    total_price: Number(input.totalPrice) || 0,
    currency: (input.currency || "EGP").toUpperCase(),
  };

  // The external platform expects form-encoded data (not JSON).
  const form = new URLSearchParams();
  form.append("id", String(payload.id));
  form.append("customer_name", payload.customer_name);
  form.append("customer_phone", payload.customer_phone);
  form.append("total_price", String(payload.total_price));
  form.append("currency", payload.currency);

  try {
    const response = await axios.post(url, form, {
      timeout: 10_000,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
    });

    console.log(
      `[externalOrderSync] Order ${payload.id} sent to external platform (${response.status})`,
    );

    // If the external platform returns its own order id, store it so it can
    // call accept/reject with `?id=<its own id>`.
    const externalOrderId = extractExternalOrderId(response.data);
    if (externalOrderId) {
      try {
        await OrderModel.updateOne(
          {
            _id: input.orderId,
            $or: [
              { externalOrderId: { $exists: false } },
              { externalOrderId: null },
              { externalOrderId: "" },
            ],
          },
          { $set: { externalOrderId } },
        );
      } catch (error) {
        console.warn(
          "[externalOrderSync] Could not store the external order id:",
          error,
        );
      }
    }

    return true;
  } catch (error: any) {
    console.error(
      `[externalOrderSync] Failed to send order ${payload.id}:`,
      error?.response?.status,
      error?.response?.data || error?.message,
    );
    return false;
  }
};
