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
import { CashierShift } from "../../models/schema/admin/POS/CashierShift";
import { ProductSalesModel, SaleModel } from "../../models/schema/admin/POS/Sale";
import { ExpenseModel } from "../../models/schema/admin/POS/expenses";
import { ReturnModel } from "../../models/schema/admin/POS/ReturnSale";

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
    role = "admin",
    status = "active",
    permissions = [],
  } = req.body;

  if (!username || !email || !password) {
    throw new BadRequest("username, email, and password are required");
  }

  if (role === "admin" && !role_id && !warehouse_id) {
    throw new BadRequest("role_id is required for admin users unless warehouse_id is assigned");
  }

  if (role === "superadmin" && role_id) {
    throw new BadRequest("superadmin doesn't need role_id");
  }

  if (role === "superadmin" && warehouse_id) {
    throw new BadRequest("superadmin should not be restricted to a warehouse");
  }

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

  if (warehouse_id) {
    if (!mongoose.Types.ObjectId.isValid(warehouse_id)) {
      throw new BadRequest("Invalid warehouse_id");
    }
    const warehouseExists = await WarehouseModel.findById(warehouse_id);
    if (!warehouseExists) {
      throw new BadRequest("Warehouse does not exist");
    }
  }

  const existingUser = await UserModel.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new BadRequest("User with this email or username already exists");
  }

  const password_hash = await bcrypt.hash(password, 10);

  let image_url: string | undefined;
  if (image_base64) {
    image_url = await saveBase64Image(image_base64, username, req, "users");
  }

  const user = await UserModel.create({
    username,
    email,
    password_hash,
    company_name,
    phone,
    image_url,
    warehouse_id: warehouse_id || null,
    role_id: role_id || null,
    role,
    status,
    permissions,
  });

  await user.populate("role_id", "name");
  await user.populate("warehouse_id", "name");

  SuccessResponse(res, {
    message: "User created successfully",
    user: formatUserResponse(user),
  });
};

export const formatUserResponse = (user: any) => {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    phone: user.phone || null,
    company_name: user.company_name || null,
    image_url: user.image_url || null,
    status: user.status,
    role: user.role, // "superadmin" or "admin"
    role_id: user.role_id?._id || user.role_id || null,
    role_name: user.role_id?.name || (user.role === "superadmin" ? "Super Admin" : null),
    warehouse_id: user.warehouse_id?._id || user.warehouse_id || null,
    warehouse_name: user.warehouse_id?.name || null,
    permissions: (user.permissions || []).map((p: any) => ({
      module: p.module,
      actions: (p.actions || []).map((a: any) => ({
        id: a._id?.toString() || "",
        action: a.action || "",
      })),
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
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
    .select("username email role role_id warehouse_id") // ضفنا warehouse_id عشان الـ check يشتغل صح
    .populate("role_id", "name permissions");

  if (!user) {
    throw new NotFound("User not found");
  }

  // لو superadmin، له كل الصلاحيات
  if (user.role === "superadmin" || (user.role === "admin" && user.warehouse_id && !user.role_id)) {
    const allPermissions = MODULES.map((mod) => ({
      module: mod,
      actions: ACTION_NAMES.map((action) => ({
        action,
        granted: true,
      })),
    }));

    return SuccessResponse(res, {
      message: user.role === "superadmin"
        ? "User has superadmin access (all permissions)"
        : "User has warehouse admin access (all permissions in assigned warehouse)",
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

export function formatUserResponseDetailed(user: any) {
  const base = formatUserResponse(user);

  // لو superadmin
  if (user.role === "superadmin") {
    return {
      ...base,
      isSuperAdmin: true,
      hasAllPermissions: true,
    };
  }

  // تجهيز الرول بشكل آمن
  let formattedRole = null;

  if (user.role_id && typeof user.role_id === 'object') {
    formattedRole = {
      id: user.role_id._id?.toString(),
      name: user.role_id.name,
      status: user.role_id.status,
      permissions: user.role_id.permissions 
        ? user.role_id.permissions.map((perm: any) => ({
            module: perm.module,
            actions: perm.actions 
              ? perm.actions.map((act: any) => ({
                  id: act._id?.toString(),
                  action: act.action,
                }))
              : [],
          }))
        : [],
    };
  } else {
    // لو الرول مش معمولها populate (عبارة عن ID فقط)
    formattedRole = user.role_id?.toString() || null;
  }

  // بنمسح الـ role_id القديم عشان نرجع الشكل الأنضف
  if (base.role_id) delete base.role_id;

  return {
    ...base,
    // سميناها role_data عشان ما تعملش Override لحقل base.role اللي جواه كلمة "admin"
    role_data: formattedRole, 
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
  try {
    const [warehouses, roles] = await Promise.all([
      WarehouseModel.find().select("_id name"),
      // شيلنا فلتر { status: "active" } عشان الرولز ترجع ونراجع الداتا، وضفنا ال status للـ select
      RoleModel.find().select("_id name status"),
    ]);

    SuccessResponse(res, {
      message: "Selection data fetched successfully",
      warehouses: warehouses.map((w) => ({ id: w._id, name: w.name })),
      roles: roles.map((r) => ({ 
        id: r._id, 
        name: r.name,
        status: r.status // ضفناها هنا مؤقتاً عشان تتأكد من قيمتها في الداتابيز
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getCashiermanShiftsReport = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };

    if (!mongoose.isValidObjectId(id)) {
        throw new BadRequest("Invalid cashierman_id");
    }

    const cashierman = await UserModel.findById(id).select(
        "username email phone image_url role status"
    );
    if (!cashierman) {
        throw new NotFound("Cashierman not found");
    }

    // ---- date range match ----
    const match: any = {
        cashierman_id: new mongoose.Types.ObjectId(id),
    };

    if (start_date || end_date) {
        match.start_time = {};
        if (start_date) {
            const from = new Date(start_date);
            if (isNaN(from.getTime())) throw new BadRequest("Invalid start_date");
            match.start_time.$gte = from;
        }
        if (end_date) {
            const to = new Date(end_date);
            if (isNaN(to.getTime())) throw new BadRequest("Invalid end_date");
            to.setHours(23, 59, 59, 999);
            match.start_time.$lte = to;
        }
    }

    // ---- aggregate shifts with sales / expenses / returns totals ----
    const shifts = await CashierShift.aggregate([
        { $match: match },

        {
            $lookup: {
                from: "cashiers",
                localField: "cashier_id",
                foreignField: "_id",
                as: "cashier",
            },
        },
        {
            $lookup: {
                from: "sales",
                localField: "_id",
                foreignField: "shift_id",
                as: "sales",
            },
        },
        {
            $lookup: {
                from: "expenses",
                localField: "_id",
                foreignField: "shift_id",
                as: "expenses",
            },
        },
        {
            $lookup: {
                from: "returns",
                localField: "_id",
                foreignField: "shift_id",
                as: "returns",
            },
        },

        {
            $addFields: {
                cashier_name: { $ifNull: [{ $arrayElemAt: ["$cashier.name", 0] }, null] },
                total_sales_amount: { $sum: "$sales.paid_amount" },
                total_expenses_amount: { $sum: "$expenses.amount" },
                total_returns_amount: { $sum: "$returns.total_amount" },
                returns_count: { $size: "$returns" },
                duration_ms: {
                    $cond: [
                        { $and: ["$start_time", "$end_time"] },
                        { $subtract: ["$end_time", "$start_time"] },
                        null,
                    ],
                },
            },
        },
        {
            $addFields: {
                net_cash: {
                    $subtract: [
                        { $subtract: ["$total_sales_amount", "$total_expenses_amount"] },
                        "$total_returns_amount",
                    ],
                },
            },
        },

        {
            $project: {
                _id: 1,
                status: 1,
                cashier_name: 1,
                start_time: 1,
                end_time: 1,
                duration_ms: 1,
                total_sales_amount: 1,
                total_expenses_amount: 1,
                total_returns_amount: 1,
                returns_count: 1,
                net_cash: 1,
            },
        },

        { $sort: { start_time: -1 } },
    ]);

    // ---- overall summary across the filtered shifts ----
    const summary = shifts.reduce(
        (acc, s) => {
            acc.total_shifts += 1;
            acc.total_sales_amount += s.total_sales_amount;
            acc.total_expenses_amount += s.total_expenses_amount;
            acc.total_returns_amount += s.total_returns_amount;
            acc.total_returns_count += s.returns_count;
            acc.total_net_cash += s.net_cash;
            return acc;
        },
        {
            total_shifts: 0,
            total_sales_amount: 0,
            total_expenses_amount: 0,
            total_returns_amount: 0,
            total_returns_count: 0,
            total_net_cash: 0,
        }
    );

    SuccessResponse(res, {
        cashierman,
        filters: { start_date: start_date || null, end_date: end_date || null },
        summary,
        shifts,
    });
};

export const getShiftDetails = async (req: Request, res: Response): Promise<void> => {
    const { shift_id } = req.params;

    const shift = await CashierShift.findById(shift_id)
        .populate("cashierman_id", "username email phone image_url")
        .populate("cashier_id", "name");

    if (!shift) {
        throw new NotFound("Shift not found");
    }

    // ---- sales in this shift ----
    const sales = await SaleModel.find({ shift_id })
        .select(
            "reference customer_id Due Due_customer_id remaining_amount grand_total total paid_amount discount tax_amount shipping service_fee_total date order_pending"
        )
        .populate("customer_id", "name phone")
        .sort({ date: -1 })
        .lean();

    const saleIds = sales.map((s) => s._id);

    // ---- product lines for those sales ----
    const productSales = await ProductSalesModel.find({ sale_id: { $in: saleIds } })
        .select(
            "sale_id product_id bundle_id quantity price subtotal discount discount_type isGift isBundle"
        )
        .populate("product_id", "name sku")
        .populate("bundle_id", "name")
        .lean();

    const productsBySale = productSales.reduce((acc: Record<string, any[]>, line) => {
        const key = String(line.sale_id);
        if (!acc[key]) acc[key] = [];
        acc[key].push(line);
        return acc;
    }, {});

    const salesWithItems = sales.map((s) => ({
        ...s,
        items: productsBySale[String(s._id)] || [],
    }));

    // ---- expenses in this shift ----
    const expenses = await ExpenseModel.find({ shift_id })
        .select("name amount Category_id note financial_accountId createdAt")
        .populate("Category_id", "name")
        .populate("financial_accountId", "name")
        .sort({ createdAt: -1 })
        .lean();

    // ---- returns in this shift ----
    const returns = await ReturnModel.find({ shift_id })
        .select(
            "reference sale_id sale_reference customer_id items total_amount refund_method note date"
        )
        .populate("customer_id", "name phone")
        .sort({ date: -1 })
        .lean();

    // ---- totals ----
    const total_sales_amount = sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
    const total_expenses_amount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const total_returns_amount = returns.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const total_products_sold = productSales.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const net_cash = total_sales_amount - total_expenses_amount - total_returns_amount;

    const duration_ms =
        shift.start_time && shift.end_time
            ? new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()
            : null;

    SuccessResponse(res, {
        shift: {
            _id: shift._id,
            status: shift.status,
            cashierman: shift.cashierman_id,
            cashier: shift.cashier_id,
            start_time: shift.start_time,
            end_time: shift.end_time,
            duration_ms,
        },
        summary: {
            sales_count: sales.length,
            total_sales_amount,
            total_expenses_amount,
            total_returns_amount,
            total_products_sold,
            net_cash,
        },
        sales: salesWithItems,
        expenses,
        returns,
    });
};