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
