import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../../models/schema/admin/User";
import { BadRequest } from "../../Errors/BadRequest";
import { UnauthorizedError } from "../../Errors/unauthorizedError";
import { SuccessResponse } from "../../utils/response";
import { saveBase64Image } from "../../utils/handleImages";
import { NotFound } from "../../Errors";
import { PositionModel } from "../../models/schema/admin/position";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { RoleModel } from "../../models/schema/admin/roles";
import { ActionModel } from "../../models/schema/admin/Action";
import mongoose from "mongoose";


export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const {
    username,
    email,
    password,
    company_name,
    phone,
    image_base64,
    warehouseId,
    role = "admin",
  } = req.body;

  if (!username || !email || !password || !warehouseId) {
    throw new BadRequest("Username, email, password and warehouseId are required");
  }

  if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
    throw new BadRequest("Invalid warehouseId");
  }
  const warehouseExists = await WarehouseModel.findById(warehouseId);
  if (!warehouseExists) {
    throw new BadRequest("Invalid warehouseId: Warehouse does not exist");
  }

  const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
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
    warehouseId,
    role,
    // permissions: []  // تسيبها فاضية، وهتتعدل من CRUD الـ permissions
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
      warehouseId: userDoc.warehouseId,
    },
  });
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  const users = await UserModel.find()
    .select("-password_hash -__v")
    .populate("warehouseId", "name");

  if (!users || users.length === 0) {
    throw new NotFound("No users found");
  }

  SuccessResponse(res, {
    message: "Get all users successfully",
    users,
  });
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid or missing user ID");
  }

  const user = await UserModel.findById(id)
    .select("-password_hash -__v")
    .populate("warehouseId", "name");

  if (!user) throw new NotFound("User not found");

  SuccessResponse(res, {
    message: "User retrieved successfully",
    user,
  });
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const {
    username,
    email,
    password,
    company_name,
    phone,
    status,
    image_base64,
    warehouseId,
    role,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid user id");
  }

  const user = await UserModel.findById(id);
  if (!user) {
    throw new NotFound("User not found");
  }

  if (username) user.username = username;
  if (email) user.email = email;
  if (company_name) user.company_name = company_name;
  if (phone) user.phone = phone;
  if (status) user.status = status;

  if (warehouseId) {
    if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
      throw new BadRequest("Invalid warehouseId");
    }
    const warehouseExists = await WarehouseModel.findById(warehouseId);
    if (!warehouseExists) {
      throw new BadRequest("Invalid warehouseId: Warehouse does not exist");
    }
    user.warehouseId = warehouseId;
  }

  if (role && ["superadmin", "admin"].includes(role)) {
    user.role = role;
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(password, salt);
  }

  if (image_base64) {
    user.image_url = await saveBase64Image(image_base64, user.username, req, "users");
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
      warehouseId: user.warehouseId,
    },
  });
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
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

export const selection = async (req: Request, res: Response, next: NextFunction) => {
  const warehouse = await WarehouseModel.find().select("_id name");

  SuccessResponse(res, {
    message: "Get warehouses successfully",
    warehouse,
  });
};