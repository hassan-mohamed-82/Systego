import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { EcommerceDataModel } from "../../models/schema/admin/EcommerceData";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";
import { saveBase64Image } from "../../utils/handleImages";

// Helper function to process possible base64 images
const processImageField = async (
  img: string | undefined | null,
  prefix: string,
  req: Request
): Promise<string | undefined> => {
  if (!img || typeof img !== "string") return img || undefined;
  if (
    img.startsWith("http://") ||
    img.startsWith("https://") ||
    img.startsWith("/uploads/")
  ) {
    return img;
  }
  if (img.startsWith("data:image/") || img.length > 500) {
    return await saveBase64Image(
      img,
      `${Date.now()}_${prefix}`,
      req,
      "ecommerce_data"
    );
  }
  return img;
};

// Helper function to normalize links to string array
const normalizeLinks = (links: any): string[] => {
  if (!Array.isArray(links)) return [];
  return links
    .map((l: any) => (typeof l === "string" ? l.trim() : (l?.title ? String(l.title).trim() : "")))
    .filter((l) => Boolean(l));
};

// 1. Get all ecommerce data
export const getEcommerceData = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { search, status } = req.query;

    const filter: any = {};

    if (status && (status === "active" || status === "inactive")) {
      filter.status = status;
    }

    if (search && typeof search === "string") {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { "header.title": regex },
        { "footer.bio": regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const data = await EcommerceDataModel.find(filter).sort({ createdAt: -1 });

    SuccessResponse(
      res,
      {
        message: "Ecommerce data fetched successfully",
        data,
        total: data.length,
      },
      200
    );
  }
);

// 2. Get ecommerce data by ID
export const getEcommerceDataById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new BadRequest("ID is required");
    }

    const record = await EcommerceDataModel.findById(id);
    if (!record) {
      throw new NotFound("Ecommerce data not found");
    }

    SuccessResponse(
      res,
      {
        message: "Ecommerce data fetched successfully",
        data: record,
      },
      200
    );
  }
);

// 3. Create new ecommerce data
export const createEcommerceData = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      phone,
      email,
      address,
      status,
      social_links,
      header,
      footer,
    } = req.body;

    const processedHeader = header ? { ...header } : {};
    const processedFooter = footer ? { ...footer } : {};

    if (processedHeader.logo) {
      processedHeader.logo = await processImageField(
        processedHeader.logo,
        "header_logo",
        req
      );
    }

    if (processedFooter.logo) {
      processedFooter.logo = await processImageField(
        processedFooter.logo,
        "footer_logo",
        req
      );
    }

    const newRecord = await EcommerceDataModel.create({
      name: name && name.trim() ? name.trim() : "Main Store",
      phone: phone ? phone.trim() : "",
      email: email ? email.trim() : "",
      address: address ? address.trim() : "",
      status: status === "inactive" ? "inactive" : "active",
      social_links: {
        facebook: social_links?.facebook || "",
        instagram: social_links?.instagram || "",
        whatsapp: social_links?.whatsapp || "",
        twitter: social_links?.twitter || "",
        tiktok: social_links?.tiktok || "",
        youtube: social_links?.youtube || "",
        linkedin: social_links?.linkedin || "",
      },
      header: {
        logo: processedHeader.logo || "",
        title: processedHeader.title || "",
        announcement: processedHeader.announcement || "",
        links: normalizeLinks(processedHeader.links),
      },
      footer: {
        logo: processedFooter.logo || "",
        bio: processedFooter.bio || "",
        copyright: processedFooter.copyright || "",
      },
    });

    SuccessResponse(
      res,
      {
        message: "Ecommerce data created successfully",
        data: newRecord,
      },
      201
    );
  }
);

// 4. Update ecommerce data
export const updateEcommerceData = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new BadRequest("ID is required");
    }

    const record = await EcommerceDataModel.findById(id);
    if (!record) {
      throw new NotFound("Ecommerce data not found");
    }

    const {
      name,
      phone,
      email,
      address,
      status,
      social_links,
      header,
      footer,
    } = req.body;

    if (name !== undefined) record.name = name.trim();
    if (phone !== undefined) record.phone = phone.trim();
    if (email !== undefined) record.email = email.trim();
    if (address !== undefined) record.address = address.trim();
    if (status !== undefined) record.status = status;

    if (social_links !== undefined) {
      record.social_links = {
        facebook: social_links?.facebook ?? record.social_links?.facebook ?? "",
        instagram: social_links?.instagram ?? record.social_links?.instagram ?? "",
        whatsapp: social_links?.whatsapp ?? record.social_links?.whatsapp ?? "",
        twitter: social_links?.twitter ?? record.social_links?.twitter ?? "",
        tiktok: social_links?.tiktok ?? record.social_links?.tiktok ?? "",
        youtube: social_links?.youtube ?? record.social_links?.youtube ?? "",
        linkedin: social_links?.linkedin ?? record.social_links?.linkedin ?? "",
      };
    }

    // Header update
    if (header) {
      let headerLogo = header.logo !== undefined ? header.logo : record.header?.logo;
      if (headerLogo && headerLogo !== record.header?.logo) {
        headerLogo = await processImageField(
          headerLogo,
          "header_logo",
          req
        );
      }

      let headerLinks = record.header?.links || [];
      if (header.links !== undefined) {
        headerLinks = normalizeLinks(header.links);
      }

      record.header = {
        logo: headerLogo || "",
        title: header.title !== undefined ? header.title : (record.header?.title || ""),
        announcement: header.announcement !== undefined ? header.announcement : (record.header?.announcement || ""),
        links: headerLinks,
      };
    }

    // Footer update
    if (footer) {
      let footerLogo = footer.logo !== undefined ? footer.logo : record.footer?.logo;
      if (footerLogo && footerLogo !== record.footer?.logo) {
        footerLogo = await processImageField(
          footerLogo,
          "footer_logo",
          req
        );
      }
      record.footer = {
        logo: footerLogo || "",
        bio: footer.bio !== undefined ? footer.bio : (record.footer?.bio || ""),
        copyright: footer.copyright !== undefined ? footer.copyright : (record.footer?.copyright || ""),
      };
    }

    await record.save();

    SuccessResponse(
      res,
      {
        message: "Ecommerce data updated successfully",
        data: record,
      },
      200
    );
  }
);

// 5. Delete ecommerce data
export const deleteEcommerceData = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new BadRequest("ID is required");
    }

    const record = await EcommerceDataModel.findByIdAndDelete(id);
    if (!record) {
      throw new NotFound("Ecommerce data not found");
    }

    SuccessResponse(
      res,
      {
        message: "Ecommerce data deleted successfully",
      },
      200
    );
  }
);
