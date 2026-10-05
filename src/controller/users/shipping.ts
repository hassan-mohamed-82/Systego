// src/controller/users/Shipping.ts
import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { UserModel } from "../../models/schema/admin/User";
import { getBostaCreds } from "../../utils/shipping/getBostaCreds";
import bostaService from "../../services/bosta.service";

// ═══════════════════════════════════════════════════════════
// Helper: Get superadmin's shipping settings
// ═══════════════════════════════════════════════════════════
const getSuperadminSettings = async () => {
  const superadminUser = await UserModel.findOne({ role: "superadmin" })
    .select("_id")
    .lean();

  if (!superadminUser) return null;

  const settings = await ShippingSettingsModel.findOne({
    superadminId: (superadminUser as any)._id,
  }).lean();

  return settings;
};

// ═══════════════════════════════════════════════════════════
// 💵 Helper: احسب الـ markup
// ═══════════════════════════════════════════════════════════
const calculateMarkup = (
  bostaCost: number,
  markupValue: number,
  markupType: "fixed" | "percentage",
): number => {
  if (!markupValue || markupValue <= 0) return 0;

  if (markupType === "percentage") {
    return Math.round(bostaCost * (markupValue / 100) * 100) / 100;
  }

  return Number(markupValue);
};

// ═══════════════════════════════════════════════════════════
// 🛒 GET ACTIVE SHIPPING METHOD (E-commerce)
// ═══════════════════════════════════════════════════════════
export const getActiveShippingMethod = async (_req: Request, res: Response) => {
  const settings = await getSuperadminSettings();

  const activeMethod = settings?.activeMethod || "self";

  const response: any = {
    activeMethod,
    selfEnabled: activeMethod === "self",
    bostaEnabled: activeMethod === "bosta",
  };

  if (activeMethod === "bosta") {
    response.bosta = {
      enabled: settings?.bosta?.enabled === true,
      citiesEndpoint: "/api/store/shipping/bosta/cities",
      districtsEndpoint: "/api/store/shipping/bosta/districts/:cityId",
      pricingEndpoint: "/api/store/shipping/bosta/pricing",
    };
  }

  SuccessResponse(res, {
    message: "Active shipping method fetched successfully",
    data: response,
  });
};

// ═══════════════════════════════════════════════════════════
// 🛒 GET BOSTA CITIES (E-commerce)
// ═══════════════════════════════════════════════════════════
export const getBostaCitiesForUser = async (_req: Request, res: Response) => {
  const settings = await getSuperadminSettings();

  if (!settings?.bosta?.enabled) {
    throw new BadRequest("Bosta is not enabled");
  }

  const creds = getBostaCreds(settings as any);
  const cities = await bostaService.getCities(creds);

  const simplifiedCities = cities.map((c: any) => ({
    _id: c._id,
    name: c.name,
    nameAr: c.nameAr || c.name,
  }));

  SuccessResponse(res, {
    message: "Bosta cities fetched successfully",
    count: simplifiedCities.length,
    cities: simplifiedCities,
  });
};

// ═══════════════════════════════════════════════════════════
// 🛒 GET BOSTA DISTRICTS (E-commerce)
// ═══════════════════════════════════════════════════════════
export const getBostaDistrictsForUser = async (req: Request, res: Response) => {
  const settings = await getSuperadminSettings();

  if (!settings?.bosta?.enabled) {
    throw new BadRequest("Bosta is not enabled");
  }

  const { cityId } = req.params;
  if (!cityId) throw new BadRequest("cityId is required");

  const creds = getBostaCreds(settings as any);
  const districts = await bostaService.getDistricts(creds, cityId);

  const simplifiedDistricts = districts.map((d: any) => ({
    districtId: d.districtId,
    districtName: d.districtName,
    districtOtherName: d.districtOtherName,
    zoneId: d.zoneId,
    zoneName: d.zoneName,
    zoneOtherName: d.zoneOtherName,
  }));

  SuccessResponse(res, {
    message: "Bosta districts fetched successfully",
    count: simplifiedDistricts.length,
    districts: simplifiedDistricts,
  });
};

// ═══════════════════════════════════════════════════════════
// 🆕 GET BOSTA PRICING (E-commerce — للعميل)
// العميل يدفع: bostaCost + markup
// ═══════════════════════════════════════════════════════════
export const getBostaPricingForUser = async (req: Request, res: Response) => {
  const settings = await getSuperadminSettings();
  if (!settings?.bosta?.enabled) throw new BadRequest("Bosta is not enabled");

  const { dropOffCity, size, type } = req.query as any;
  // ❌ شيلت cod من هنا

  if (!dropOffCity) throw new BadRequest("dropOffCity is required");

  const pickupCity = settings.bosta?.pickup?.city;
  if (!pickupCity) throw new BadRequest("Pickup not configured");

  const creds = getBostaCreds(settings as any);

  try {
    const pricing = await bostaService.getShipmentPricing(creds, {
      pickupCity,
      dropOffCity,
      size: size || settings.bosta?.defaults?.size || "Normal",
      type: type || "SEND",
      // ❌ مفيش cod
    });

    const bostaCost = Number(pricing?.total || 0);

    // 💵 Admin Markup
    const markupValue = Number(settings.bosta?.shippingMarkup || 0);
    const markupType = settings.bosta?.shippingMarkupType || "fixed";
    const markup =
      markupValue > 0
        ? markupType === "percentage"
          ? bostaCost * (markupValue / 100)
          : markupValue
        : 0;

    const shippingToCustomer = Math.round((bostaCost + markup) * 100) / 100;

    SuccessResponse(res, {
      message: "Bosta pricing calculated successfully",
      pickupCity,
      dropOffCity,
      pricing: {
        total: shippingToCustomer, // ← العميل يدفع ده
        bostaCost, // ← Bosta cost
        markup, // ← ربحك
        currency: pricing.currency,
        source: pricing.source,
      },
    });
  } catch (err: any) {
    throw new BadRequest(`Failed to calculate pricing: ${err.message}`);
  }
};
