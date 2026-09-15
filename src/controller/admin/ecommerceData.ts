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
      header,
      footer,
      email,
      phone,
      role,
      bio,
      address,
      image,
      social_links,
      status,
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

    let processedImage: string | null = null;
    if (image) {
      processedImage = (await processImageField(image, "ecom_img", req)) || null;
    }

    // Sync legacy/footer fields if provided
    if (!processedFooter.phone && phone) processedFooter.phone = phone;
    if (!processedFooter.email && email) processedFooter.email = email;
    if (!processedFooter.address && address) processedFooter.address = address;
    if (!processedFooter.bio && bio) processedFooter.bio = bio;
    if (!processedFooter.social_links && social_links) {
      processedFooter.social_links = social_links;
    }

    const newRecord = await EcommerceDataModel.create({
      name: name && name.trim() ? name.trim() : "Ecommerce Store",
      header: processedHeader,
      footer: processedFooter,
      email: email ? email.trim() : processedFooter.email,
      phone: phone ? phone.trim() : processedFooter.phone,
      role: role ? role.trim() : "Store Manager",
      bio: bio ? bio.trim() : processedFooter.bio || "",
      address: address ? address.trim() : processedFooter.address || "",
      image: processedImage,
      social_links: social_links || processedFooter.social_links || {},
      status: status === "inactive" ? "inactive" : "active",
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
      header,
      footer,
      email,
      phone,
      role,
      bio,
      address,
      image,
      social_links,
      status,
    } = req.body;

    if (name !== undefined) record.name = name.trim();
    if (status !== undefined) record.status = status;

    // Header update
    if (header) {
      const updatedHeader = { ...(record.header ? (record.header as any).toObject?.() || record.header : {}), ...header };
      if (header.logo) {
        updatedHeader.logo = await processImageField(
          header.logo,
          "header_logo",
          req
        );
      }
      record.header = updatedHeader;
    }

    // Footer update
    if (footer) {
      const updatedFooter = { ...(record.footer ? (record.footer as any).toObject?.() || record.footer : {}), ...footer };
      if (footer.logo) {
        updatedFooter.logo = await processImageField(
          footer.logo,
          "footer_logo",
          req
        );
      }
      record.footer = updatedFooter;
    }

    // Legacy fields update
    if (email !== undefined) record.email = email.trim();
    if (phone !== undefined) record.phone = phone.trim();
    if (role !== undefined) record.role = role.trim();
    if (bio !== undefined) record.bio = bio.trim();
    if (address !== undefined) record.address = address.trim();

    if (image) {
      record.image = (await processImageField(image, "ecom_img", req)) || record.image;
    }

    if (social_links !== undefined) {
      record.social_links = {
        ...record.social_links,
        ...social_links,
      };
      if (record.footer) {
        record.footer.social_links = {
          ...record.footer.social_links,
          ...social_links,
        };
      }
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
