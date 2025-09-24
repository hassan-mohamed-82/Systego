"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAllUsers = exports.createUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/schema/User");
const BadRequest_1 = require("../Errors/BadRequest");
const response_1 = require("../utils/response");
const handleImages_1 = require("../utils/handleImages");
const Errors_1 = require("../Errors");
const createUser = async (req, res, next) => {
    const currentUser = req.user;
    const { username, email, password, positionId, company_name, phone, image_base64 } = req.body;
    if (!username || !email || !password || !positionId) {
        throw new BadRequest_1.BadRequest("Username, email, password, and positionId are required");
    }
    // ✅ التأكد من تكرار البيانات
    const existingUser = await User_1.UserModel.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new BadRequest_1.BadRequest("User with this email or username already exists");
    }
    // ✅ تشفير الباسورد
    const salt = await bcryptjs_1.default.genSalt(10);
    const password_hash = await bcryptjs_1.default.hash(password, salt);
    // ✅ حفظ الصورة (اختياري)
    let image_url;
    if (image_base64) {
        image_url = await (0, handleImages_1.saveBase64Image)(image_base64, username, req, "users");
    }
    // ✅ إنشاء المستخدم
    const newUser = await (await (User_1.UserModel.create({
        username,
        email,
        password_hash,
        positionId,
        company_name,
        phone,
        image_url,
    }))).populate("positionId");
    (0, response_1.SuccessResponse)(res, {
        message: "User created successfully",
        user: {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            positionId: newUser.positionId,
            status: newUser.status,
            image_url: newUser.image_url,
        },
    });
};
exports.createUser = createUser;
const getAllUsers = async (req, res, next) => {
    const users = await User_1.UserModel.find();
    if (!users || users.length === 0) {
        throw new Errors_1.NotFound("No users found");
    }
    (0, response_1.SuccessResponse)(res, { message: "get all users successfully", users });
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("User id is required");
    }
    const user = await User_1.UserModel.findById(id);
    if (!user) {
        throw new Errors_1.NotFound("User not found");
    }
    (0, response_1.SuccessResponse)(res, { message: "get user successfully", user });
};
exports.getUserById = getUserById;
const updateUser = async (req, res, next) => {
    const { id } = req.params;
    const { username, email, password, positionId, company_name, phone, status, image_base64 } = req.body;
    const user = await User_1.UserModel.findById(id);
    if (!user) {
        throw new Errors_1.NotFound("User not found");
    }
    if (username)
        user.username = username;
    if (email)
        user.email = email;
    if (positionId)
        user.positionId = positionId;
    if (company_name)
        user.company_name = company_name;
    if (phone)
        user.phone = phone;
    if (status)
        user.status = status;
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
            positionId: user.positionId,
            status: user.status,
            image_url: user.image_url,
        },
    });
};
exports.updateUser = updateUser;
const deleteUser = async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("User id is required");
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
