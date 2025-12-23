"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selection = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAllUsers = exports.createUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../../models/schema/admin/User");
const BadRequest_1 = require("../../Errors/BadRequest");
const response_1 = require("../../utils/response");
const handleImages_1 = require("../../utils/handleImages");
const Errors_1 = require("../../Errors");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const mongoose_1 = __importDefault(require("mongoose"));
// =========================
// Create User
// =========================
const createUser = async (req, res, next) => {
    const { username, email, password, company_name, phone, image_base64, warehouse_id, role = "admin", } = req.body;
    if (!username || !email || !password || !warehouse_id) {
        throw new BadRequest_1.BadRequest("username, email, password and warehouse_id are required");
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(warehouse_id)) {
        throw new BadRequest_1.BadRequest("Invalid warehouse_id");
    }
    const warehouseExists = await Warehouse_1.WarehouseModel.findById(warehouse_id);
    if (!warehouseExists) {
        throw new BadRequest_1.BadRequest("Invalid warehouse_id: Warehouse does not exist");
    }
    const existingUser = await User_1.UserModel.findOne({
        $or: [{ email }, { username }],
    });
    if (existingUser) {
        throw new BadRequest_1.BadRequest("User with this email or username already exists");
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    const password_hash = await bcryptjs_1.default.hash(password, salt);
    let image_url;
    if (image_base64) {
        image_url = await (0, handleImages_1.saveBase64Image)(image_base64, username, req, "users");
    }
    const userDoc = await User_1.UserModel.create({
        username,
        email,
        password_hash,
        company_name,
        phone,
        image_url,
        warehouse_id,
        role,
    });
    (0, response_1.SuccessResponse)(res, {
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
exports.createUser = createUser;
// =========================
// Get All Users
// =========================
const getAllUsers = async (req, res, next) => {
    const users = await User_1.UserModel.find()
        .select("-password_hash -__v")
        .populate("warehouse_id", "name");
    if (!users || users.length === 0) {
        throw new Errors_1.NotFound("No users found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Get all users successfully",
        users,
    });
};
exports.getAllUsers = getAllUsers;
// =========================
// Get User By Id
// =========================
const getUserById = async (req, res, next) => {
    const { id } = req.params;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Invalid or missing user ID");
    }
    const user = await User_1.UserModel.findById(id)
        .select("-password_hash -__v")
        .populate("warehouse_id", "name");
    if (!user)
        throw new Errors_1.NotFound("User not found");
    (0, response_1.SuccessResponse)(res, {
        message: "User retrieved successfully",
        user,
    });
};
exports.getUserById = getUserById;
// =========================
// Update User
// =========================
const updateUser = async (req, res, next) => {
    const { id } = req.params;
    const { username, email, password, company_name, phone, status, image_base64, warehouse_id, role, } = req.body;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Invalid user id");
    }
    const user = await User_1.UserModel.findById(id);
    if (!user) {
        throw new Errors_1.NotFound("User not found");
    }
    if (username !== undefined)
        user.username = username;
    if (email !== undefined)
        user.email = email;
    if (company_name !== undefined)
        user.company_name = company_name;
    if (phone !== undefined)
        user.phone = phone;
    if (status !== undefined)
        user.status = status;
    // Handle warehouse_id update
    if (warehouse_id !== undefined) {
        if (warehouse_id && warehouse_id !== "") {
            if (!mongoose_1.default.Types.ObjectId.isValid(warehouse_id)) {
                throw new BadRequest_1.BadRequest("Invalid warehouse_id");
            }
            const warehouseExists = await Warehouse_1.WarehouseModel.findById(warehouse_id);
            if (!warehouseExists) {
                throw new BadRequest_1.BadRequest("Invalid warehouse_id: Warehouse does not exist");
            }
            user.warehouse_id = warehouse_id;
        }
        else {
            user.warehouse_id = undefined;
        }
    }
    if (role && ["superadmin", "admin"].includes(role)) {
        user.role = role;
    }
    if (password) {
        const salt = await bcryptjs_1.default.genSalt(10);
        user.password_hash = await bcryptjs_1.default.hash(password, salt);
    }
    if (image_base64) {
        user.image_url = await (0, handleImages_1.saveBase64Image)(image_base64, user.username, req, "users");
    }
    await user.save();
    (0, response_1.SuccessResponse)(res, {
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
            warehouse_id: user.warehouse_id,
        },
    });
};
exports.updateUser = updateUser;
// =========================
// Delete User
// =========================
const deleteUser = async (req, res, next) => {
    const { id } = req.params;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("User id is required or invalid");
    }
    const user = await User_1.UserModel.findByIdAndDelete(id);
    if (!user) {
        throw new Errors_1.NotFound("User not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "User deleted successfully",
    });
};
exports.deleteUser = deleteUser;
// =========================
// Selection (warehouses list)
// =========================
const selection = async (req, res, next) => {
    const warehouse = await Warehouse_1.WarehouseModel.find().select("_id name");
    (0, response_1.SuccessResponse)(res, {
        message: "Get warehouses successfully",
        warehouse,
    });
};
exports.selection = selection;
