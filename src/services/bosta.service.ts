// src/services/bosta.service.ts
import axios from "axios";
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
// 🆕 Pickup Location Payload
// ═══════════════════════════════════════════════════════════
export interface PickupLocationPayload {
  locationName: string;
  contacts: Array<{
    firstName: string;
    lastName: string;
    phone: string;
    isDefault: boolean;
  }>;
  address: {
    city: string;
    zoneId: string;
    districtId: string;
    firstLine: string;
    secondLine?: string;
    floor?: string;
    apartment?: string;
    buildingNumber?: string;
  };
}

// ═══════════════════════════════════════════════════════════
// 🗺️ City → Sector ID mapping
// ═══════════════════════════════════════════════════════════
export const CITY_TO_SECTOR: Record<string, number> = {
  cairo: 1,
  giza: 1,
  alexandria: 2,
  behira: 2,
  "kafr alsheikh": 2,
  "kafr el sheikh": 2,
  dakahlia: 3,
  damietta: 3,
  gharbia: 3,
  monufia: 3,
  "el kalioubia": 3,
  sharqia: 3,
  ismailia: 3,
  "port said": 3,
  suez: 3,
  fayoum: 4,
  "bani suif": 4,
  menya: 4,
  assuit: 5,
  sohag: 5,
  qena: 5,
  luxor: 5,
  aswan: 5,
  matrouh: 5,
  "new valley": 5,
  "north coast": 6,
  "north sinai": 7,
  "south sinai": 7,
  "red sea": 7,
};

// ═══════════════════════════════════════════════════════════
// 🎯 Pricing result interface
// ═══════════════════════════════════════════════════════════
export interface PricingResult {
  total: number;
  baseCost: number;
  vatAmount: number;
  codFee: number;
  zeroCodDiscount: number;
  pickupFee: number;
  currency: string;
  source: "sector" | "city" | "fallback";
}

class BostaService {
  private createClient({ apiKey, baseUrl }: BostaCredentials) {
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

  getSectorFromCity(cityName: string): number | null {
    if (!cityName) return null;
    const normalized = cityName.toLowerCase().trim();
    if (CITY_TO_SECTOR[normalized]) return CITY_TO_SECTOR[normalized];

    for (const [key, sector] of Object.entries(CITY_TO_SECTOR)) {
      if (normalized.includes(key) || key.includes(normalized)) return sector;
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // 📍 CITIES
  // ═══════════════════════════════════════════════════════════
  async getCities(creds: BostaCredentials): Promise<any[]> {
    const { data } = await this.createClient(creds).get("/cities");
    return data?.data?.list || data?.data || [];
  }

  async getDistricts(creds: BostaCredentials, cityId: string): Promise<any[]> {
    const { data } = await this.createClient(creds).get(
      `/cities/${cityId}/districts`,
    );
    return data?.data?.districts || data?.data?.list || data?.data || [];
  }

  // ═══════════════════════════════════════════════════════════
  // 📍 BUSINESS PICKUP LOCATIONS
  // ═══════════════════════════════════════════════════════════
  async getPickupLocations(creds: BostaCredentials): Promise<any> {
    const { data } = await this.createClient(creds).get("/pickup-locations");
    return data?.data || data;
  }

  async getPickupLocationById(
    creds: BostaCredentials,
    locationId: string,
  ): Promise<any> {
    const { data } = await this.createClient(creds).get(
      `/pickup-locations/${locationId}`,
    );
    return data?.data || data;
  }

  async createPickupLocation(
    creds: BostaCredentials,
    payload: PickupLocationPayload,
  ): Promise<any> {
    const { data } = await this.createClient(creds).post(
      "/pickup-locations",
      payload,
    );
    return data?.data || data;
  }

  async updatePickupLocation(
    creds: BostaCredentials,
    locationId: string,
    payload: any,
  ): Promise<any> {
    const { data } = await this.createClient(creds).put(
      `/pickup-locations/${locationId}`,
      payload,
    );
    return data?.data || data;
  }

  async deletePickupLocation(
    creds: BostaCredentials,
    locationId: string,
  ): Promise<any> {
    const { data } = await this.createClient(creds).delete(
      `/pickup-locations/${locationId}`,
    );
    return data?.data || data;
  }

  async setDefaultPickupLocation(
    creds: BostaCredentials,
    locationId: string,
  ): Promise<any> {
    const { data } = await this.createClient(creds).put(
      `/pickup-locations/${locationId}/default`,
      {},
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // 💰 PRICING
  // ═══════════════════════════════════════════════════════════
  async getShipmentPricing(
    creds: BostaCredentials,
    params: {
      pickupCity: string;
      dropOffCity: string;
      cod?: number;
      size?: string;
      type?: string;
      tierIdSelector?: string;
      vatIncluded?: boolean;
    },
  ): Promise<PricingResult> {
    const pickupSectorId = this.getSectorFromCity(params.pickupCity);
    const dropoffSectorId = this.getSectorFromCity(params.dropOffCity);

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
        console.warn("⚠️ Sector pricing failed:", err.message);
      }
    }

    return this.getCityBasedPricing(creds, params);
  }

  private computePricingFromTier(sectorData: any, cod?: number): PricingResult {
    const tier = sectorData?.tier || sectorData?.data?.tier || sectorData;

    if (!tier || typeof tier !== "object") {
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

  private async getCityBasedPricing(
    creds: BostaCredentials,
    params: {
      pickupCity: string;
      dropOffCity: string;
      cod?: number;
      size?: string;
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

  async getSectorPricing(
    creds: BostaCredentials,
    params: {
      pickupSectorId: number;
      dropoffSectorId?: number;
      tierIdSelector: string;
      type?: string;
      vatIncluded?: boolean;
    },
  ): Promise<any> {
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

  async getInsuranceFeeEstimate(
    creds: BostaCredentials,
    goodsValue: number,
  ): Promise<any> {
    const { data } = await this.createClient(creds).get(
      "/pricing/insuranceFeeEstimate",
      { params: { goodsValue } },
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // 📦 DELIVERIES
  // ═══════════════════════════════════════════════════════════
  async createDelivery(
    creds: BostaCredentials,
    payload: BostaDeliveryPayload,
  ): Promise<any> {
    const { data } = await this.createClient(creds).post(
      "/deliveries?apiVersion=1",
      payload,
    );
    return data?.data || data;
  }

  async createBulkDeliveries(
    creds: BostaCredentials,
    deliveries: BostaDeliveryPayload[],
  ): Promise<any> {
    const { data } = await this.createClient(creds).post(
      "/deliveries/bulk?apiVersion=1",
      { deliveries },
    );
    return data?.data || data;
  }

  async getDelivery(creds: BostaCredentials, deliveryId: string): Promise<any> {
    const { data } = await this.createClient(creds).get(
      `/deliveries/${deliveryId}`,
    );
    return data?.data || data;
  }

  async getDeliveryByTrackingNumber(
    creds: BostaCredentials,
    trackingNumber: string,
  ): Promise<any> {
    const { data } = await this.createClient(creds).get(
      `/deliveries/business/${trackingNumber}`,
    );
    return data?.data || data;
  }

  async cancelDelivery(
    creds: BostaCredentials,
    deliveryId: string,
  ): Promise<any> {
    const { data } = await this.createClient(creds).delete(
      `/deliveries/${deliveryId}`,
    );
    return data?.data || data;
  }

  async cancelDeliveryByTracking(
    creds: BostaCredentials,
    trackingNumber: string,
  ): Promise<any> {
    const { data } = await this.createClient(creds).delete(
      `/deliveries/business/${trackingNumber}/terminate`,
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // 🚚 PICKUPS
  // ═══════════════════════════════════════════════════════════
  async createPickup(
    creds: BostaCredentials,
    payload: BostaPickupPayload,
  ): Promise<any> {
    const { data } = await this.createClient(creds).post("/pickups", payload);
    return data?.data || data;
  }

  async listPickups(
    creds: BostaCredentials,
    params?: {
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
    },
  ): Promise<any> {
    const { data } = await this.createClient(creds).get("/pickups", {
      params,
    });
    return data?.data || data;
  }
}

export default new BostaService();
