// src/services/bosta.service.ts
import axios, { AxiosInstance } from "axios";
import { BostaCredentials } from "../utils/shipping/getBostaCreds";
import { BadRequest } from "../Errors/BadRequest";

// ═══════════════════════════════════════════════════════════
// Bosta Address
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
  scheduledDate: string;
  scheduledTimeSlot?: string;
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

// ═══════════════════════════════════════════════════════════
// 🗺️ City → Sector ID mapping
// ═══════════════════════════════════════════════════════════
export const CITY_TO_SECTOR: Record<string, number> = {
  // Sector 1: Cairo & Giza
  cairo: 1,
  giza: 1,

  // Sector 2: Alexandria & Behira
  alexandria: 2,
  behira: 2,
  "kafr alsheikh": 2,
  "kafr el sheikh": 2,

  // Sector 3: Delta & Canal
  dakahlia: 3,
  damietta: 3,
  gharbia: 3,
  monufia: 3,
  "el kalioubia": 3,
  sharqia: 3,
  ismailia: 3,
  "port said": 3,
  suez: 3,

  // Sector 4: Near Upper
  fayoum: 4,
  "bani suif": 4,
  menya: 4,

  // Sector 5: Far Upper & Matrouh
  assuit: 5,
  sohag: 5,
  qena: 5,
  luxor: 5,
  aswan: 5,
  matrouh: 5,
  "new valley": 5,

  // Sector 6: North Coast
  "north coast": 6,

  // Sector 7: Sinai & Red Sea
  "north sinai": 7,
  "south sinai": 7,
  "red sea": 7,
};

// ═══════════════════════════════════════════════════════════
// 🎯 Pricing result interface
// ═══════════════════════════════════════════════════════════
export interface PricingResult {
  total: number; // ⭐ اللي Bosta بتاخده منك (شامل كل حاجة)
  baseCost: number; // سعر الشحن الأساسي قبل VAT
  vatAmount: number; // قيمة VAT
  codFee: number; // رسوم COD (لو فيه)
  zeroCodDiscount: number; // خصم لما مفيش COD
  pickupFee: number; // رسوم الاستلام (لو فيه)
  currency: string;
  source: "sector" | "city" | "fallback";
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
  // 🗺️ Get sector ID from city name
  // ═══════════════════════════════════════════════════════════
  getSectorFromCity(cityName: string): number | null {
    if (!cityName) return null;

    const normalized = cityName.toLowerCase().trim();

    if (CITY_TO_SECTOR[normalized]) {
      return CITY_TO_SECTOR[normalized];
    }

    for (const [key, sector] of Object.entries(CITY_TO_SECTOR)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return sector;
      }
    }

    return null;
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
  // 💰 PRICING — Main Entry
  // ═══════════════════════════════════════════════════════════
  async getShipmentPricing(
    creds: BostaCredentials,
    params: {
      pickupCity: string;
      dropOffCity: string;
      cod?: number;
      size?: "Normal" | "Light Bulky" | "Heavy Bulky";
      type?: string;
      tierIdSelector?: string;
      vatIncluded?: boolean;
    },
  ): Promise<PricingResult> {
    const pickupSectorId = this.getSectorFromCity(params.pickupCity);
    const dropoffSectorId = this.getSectorFromCity(params.dropOffCity);

    console.log("🔍 Sector lookup:", {
      pickupCity: params.pickupCity,
      pickupSectorId,
      dropOffCity: params.dropOffCity,
      dropoffSectorId,
      cod: params.cod,
    });

    if (pickupSectorId && dropoffSectorId) {
      try {
        const sectorData = await this.getSectorPricing(creds, {
          pickupSectorId,
          dropoffSectorId,
          tierIdSelector: params.tierIdSelector || "c__CT4DU9I",
          type: params.type || "SEND",
          vatIncluded: false,
        });

        return this.computePricingFromTier(sectorData, params.cod);
      } catch (err: any) {
        console.warn(
          "⚠️ Sector pricing failed, falling back to city pricing:",
          err.message,
        );
      }
    }

    return this.getCityBasedPricing(creds, params);
  }

  // ═══════════════════════════════════════════════════════════
  // 🧮 Compute total from tier config
  // ═══════════════════════════════════════════════════════════
  private computePricingFromTier(sectorData: any, cod?: number): PricingResult {
    const tier = sectorData?.tier || sectorData?.data?.tier || sectorData;

    if (!tier || typeof tier !== "object") {
      console.warn("⚠️ Invalid tier data, using fallback");
      return {
        total: 0,
        baseCost: 0,
        vatAmount: 0,
        codFee: 0,
        zeroCodDiscount: 0,
        pickupFee: 0,
        currency: "EGP",
        source: "fallback",
      };
    }

    const baseCost = Number(tier?.cost || 0);
    const vatRate = Number(tier?.country?.vat || 0.14);
    const vatAmount = Math.round(baseCost * vatRate * 100) / 100;

    let codFee = 0;
    if (cod && cod > 0) {
      const extraCodFee = tier?.extraCodFee;
      if (extraCodFee?.percentage) {
        const computedFee = cod * Number(extraCodFee.percentage);
        const minFee = Number(extraCodFee.minimumFeeAmount || 0);
        codFee = Math.max(computedFee, minFee);
      } else if (extraCodFee?.fixedAmount) {
        codFee = Number(extraCodFee.fixedAmount);
      }
    }

    let zeroCodDiscount = 0;
    if (!cod || cod === 0) {
      if (tier?.zeroCodDiscount?.amount) {
        zeroCodDiscount = Number(tier.zeroCodDiscount.amount);
      }
    }

    const pickupFee = 0;

    const total =
      Math.round(
        (baseCost + vatAmount + codFee - zeroCodDiscount + pickupFee) * 100,
      ) / 100;

    console.log("💰 Tier computation:", {
      baseCost,
      vatRate,
      vatAmount,
      cod,
      codFee,
      zeroCodDiscount,
      total,
    });

    return {
      total: Math.max(total, 0),
      baseCost,
      vatAmount,
      codFee,
      zeroCodDiscount,
      pickupFee,
      currency: tier?.country?.currency || "EGP",
      source: "sector",
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 🔄 Fallback: city-based pricing
  // ═══════════════════════════════════════════════════════════
  private async getCityBasedPricing(
    creds: BostaCredentials,
    params: {
      pickupCity: string;
      dropOffCity: string;
      cod?: number;
      size?: "Normal" | "Light Bulky" | "Heavy Bulky";
      type?: string;
    },
  ): Promise<PricingResult> {
    const query = {
      pickupCity: params.pickupCity,
      dropOffCity: params.dropOffCity,
      size: params.size || "Normal",
      type: params.type || "SEND",
      ...(params.cod !== undefined && { cod: params.cod }),
    };

    try {
      const { data } = await this.createClient(creds).get(
        "/pricing/shipment/calculator",
        { params: query },
      );

      const response = data?.data || data;

      const total = Number(
        response?.total ||
          response?.price ||
          response?.shippingCost ||
          response?.cost ||
          response?.tier?.cost ||
          0,
      );

      return {
        total,
        baseCost: Number(response?.tier?.cost || total),
        vatAmount: Number(response?.vat || 0),
        codFee: Number(response?.codFee || 0),
        zeroCodDiscount: Number(response?.zeroCodDiscount || 0),
        pickupFee: 0,
        currency: response?.currency || "EGP",
        source: "city",
      };
    } catch (err: any) {
      console.error("❌ City pricing failed:", err.message);
      return {
        total: 0,
        baseCost: 0,
        vatAmount: 0,
        codFee: 0,
        zeroCodDiscount: 0,
        pickupFee: 0,
        currency: "EGP",
        source: "fallback",
      };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 💰 PRICING — 2) Sector-based calculator (raw)
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
  async cancelDelivery(creds: BostaCredentials, deliveryId: string) {
    const { data } = await this.createClient(creds).delete(
      `/deliveries/${deliveryId}`,
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // ❌ TERMINATE BY TRACKING
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
  // 🚚 CREATE PICKUP
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
  // 📋 LIST PICKUPS
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
