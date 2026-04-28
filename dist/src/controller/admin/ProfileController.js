"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMyProfile = exports.updateMyProfile = exports.getMyProfile = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../../models/schema/admin/User");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const handleImages_1 = require("../../utils/handleImages");
const Admin_1 = require("./Admin");
// =========================
// Get My Profile
// =========================
const getMyProfile = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new Errors_1.BadRequest("User ID not found in request");
    }
    const user = await User_1.UserModel.findById(userId)
        .select("-password_hash -__v")
        .populate("warehouse_id", "name")
        .populate("role_id", "name status permissions");
    if (!user) {
        throw new Errors_1.NotFound("Profile not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Profile retrieved successfully",
        profile: (0, Admin_1.formatUserResponseDetailed)(user),
    });
};
exports.getMyProfile = getMyProfile;
// =========================
// Update My Profile
// =========================
const updateMyProfile = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new Errors_1.BadRequest("User ID not found in request");
    }
    const { username, email, password, company_name, phone, image_base64, } = req.body;
    const user = await User_1.UserModel.findById(userId);
    if (!user) {
        throw new Errors_1.NotFound("Profile not found");
    }
    // Check unique username
    if (username && username !== user.username) {
        const exists = await User_1.UserModel.findOne({ username, _id: { $ne: userId } });
        if (exists)
            throw new Errors_1.BadRequest("Username already exists");
        user.username = username;
    }
    // Check unique email
    if (email && email !== user.email) {
        const exists = await User_1.UserModel.findOne({ email, _id: { $ne: userId } });
        if (exists)
            throw new Errors_1.BadRequest("Email already exists");
        user.email = email;
    }
    // Update fields
    if (company_name !== undefined)
        user.company_name = company_name;
    if (phone !== undefined)
        user.phone = phone;
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
        message: "Profile updated successfully",
        profile: (0, Admin_1.formatUserResponseDetailed)(user),
    });
};
exports.updateMyProfile = updateMyProfile;
// =========================
// Delete My Profile
// =========================
const deleteMyProfile = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new Errors_1.BadRequest("User ID not found in request");
    }
    // Prevent superadmin from deleting themselves to avoid locking the system
    const user = await User_1.UserModel.findById(userId);
    if (!user) {
        throw new Errors_1.NotFound("Profile not found");
    }
    if (user.role === "superadmin") {
        // Check if it's the only superadmin
        const superAdminCount = await User_1.UserModel.countDocuments({ role: "superadmin" });
        if (superAdminCount <= 1) {
            throw new Errors_1.BadRequest("Cannot delete the only superadmin account in the system");
        }
    }
    await User_1.UserModel.findByIdAndDelete(userId);
    (0, response_1.SuccessResponse)(res, { message: "Profile deleted successfully" });
};
exports.deleteMyProfile = deleteMyProfile;
