import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { EcommerceUserModel } from "../../models/schema/admin/EcommerceUser";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";
import { saveBase64Image } from "../../utils/handleImages";

// 1. Get all ecommerce users
export const getEcommerceUsers = asyncHandler(
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
        { email: regex },
        { phone: regex },
        { role: regex },
      ];
    }

    const users = await EcommerceUserModel.find(filter).sort({ createdAt: -1 });

    SuccessResponse(
      res,
      {
        message: "Ecommerce users fetched successfully",
        users,
        total: users.length,
      },
      200
    );
  }
);

// 2. Get ecommerce user by ID
export const getEcommerceUserById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new BadRequest("User ID is required");
    }

    const user = await EcommerceUserModel.findById(id);
    if (!user) {
      throw new NotFound("Ecommerce user not found");
    }

    SuccessResponse(
      res,
      {
        message: "Ecommerce user fetched successfully",
        user,
      },
      200
    );
  }
);

// 3. Create new ecommerce user
export const createEcommerceUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      email,
      phone,
      role,
      bio,
      address,
      image,
      social_links,
      status,
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new BadRequest("User name is required");
    }

    let imageUrl: string | null = null;
    if (image && typeof image === "string") {
      if (
        image.startsWith("http://") ||
        image.startsWith("https://") ||
        image.startsWith("/uploads/")
      ) {
        imageUrl = image;
      } else {
        imageUrl = await saveBase64Image(
          image,
          `${Date.now()}_ecom_user`,
          req,
          "ecommerce_users"
        );
      }
    }

    const newUser = await EcommerceUserModel.create({
      name: name.trim(),
      email: email ? email.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      role: role ? role.trim() : "Store Manager",
      bio: bio ? bio.trim() : "",
      address: address ? address.trim() : "",
      image: imageUrl,
      social_links: social_links || {},
      status: status === "inactive" ? "inactive" : "active",
    });

    SuccessResponse(
      res,
      {
        message: "Ecommerce user created successfully",
        user: newUser,
      },
      201
    );
  }
);

// 4. Update ecommerce user
export const updateEcommerceUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      role,
      bio,
      address,
      image,
      social_links,
      status,
    } = req.body;

    if (!id) {
      throw new BadRequest("User ID is required");
    }

    const user = await EcommerceUserModel.findById(id);
    if (!user) {
      throw new NotFound("Ecommerce user not found");
    }

    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (role !== undefined) user.role = role.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (address !== undefined) user.address = address.trim();
    if (status !== undefined) user.status = status;
    if (social_links !== undefined) user.social_links = social_links;

    if (image !== undefined) {
      if (!image) {
        user.image = undefined as any;
      } else if (
        typeof image === "string" &&
        (image.startsWith("http://") ||
          image.startsWith("https://") ||
          image.startsWith("/uploads/"))
      ) {
        user.image = image;
      } else {
        user.image = await saveBase64Image(
          image,
          `${Date.now()}_ecom_user`,
          req,
          "ecommerce_users"
        );
      }
    }

    await user.save();

    SuccessResponse(
      res,
      {
        message: "Ecommerce user updated successfully",
        user,
      },
      200
    );
  }
);

// 5. Delete ecommerce user
export const deleteEcommerceUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new BadRequest("User ID is required");
    }

    const user = await EcommerceUserModel.findByIdAndDelete(id);
    if (!user) {
      throw new NotFound("Ecommerce user not found");
    }

    SuccessResponse(
      res,
      {
        message: "Ecommerce user deleted successfully",
      },
      200
    );
  }
);
