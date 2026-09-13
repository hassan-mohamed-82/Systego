import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { BadRequest } from "../../Errors/BadRequest";
import { SuccessResponse } from "../../utils/response";
import { appSettingModel } from "../../models/schema/admin/storeSettings";
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

    SuccessResponse(
      res,
      {
        message: "Store settings fetched successfully",
        settings,
        logoUrl: settings.logoUrl || null,
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
