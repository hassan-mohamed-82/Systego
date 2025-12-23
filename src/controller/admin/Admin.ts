import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../../models/schema/admin/User";
import { BadRequest } from "../../Errors/BadRequest";
import { SuccessResponse } from "../../utils/response";
import { saveBase64Image } from "../../utils/handleImages";
import { NotFound } from "../../Errors";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import mongoose from "mongoose";

// =========================
// Create User
// =========================
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    username,
    email,
    password,
    company_name,
    phone,
    image_base64,
    warehouse_id,
    role = "admin",
  } = req.body;

  if (!username || !email || !password || !warehouse_id) {
    throw new BadRequest(
      "username, email, password and warehouse_id are required"
    );
  }

  if (!mongoose.Types.ObjectId.isValid(warehouse_id)) {
    throw new BadRequest("Invalid warehouse_id");
  }

  const warehouseExists = await WarehouseModel.findById(warehouse_id);
  if (!warehouseExists) {
    throw new BadRequest("Invalid warehouse_id: Warehouse does not exist");
  }

  const existingUser = await UserModel.findOne({
    $or: [{ email }, { username }],
  });
  if (existingUser) {
    throw new BadRequest("User with this email or username already exists");
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  let image_url: string | undefined;
  if (image_base64) {
    image_url = await saveBase64Image(image_base64, username, req, "users");
  }

  const userDoc = await UserModel.create({
    username,
    email,
    password_hash,
    company_name,
    phone,
    image_url,
    warehouse_id,
    role,
  });

  SuccessResponse(res, {
    message: "User created successfully",
    user: {
      id: userDoc._id,
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role,
      status: userDoc.status,
      company_name: userDoc.company_name,
      phone: userDoc.phone,
      image_url: userDoc.image_url,
      warehouse_id: userDoc.warehouse_id,
    },
  });
};

// =========================
// Get All Users
// =========================
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const users = await UserModel.find()
    .select("-password_hash -__v")
    .populate("warehouse_id", "name");

  if (!users || users.length === 0) {
    throw new NotFound("No users found");
  }

  SuccessResponse(res, {
    message: "Get all users successfully",
    users,
  });
};

// =========================
// Get User By Id
// =========================
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid or missing user ID");
  }

  const user = await UserModel.findById(id)
    .select("-password_hash -__v")
    .populate("warehouse_id", "name");

  if (!user) throw new NotFound("User not found");

  SuccessResponse(res, {
    message: "User retrieved successfully",
    user,
  });
};

// =========================
// Update User
// =========================
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const {
    username,
    email,
    password,
    company_name,
    phone,
    status,
    image_base64,
    warehouse_id,
    role,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid user id");
  }

  const user = await UserModel.findById(id);
  if (!user) {
    throw new NotFound("User not found");
  }

  if (username !== undefined) user.username = username;
  if (email !== undefined) user.email = email;
  if (company_name !== undefined) user.company_name = company_name;
  if (phone !== undefined) user.phone = phone;
  if (status !== undefined) user.status = status;

  // Handle warehouse_id update
  if (warehouse_id !== undefined) {
    if (warehouse_id && warehouse_id !== "") {
      if (!mongoose.Types.ObjectId.isValid(warehouse_id)) {
        throw new BadRequest("Invalid warehouse_id");
      }
      const warehouseExists = await WarehouseModel.findById(warehouse_id);
      if (!warehouseExists) {
        throw new BadRequest(
          "Invalid warehouse_id: Warehouse does not exist"
        );
      }
      (user as any).warehouse_id = warehouse_id;
    } else {
      (user as any).warehouse_id = undefined;
    }
  }

  if (role && ["superadmin", "admin"].includes(role)) {
    user.role = role;
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(password, salt);
  }

  if (image_base64) {
    user.image_url = await saveBase64Image(
      image_base64,
      user.username,
      req,
      "users"
    );
  }

  await user.save();

  SuccessResponse(res, {
    message: "User updated successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      company_name: user.company_name,
      phone: user.phone,
      image_url: user.image_url,
      warehouse_id: (user as any).warehouse_id,
    },
  });
};

// =========================
// Delete User
// =========================
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("User id is required or invalid");
  }

  const user = await UserModel.findByIdAndDelete(id);
  if (!user) {
    throw new NotFound("User not found");
  }

  SuccessResponse(res, {
    message: "User deleted successfully",
  });
};

// =========================
// Selection (warehouses list)
// =========================
export const selection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const warehouse = await WarehouseModel.find().select("_id name");

  SuccessResponse(res, {
    message: "Get warehouses successfully",
    warehouse,
  });
};
