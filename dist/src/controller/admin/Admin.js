"use strict";
// src/controller/admin/userController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSelectionData = exports.deleteUser = exports.updateUser = exports.getUserPermissions = exports.getUserById = exports.getAllUsers = exports.createUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../../models/schema/admin/User");
const roles_1 = require("../../models/schema/admin/roles");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const handleImages_1 = require("../../utils/handleImages");
const constant_1 = require("../../types/constant");
// =========================
// Create User
// =========================
const createUser = async (req, res, next) => {
    const { username, email, password, company_name, phone, image_base64, warehouse_id, role_id, role = "admin", // superadmin أو admin
    status = "active", } = req.body;
    // Validation
    if (!username || !email || !password) {
        throw new Errors_1.BadRequest("username, email, and password are required");
    }
    // لو admin عادي، لازم يكون فيه role_id
    if (role === "admin" && !role_id) {
        throw new Errors_1.BadRequest("role_id is required for admin users");
    }
    // لو superadmin، مش محتاج role_id
    if (role === "superadmin" && role_id) {
        throw new Errors_1.BadRequest("superadmin doesn't need role_id");
    }
    // تحقق من الـ Role لو admin
    if (role === "admin" && role_id) {
        if (!mongoose_1.default.Types.ObjectId.isValid(role_id)) {
            throw new Errors_1.BadRequest("Invalid role_id");
        }
        const roleExists = await roles_1.RoleModel.findById(role_id);
        if (!roleExists) {
            throw new Errors_1.BadRequest("Role does not exist");
        }
        if (roleExists.status !== "active") {
            throw new Errors_1.BadRequest("Selected role is not active");
        }
    }
    // تحقق من الـ Warehouse
    if (warehouse_id) {
        if (!mongoose_1.default.Types.ObjectId.isValid(warehouse_id)) {
            throw new Errors_1.BadRequest("Invalid warehouse_id");
        }
        const warehouseExists = await Warehouse_1.WarehouseModel.findById(warehouse_id);
        if (!warehouseExists) {
            throw new Errors_1.BadRequest("Warehouse does not exist");
        }
    }
    // تحقق من وجود اليوزر
    const existingUser = await User_1.UserModel.findOne({
        $or: [{ email }, { username }],
    });
    if (existingUser) {
        throw new Errors_1.BadRequest("User with this email or username already exists");
    }
    // Hash password
    const password_hash = await bcryptjs_1.default.hash(password, 10);
    // Handle image
    let image_url;
    if (image_base64) {
        image_url = await (0, handleImages_1.saveBase64Image)(image_base64, username, req, "users");
    }
    // Create user
    const user = await User_1.UserModel.create({
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
    (0, response_1.SuccessResponse)(res, {
        message: "User created successfully",
        user: formatUserResponse(user),
    });
};
exports.createUser = createUser;
// =========================
// Get All Users
// =========================
const getAllUsers = async (req, res, next) => {
    const { selection } = req.query;
    // للـ Dropdown
    if (selection === "true") {
        const [warehouses, roles] = await Promise.all([
            Warehouse_1.WarehouseModel.find().select("_id name"),
            roles_1.RoleModel.find({ status: "active" }).select("_id name"),
        ]);
        return (0, response_1.SuccessResponse)(res, {
            message: "Selection data fetched successfully",
            warehouses: warehouses.map((w) => ({ id: w._id, name: w.name })),
            roles: roles.map((r) => ({ id: r._id, name: r.name })),
            userTypes: [
                { value: "superadmin", label: "Super Admin" },
                { value: "admin", label: "Admin" },
            ],
        });
    }
    const users = await User_1.UserModel.find()
        .select("-password_hash -__v")
        .populate("warehouse_id", "name")
        .populate("role_id", "name status")
        .sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, {
        message: "Users fetched successfully",
        count: users.length,
        users: users.map((user) => formatUserResponse(user)),
    });
};
exports.getAllUsers = getAllUsers;
// =========================
// Get User By ID
// =========================
const getUserById = async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new Errors_1.BadRequest("Invalid user ID");
    }
    const user = await User_1.UserModel.findById(id)
        .select("-password_hash -__v")
        .populate("warehouse_id", "name")
        .populate("role_id", "name status permissions");
    if (!user) {
        throw new Errors_1.NotFound("User not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "User retrieved successfully",
        user: formatUserResponseDetailed(user),
    });
};
exports.getUserById = getUserById;
// =========================
// Get User Permissions
// =========================
const getUserPermissions = async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new Errors_1.BadRequest("Invalid user ID");
    }
    const user = await User_1.UserModel.findById(id)
        .select("username email role role_id")
        .populate("role_id", "name permissions");
    if (!user) {
        throw new Errors_1.NotFound("User not found");
    }
    // لو superadmin، له كل الصلاحيات
    if (user.role === "superadmin") {
        const allPermissions = constant_1.MODULES.map((mod) => ({
            module: mod,
            actions: constant_1.ACTION_NAMES.map((action) => ({
                action,
                granted: true,
            })),
        }));
        return (0, response_1.SuccessResponse)(res, {
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
    const rolePermissions = user.role_id?.permissions || [];
    const permissions = rolePermissions.map((perm) => ({
        module: perm.module,
        actions: perm.actions.map((act) => ({
            id: act._id?.toString(),
            action: act.action,
        })),
    }));
    (0, response_1.SuccessResponse)(res, {
        message: "User permissions fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            role_id: user.role_id ? {
                id: user.role_id._id,
                name: user.role_id.name,
            } : null,
        },
        isSuperAdmin: false,
        permissions,
    });
};
exports.getUserPermissions = getUserPermissions;
// =========================
// Update User
// =========================
const updateUser = async (req, res, next) => {
    const { id } = req.params;
    const { username, email, password, company_name, phone, status, image_base64, warehouse_id, role_id, role, } = req.body;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new Errors_1.BadRequest("Invalid user ID");
    }
    const user = await User_1.UserModel.findById(id);
    if (!user) {
        throw new Errors_1.NotFound("User not found");
    }
    // Check unique username
    if (username && username !== user.username) {
        const exists = await User_1.UserModel.findOne({ username, _id: { $ne: id } });
        if (exists)
            throw new Errors_1.BadRequest("Username already exists");
        user.username = username;
    }
    // Check unique email
    if (email && email !== user.email) {
        const exists = await User_1.UserModel.findOne({ email, _id: { $ne: id } });
        if (exists)
            throw new Errors_1.BadRequest("Email already exists");
        user.email = email;
    }
    // Update fields
    if (company_name !== undefined)
        user.company_name = company_name;
    if (phone !== undefined)
        user.phone = phone;
    if (status !== undefined)
        user.status = status;
    // Update role type
    if (role !== undefined) {
        if (!["superadmin", "admin"].includes(role)) {
            throw new Errors_1.BadRequest("Invalid role type");
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
            throw new Errors_1.BadRequest("role_id is required for admin users");
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(role_id)) {
            throw new Errors_1.BadRequest("Invalid role_id");
        }
        const roleExists = await roles_1.RoleModel.findById(role_id);
        if (!roleExists) {
            throw new Errors_1.BadRequest("Role does not exist");
        }
        if (roleExists.status !== "active") {
            throw new Errors_1.BadRequest("Selected role is not active");
        }
        user.role_id = role_id;
    }
    // Handle warehouse_id
    if (warehouse_id !== undefined) {
        if (!warehouse_id) {
            user.warehouse_id = undefined;
        }
        else {
            if (!mongoose_1.default.Types.ObjectId.isValid(warehouse_id)) {
                throw new Errors_1.BadRequest("Invalid warehouse_id");
            }
            const warehouseExists = await Warehouse_1.WarehouseModel.findById(warehouse_id);
            if (!warehouseExists) {
                throw new Errors_1.BadRequest("Warehouse does not exist");
            }
            user.warehouse_id = warehouse_id;
        }
    }
    // Handle password
    if (password) {
        user.password_hash = await bcryptjs_1.default.hash(password, 10);
    }
    // Handle image
    if (image_base64) {
        user.image_url = await (0, handleImages_1.saveBase64Image)(image_base64, user.username, req, "users");
    }
    await user.save();
    await user.populate("role_id", "name");
    await user.populate("warehouse_id", "name");
    (0, response_1.SuccessResponse)(res, {
        message: "User updated successfully",
        user: formatUserResponse(user),
    });
};
exports.updateUser = updateUser;
// =========================
// Delete User
// =========================
const deleteUser = async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new Errors_1.BadRequest("Invalid user ID");
    }
    const user = await User_1.UserModel.findByIdAndDelete(id);
    if (!user) {
        throw new Errors_1.NotFound("User not found");
    }
    (0, response_1.SuccessResponse)(res, { message: "User deleted successfully" });
};
exports.deleteUser = deleteUser;
// =========================
// Helper Functions
// =========================
function formatUserResponse(user) {
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
function formatUserResponseDetailed(user) {
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
            permissions: user.role_id.permissions.map((perm) => ({
                module: perm.module,
                actions: perm.actions.map((act) => ({
                    id: act._id?.toString(),
                    action: act.action,
                })),
            })),
        };
    }
    return {
        ...base,
        isSuperAdmin: false,
    };
}
// =========================
// Get Selection Data (Warehouses + Roles)
// =========================
const getSelectionData = async (req, res, next) => {
    const [warehouses, roles] = await Promise.all([
        Warehouse_1.WarehouseModel.find().select("_id name"),
        roles_1.RoleModel.find({ status: "active" }).select("_id name"),
    ]);
    (0, response_1.SuccessResponse)(res, {
        message: "Selection data fetched successfully",
        warehouses: warehouses.map((w) => ({ id: w._id, name: w.name })),
        roles: roles.map((r) => ({ id: r._id, name: r.name })),
    });
};
exports.getSelectionData = getSelectionData;
