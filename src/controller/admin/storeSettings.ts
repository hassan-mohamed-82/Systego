import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { BadRequest } from "../../Errors/BadRequest";
import { SuccessResponse } from "../../utils/response";
import { appSettingModel } from "../../models/schema/admin/storeSettings";
import { EcommerceDataModel } from "../../models/schema/admin/EcommerceData";
import { saveBase64Image } from "../../utils/handleImages";
import { fetchCategories, fetchTemplates, fetchTemplateBySlug, fetchTemplateSectionsBySlug } from "../../utils/superAdmin.client";

export const browseThemesCategories = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const categories = await fetchCategories();
    SuccessResponse(
      res,
      {
        message: "Themes categories fetched successfully",
        categories,
      },
      200
    );
  }
);

export const browseThemesBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;
    const template = await fetchTemplateBySlug(slug);
    SuccessResponse(
      res,
      {
        message: "Theme fetched successfully",
        template,
      },
      200
    );
  }
);

export const getCategoryThemes = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { categoryId } = req.params;
    const themes = await fetchTemplates(categoryId);
    SuccessResponse(
      res,
      {
        message: "Themes fetched successfully",
        themes,
      },
      200
    );
  }
);

// Get store settings
export const getStoreSettings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    let settings = await appSettingModel.findOne();

    if (!settings) {
      settings = await appSettingModel.create({
        templateSlug: "default",
        storeName: "Store",
        logoUrl: null,
      });
    }

    const ecommerceData = await EcommerceDataModel.find({ status: "active" }).sort({ createdAt: -1 });

    const settingsData = settings.toObject
      ? settings.toObject({ flattenMaps: true })
      : { ...settings };

    // ضمان تحويل كائن الـ colors من Mongoose Map إلى كائن JavaScript قياسي
    if (settings.colors instanceof Map) {
      settingsData.colors = Object.fromEntries(settings.colors);
    } else if (settingsData.colors && typeof (settingsData.colors as any).toJSON === "function") {
      settingsData.colors = (settingsData.colors as any).toJSON();
    } else if (settingsData.colors && typeof settingsData.colors === "object") {
      settingsData.colors = { ...settingsData.colors };
    }

    // في حال كانت الألوان فارغة، جلب الألوان الافتراضية للقالب أو الألوان القياسية
    if (!settingsData.colors || Object.keys(settingsData.colors).length === 0) {
      if (settings.templateSlug) {
        try {
          const template = await fetchTemplateBySlug(settings.templateSlug);
          const tplColors = template?.defaultConfig?.colors;
          if (tplColors) {
            settingsData.colors = tplColors instanceof Map ? Object.fromEntries(tplColors) : tplColors;
          }
        } catch (err) {
          console.error("Failed to fetch template colors:", err);
        }
      }

      if (!settingsData.colors || Object.keys(settingsData.colors).length === 0) {
        settingsData.colors = {
          primary: "#405463",
          secondary: "#8cb7c9",
          background: "#ffffff",
          textPrimary: "#111827",
          textSecondary: "#6b7280",
        };
      }
    }

    (settingsData as any).ecommerceData = ecommerceData;

    SuccessResponse(
      res,
      {
        message: "Store settings fetched successfully",
        settings: settingsData,
      },
      200
    );
  }
);

// Update store settings
export const updateStoreSettings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      storeName,
      logo,
      logoUrl: incomingLogoUrl,
      templateSlug,
      templateSectionsSnapshot: incomingSnapshot,
      fontStyle,
      colors,
      sections,
    } = req.body;

    // Support both `logoUrl` (sent from frontend) and `logo`
    const logoData = incomingLogoUrl !== undefined ? incomingLogoUrl : logo;

    let templateSectionsSnapshot = incomingSnapshot;
    if (!templateSectionsSnapshot && templateSlug) {
      try {
        const templateSnapshot = await fetchTemplateSectionsBySlug(templateSlug);
        templateSectionsSnapshot = Array.isArray(templateSnapshot)
          ? templateSnapshot
          : (templateSnapshot?.sections || []);
      } catch (err) {
        console.error("Failed to fetch template sections:", err);
      }
    }

    let settings = await appSettingModel.findOne();

    if (!settings) {
      let finalLogoUrl: string | null = null;

      if (logoData) {
        if (
          typeof logoData === "string" &&
          (logoData.startsWith("http://") ||
            logoData.startsWith("https://") ||
            logoData.startsWith("/uploads/"))
        ) {
          finalLogoUrl = logoData;
        } else {
          finalLogoUrl = await saveBase64Image(
            logoData,
            `${Date.now()}_store_logo`,
            req,
            "store"
          );
        }
      }

      settings = await appSettingModel.create({
        templateSlug,
        storeName: storeName ? storeName.trim() : "Store",
        logoUrl: finalLogoUrl,
        templateSectionsSnapshot: templateSectionsSnapshot || [],
        fontStyle: fontStyle || "default",
        colors: colors || {},
        sections: sections || [],
      });
    } else {
      if (storeName) {
        settings.storeName = storeName.trim();
      }

      if (logoData !== undefined) {
        if (!logoData) {
          // If empty string or null, clear logo
          settings.logoUrl = null as any;
        } else if (
          typeof logoData === "string" &&
          (logoData.startsWith("http://") ||
            logoData.startsWith("https://") ||
            logoData.startsWith("/uploads/"))
        ) {
          // Existing URL, preserve as is
          settings.logoUrl = logoData;
        } else {
          // New base64 image, save and get URL
          const newLogoUrl = await saveBase64Image(
            logoData,
            `${Date.now()}_store_logo`,
            req,
            "store"
          );
          settings.logoUrl = newLogoUrl;
        }
      }

      if (templateSlug) settings.templateSlug = templateSlug;
      if (templateSectionsSnapshot) settings.templateSectionsSnapshot = templateSectionsSnapshot;
      if (fontStyle) settings.fontStyle = fontStyle;
      if (colors) settings.colors = colors;
      if (sections) settings.sections = sections;

      await settings.save();
    }

    SuccessResponse(
      res,
      {
        message: "Store settings updated successfully",
        settings,
        logoUrl: settings.logoUrl || null,
      },
      200
    );
  }
);
