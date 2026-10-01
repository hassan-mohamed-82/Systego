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

class BostaService {
  // ═══════════════════════════════════════════════════════════
  // client جديد لكل طلب
  // ═══════════════════════════════════════════════════════════
  private createClient({ apiKey, baseUrl }: BostaCredentials): any {
    if (!apiKey) throw new Error("❌ Bosta API key is missing");

    const client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
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
  // جلب المحافظات
  // ═══════════════════════════════════════════════════════════
  async getCities(creds: BostaCredentials) {
    const { data } = await this.createClient(creds).get("/cities");
    return data?.data?.list || data?.data || [];
  }

  // ═══════════════════════════════════════════════════════════
  // جلب المناطق الفرعية
  // ═══════════════════════════════════════════════════════════
  async getDistricts(creds: BostaCredentials, cityId: string) {
    const { data } = await this.createClient(creds).get(
      `/cities/${cityId}/districts`,
    );
    return data?.data?.districts || data?.data?.list || data?.data || [];
  }

  // ═══════════════════════════════════════════════════════════
  // حساب سعر الشحن
  // ═══════════════════════════════════════════════════════════
  async getPricing(
    creds: BostaCredentials,
    params: { city: string; district?: string; cod?: number; weight?: number },
  ) {
    const { data } = await this.createClient(creds).get("/deliveries/pricing", {
      params,
    });
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // إنشاء شحنة (Send)
  // ═══════════════════════════════════════════════════════════
  async createDelivery(creds: BostaCredentials, payload: BostaDeliveryPayload) {
    const { data } = await this.createClient(creds).post(
      "/deliveries?apiVersion=1",
      payload,
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ إنشاء شحنات جماعية (Bulk)
  // بيرجع array من الـ delivery IDs
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
  // جلب شحنة بالـ deliveryId
  // ═══════════════════════════════════════════════════════════
  async getDelivery(creds: BostaCredentials, deliveryId: string) {
    const { data } = await this.createClient(creds).get(
      `/deliveries/${deliveryId}`,
    );
    return data?.data || data;
  }

  // ═══════════════════════════════════════════════════════════
  // جلب شحنة بالـ trackingNumber
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
  // إلغاء شحنة
  // ═══════════════════════════════════════════════════════════
  async cancelDelivery(creds: BostaCredentials, deliveryId: string) {
    const { data } = await this.createClient(creds).delete(
      `/deliveries/${deliveryId}`,
    );
    return data?.data || data;
  }
}

export default new BostaService();
