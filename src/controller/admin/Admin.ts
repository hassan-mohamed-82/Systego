// src/controller/admin/userController.ts

import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { UserModel } from "../../models/schema/admin/User";
import { RoleModel } from "../../models/schema/admin/roles";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { BadRequest, NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { saveBase64Image } from "../../utils/handleImages";
import { MODULES, ACTION_NAMES } from "../../types/constant";

// =========================
// Create User
// =========================
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const {
    username,
    email,
    password,
    company_name,
    phone,
    image_base64,
    warehouse_id,
    role_id,
    role = "admin",  // superadmin أو admin
    status = "active",
  } = req.body;

  // Validation
  if (!username || !email || !password) {
    throw new BadRequest("username, email, and password are required");
  }

  // لو admin عادي، لازم يكون فيه role_id
  if (role === "admin" && !role_id) {
    throw new BadRequest("role_id is required for admin users");
  }

  // لو superadmin، مش محتاج role_id
  if (role === "superadmin" && role_id) {
    throw new BadRequest("superadmin doesn't need role_id");
  }

  // تحقق من الـ Role لو admin
  if (role === "admin" && role_id) {
    if (!mongoose.Types.ObjectId.isValid(role_id)) {
      throw new BadRequest("Invalid role_id");
    }

    const roleExists = await RoleModel.findById(role_id);
    if (!roleExists) {
      throw new BadRequest("Role does not exist");
    }

    if (roleExists.status !== "active") {
      throw new BadRequest("Selected role is not active");
    }
  }

  // تحقق من الـ Warehouse
  if (warehouse_id) {
    if (!mongoose.Types.ObjectId.isValid(warehouse_id)) {
      throw new BadRequest("Invalid warehouse_id");
    }
    const warehouseExists = await WarehouseModel.findById(warehouse_id);
    if (!warehouseExists) {
      throw new BadRequest("Warehouse does not exist");
    }
  }

  // تحقق من وجود اليوزر
  const existingUser = await UserModel.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new BadRequest("User with this email or username already exists");
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, 10);

  // Handle image
  let image_url: string | undefined;
  if (image_base64) {
    image_url = await saveBase64Image(image_base64, username, req, "users");
  }

  // Create user
  const user = await UserModel.create({
    username,
    email,
    password_hash,
    company_name,
    phone,
    image_url,
    warehouse_id: warehouse_id || undefined,
    role_id: role === "admin" ? role_id : undefined,
    role,
    status,
  });

  await user.populate("role_id", "name");
  await user.populate("warehouse_id", "name");

  SuccessResponse(res, {
    message: "User created successfully",
    user: formatUserResponse(user),
  });
};

// =========================
// Get All Users
// =========================
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  const { selection } = req.query;

  // للـ Dropdown
  if (selection === "true") {
    const [warehouses, roles] = await Promise.all([
      WarehouseModel.find().select("_id name"),
      RoleModel.find({ status: "active" }).select("_id name"),
    ]);

    return SuccessResponse(res, {
      message: "Selection data fetched successfully",
      warehouses: warehouses.map((w) => ({ id: w._id, name: w.name })),
      roles: roles.map((r) => ({ id: r._id, name: r.name })),
      userTypes: [
        { value: "superadmin", label: "Super Admin" },
        { value: "admin", label: "Admin" },
      ],
    });
  }

  const users = await UserModel.find()
    .select("-password_hash -__v")
    .populate("warehouse_id", "name")
    .populate("role_id", "name status")
    .sort({ createdAt: -1 });

  SuccessResponse(res, {
    message: "Users fetched successfully",
    count: users.length,
    users: users.map((user) => formatUserResponse(user)),
  });
};

// =========================
// Get User By ID
// =========================
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid user ID");
  }

  const user = await UserModel.findById(id)
    .select("-password_hash -__v")
    .populate("warehouse_id", "name")
    .populate("role_id", "name status permissions");

  if (!user) {
    throw new NotFound("User not found");
  }

  SuccessResponse(res, {
    message: "User retrieved successfully",
    user: formatUserResponseDetailed(user),
  });
};

// =========================
// Get User Permissions
// =========================
export const getUserPermissions = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid user ID");
  }

  const user = await UserModel.findById(id)
    .select("username email role role_id")
    .populate("role_id", "name permissions");

  if (!user) {
    throw new NotFound("User not found");
  }

  // لو superadmin، له كل الصلاحيات
  if (user.role === "superadmin") {
    const allPermissions = MODULES.map((mod) => ({
      module: mod,
      actions: ACTION_NAMES.map((action) => ({
        action,
        granted: true,
      })),
    }));

    return SuccessResponse(res, {
      message: "User has superadmin access (all permissions)",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      isSuperAdmin: true,
      permissions: allPermissions,
    });
  }

  // لو admin عادي، جيب الصلاحيات من الـ Role
  const rolePermissions = (user.role_id as any)?.permissions || [];

  const permissions = rolePermissions.map((perm: any) => ({
    module: perm.module,
    actions: perm.actions.map((act: any) => ({
      id: act._id?.toString(),
      action: act.action,
    })),
  }));

  SuccessResponse(res, {
    message: "User permissions fetched successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      role_id: user.role_id ? {
        id: (user.role_id as any)._id,
        name: (user.role_id as any).name,
      } : null,
    },
    isSuperAdmin: false,
    permissions,
  });
};

// =========================
// Update User
// =========================
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
    warehouse_id,
    role_id,
    role,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid user ID");
  }

  const user = await UserModel.findById(id);
  if (!user) {
    throw new NotFound("User not found");
  }

  // Check unique username
  if (username && username !== user.username) {
    const exists = await UserModel.findOne({ username, _id: { $ne: id } });
    if (exists) throw new BadRequest("Username already exists");
    user.username = username;
  }

  // Check unique email
  if (email && email !== user.email) {
    const exists = await UserModel.findOne({ email, _id: { $ne: id } });
    if (exists) throw new BadRequest("Email already exists");
    user.email = email;
  }

  // Update fields
  if (company_name !== undefined) user.company_name = company_name;
  if (phone !== undefined) user.phone = phone;
  if (status !== undefined) user.status = status;

  // Update role type
  if (role !== undefined) {
    if (!["superadmin", "admin"].includes(role)) {
      throw new BadRequest("Invalid role type");
    }
    user.role = role;

    // لو superadmin، شيل الـ role_id
    if (role === "superadmin") {
      user.role_id = undefined;
    }
  }

  // Handle role_id (لو admin)
  if (role_id !== undefined && (user.role === "admin" || role === "admin")) {
    if (!role_id) {
      throw new BadRequest("role_id is required for admin users");
    }

    if (!mongoose.Types.ObjectId.isValid(role_id)) {
      throw new BadRequest("Invalid role_id");
    }

    const roleExists = await RoleModel.findById(role_id);
    if (!roleExists) {
      throw new BadRequest("Role does not exist");
    }

    if (roleExists.status !== "active") {
      throw new BadRequest("Selected role is not active");
    }

    user.role_id = role_id;
  }

  // Handle warehouse_id
  if (warehouse_id !== undefined) {
    if (!warehouse_id) {
      user.warehouse_id = undefined;
    } else {
      if (!mongoose.Types.ObjectId.isValid(warehouse_id)) {
        throw new BadRequest("Invalid warehouse_id");
      }

      const warehouseExists = await WarehouseModel.findById(warehouse_id);
      if (!warehouseExists) {
        throw new BadRequest("Warehouse does not exist");
      }

      user.warehouse_id = warehouse_id;
    }
  }

  // Handle password
  if (password) {
    user.password_hash = await bcrypt.hash(password, 10);
  }

  // Handle image
  if (image_base64) {
    user.image_url = await saveBase64Image(image_base64, user.username, req, "users");
  }

  await user.save();
  await user.populate("role_id", "name");
  await user.populate("warehouse_id", "name");

  SuccessResponse(res, {
    message: "User updated successfully",
    user: formatUserResponse(user),
  });
};

// =========================
// Delete User
// =========================
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid user ID");
  }

  const user = await UserModel.findByIdAndDelete(id);
  if (!user) {
    throw new NotFound("User not found");
  }

  SuccessResponse(res, { message: "User deleted successfully" });
};

// =========================
// Helper Functions
// =========================
function formatUserResponse(user: any) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    role_id: user.role_id
      ? { id: user.role_id._id || user.role_id, name: user.role_id.name || null }
      : null,
    status: user.status,
    company_name: user.company_name,
    phone: user.phone,
    image_url: user.image_url,
    warehouse: user.warehouse_id
      ? { id: user.warehouse_id._id || user.warehouse_id, name: user.warehouse_id.name || null }
      : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function formatUserResponseDetailed(user: any) {
  const base = formatUserResponse(user);

  // لو superadmin
  if (user.role === "superadmin") {
    return {
      ...base,
      isSuperAdmin: true,
      hasAllPermissions: true,
    };
  }

  // لو admin عادي
  if (user.role_id && user.role_id.permissions) {
    base.role_id = {
      id: user.role_id._id,
      name: user.role_id.name,
      status: user.role_id.status,
      permissions: user.role_id.permissions.map((perm: any) => ({
        module: perm.module,
        actions: perm.actions.map((act: any) => ({
          id: act._id?.toString(),
          action: act.action,
        })),
      })),
    } as any;
  }

  return {
    ...base,
    isSuperAdmin: false,
  };
}

// =========================
// Get Selection Data (Warehouses + Roles)
// =========================
export const getSelectionData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const [warehouses, roles] = await Promise.all([
    WarehouseModel.find().select("_id name"),
    RoleModel.find({ status: "active" }).select("_id name"),
  ]);

  SuccessResponse(res, {
    message: "Selection data fetched successfully",
    warehouses: warehouses.map((w) => ({ id: w._id, name: w.name })),
    roles: roles.map((r) => ({ id: r._id, name: r.name })),
  });
};