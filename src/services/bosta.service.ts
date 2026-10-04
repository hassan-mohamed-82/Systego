// src/services/bosta.service.ts
import axios, { AxiosInstance } from "axios";
import { BostaCredentials } from "../utils/shipping/getBostaCreds";
import { BadRequest } from "../Errors/BadRequest";

// ═══════════════════════════════════════════════════════════
// Bosta Address (dropOff / pickup / return)
// ═══════════════════════════════════════════════════════════
export interface BostaAddress {
  city: string;
  zoneId: string;
  districtId: string;
  firstLine: string;
  secondLine?: string;
  buildingNumber?: string;
  floor?: string;
  apartment?: string;
}

// ═══════════════════════════════════════════════════════════
// Bosta Delivery Payload
// ═══════════════════════════════════════════════════════════
export interface BostaDeliveryPayload {
  type: number;
  specs: {
    packageType: string;
    size: string;
    packageDetails: {
      itemsCount: number;
      description: string;
    };
    weight?: number;
  };
  receiver: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  dropOffAddress: BostaAddress;
  pickupAddress: BostaAddress;
  returnAddress: BostaAddress;
  businessReference: string;
  cod?: number;
  notes?: string;
  allowToOpenPackage?: boolean;
  webhookUrl?: string;
}

// ═══════════════════════════════════════════════════════════
// Bosta Pickup Payload
// ═══════════════════════════════════════════════════════════
export interface BostaPickupPayload {
  scheduledDate: string; // "2025-01-15"
  scheduledTimeSlot?: {
    from: string; // "10:00"
    to: string; // "14:00"
  };
  contactPerson: {
    firstName: string;
    lastName?: string;
    phone: string;
    email?: string;
  };
  numberOfPackages: number;
  businessLocationId?: string;
  notes?: string;
}

class BostaService {
  // ═══════════════════════════════════════════════════════════
  // client جديد لكل طلب
  // ═══════════════════════════════════════════════════════════
  private createClient({ apiKey, baseUrl }: BostaCredentials): AxiosInstance {
    if (!apiKey) throw new Error("❌ Bosta API key is missing");

    const client = axios.create({
      baseURL: baseUrl,
      timeout: 20000,
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
        "X-Requested-By": "Systego",
      },
    });

    // ✅ error interceptor
    client.interceptors.response.use(
      (res) => res,
      (error) => {
        const bostaData = error.response?.data;
        const status = error.response?.status;
        const url = error.config?.url;

        console.error("❌ Bosta API Error:", {
          url,
          method: error.config?.method,
          status,
          data: bostaData,
        });

        if (bostaData && typeof bostaData === "object") {
          const message =
            bostaData.message ||
            bostaData.error ||
            `Bosta request failed with status ${status}`;

          throw new BadRequest(`Bosta: ${message}`, {
            source: "bosta",
            status,
            errorCode: bostaData.errorCode,
            url,
            raw: bostaData,
          });
        }

        if (status) {
          throw new BadRequest(`Bosta request failed with status ${status}`, {
            source: "bosta",
            status,
            url,
          });
        }

        throw new BadRequest(
          `Failed to reach Bosta: ${error.message || "Unknown error"}`,
          { source: "bosta", url },
        );
      },
    );

    return client;
  }

  // ═══════════════════════════════════════════════════════════
  // 📍 CITIES
  // ═══════════════════════════════════════════════════════════
  async getCities(creds: BostaCredentials) {
    const { data } = await this.createClient(creds).get("/cities");
    return data?.data?.list || data?.data || [];
  }

  // ═══════════════════════════════════════════════════════════
  // 📍 DISTRICTS
  // ═══════════════════════════════════════════════════════════
  async getDistricts(creds: BostaCredentials, cityId: string) {
    const { data } = await this.createClient(creds).get(
      `/cities/${cityId}/districts`,
    );
    return data?.data?.districts || data?.data?.list || data?.data || [];
  }

  // ═══════════════════════════════════════════════════════════
  // 💰 PRICING — 1) Shipment Calculator (by city names)
  // ═══════════════════════════════════════════════════════════
  async getShipmentPricing(
    creds: BostaCredentials,
    params: {
      pickupCity: string;
      dropOffCity: string;
      size?: "Normal" | "Light Bulky" | "Heavy Bulky";
      type?:
        | "SEND"
        | "CASH_COLLECTION"
        | "CUSTOMER_RETURN_PICKUP"
        | "EXCHANGE"
        | "SIGN_AND_RETURN";
      cod?: number;
    },
  ) {
    const query = {
      pickupCity: params.pickupCity,
      dropOffCity: params.dropOffCity,
      size: params.size || "Normal",
      type: params.type || "SEND",
      ...(params.cod !== undefined && { cod: params.cod }),
    };

    const { data } = await this.createClient(creds).get(
      "/pricing/shipment/calculator",
      { params: query },
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // 💰 PRICING — 2) Calculator (by sector IDs)
  // ═══════════════════════════════════════════════════════════
  async getSectorPricing(
    creds: BostaCredentials,
    params: {
      pickupSectorId: number;
      dropoffSectorId?: number;
      tierIdSelector: string;
      type?: string;
      vatIncluded?: boolean;
    },
  ) {
    const query = {
      pickupSectorId: params.pickupSectorId,
      tierIdSelector: params.tierIdSelector,
      ...(params.dropoffSectorId !== undefined && {
        dropoffSectorId: params.dropoffSectorId,
      }),
      ...(params.type && { type: params.type }),
      ...(params.vatIncluded !== undefined && {
        vatIncluded: params.vatIncluded,
      }),
    };

    const { data } = await this.createClient(creds).get("/pricing/calculator", {
      params: query,
    });
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // 💰 PRICING — 3) Insurance Fee Estimate
  // ═══════════════════════════════════════════════════════════
  async getInsuranceFeeEstimate(creds: BostaCredentials, goodsValue: number) {
    const { data } = await this.createClient(creds).get(
      "/pricing/insuranceFeeEstimate",
      { params: { goodsValue } },
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // 📦 CREATE DELIVERY
  // ═══════════════════════════════════════════════════════════
  async createDelivery(creds: BostaCredentials, payload: BostaDeliveryPayload) {
    const { data } = await this.createClient(creds).post(
      "/deliveries?apiVersion=1",
      payload,
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // 📦 BULK CREATE
  // ═══════════════════════════════════════════════════════════
  async createBulkDeliveries(
    creds: BostaCredentials,
    deliveries: BostaDeliveryPayload[],
  ) {
    const { data } = await this.createClient(creds).post(
      "/deliveries/bulk?apiVersion=1",
      { deliveries },
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // 🔍 GET DELIVERY BY ID
  // ═══════════════════════════════════════════════════════════
  async getDelivery(creds: BostaCredentials, deliveryId: string) {
    const { data } = await this.createClient(creds).get(
      `/deliveries/${deliveryId}`,
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // 🔍 GET DELIVERY BY TRACKING
  // ═══════════════════════════════════════════════════════════
  async getDeliveryByTrackingNumber(
    creds: BostaCredentials,
    trackingNumber: string,
  ) {
    const { data } = await this.createClient(creds).get(
      `/deliveries/business/${trackingNumber}`,
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // ❌ CANCEL DELIVERY
  // ═══════════════════════════════════════════════════════════
  async cancelDeliveryByTracking(
    creds: BostaCredentials,
    trackingNumber: string,
  ) {
    const { data } = await this.createClient(creds).delete(
      `/deliveries/business/${trackingNumber}/terminate`,
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // 🚚 CREATE PICKUP — طلب مندوب يستلم من الفرع
  // ═══════════════════════════════════════════════════════════
  async createPickup(creds: BostaCredentials, payload: BostaPickupPayload) {
    const { data } = await this.createClient(creds).post("/pickups", payload);
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // 📅 GET PICKUP TIME SLOTS
  // ═══════════════════════════════════════════════════════════
  async getPickupTimeSlots(
    creds: BostaCredentials,
    params: {
      date: string;
      businessLocationId?: string;
    },
  ) {
    const { data } = await this.createClient(creds).get("/pickups/time-slots", {
      params,
    });
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // 📋 LIST PICKUPS (اختياري — لعرض كل الاستلامات)
  // ═══════════════════════════════════════════════════════════
  async listPickups(
    creds: BostaCredentials,
    params?: {
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
    },
  ) {
    const { data } = await this.createClient(creds).get("/pickups", {
      params,
    });
    return data?.data || data;
  }
}

export default new BostaService();
