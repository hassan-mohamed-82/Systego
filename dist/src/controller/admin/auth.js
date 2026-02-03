"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = exports.login = void 0;
const User_1 = require("../../models/schema/admin/User");
const roles_1 = require("../../models/schema/admin/roles");
const CashierShift_1 = require("../../models/schema/admin/POS/CashierShift");
const auth_1 = require("../../utils/auth");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Errors_1 = require("../../Errors");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
const constant_1 = require("../../types/constant");
const handleImages_1 = require("../../utils/handleImages");
const login = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequest_1.BadRequest("Email and password are required");
    }
    const user = await User_1.UserModel.findOne({ email }).lean();
    if (!user) {
        throw new NotFound_1.NotFound("User not found");
    }
    if (user.status !== "active") {
        throw new Errors_1.UnauthorizedError("Your account is not active. Please contact admin.");
    }
    const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isMatch) {
        throw new Errors_1.UnauthorizedError("Invalid email or password");
    }
    // ✅ جيب الـ permissions للـ Response (Frontend)
    let mappedPermissions = [];
    let roleName = null;
    if (user.role === "superadmin") {
        mappedPermissions = constant_1.MODULES.map((mod) => ({
            module: mod,
            actions: constant_1.ACTION_NAMES.map((actionName, index) => ({
                id: `superadmin_${mod}_${index}`,
                action: actionName,
            })),
        }));
    }
    else if (user.role_id) {
        const roleData = await roles_1.RoleModel.findById(user.role_id).lean();
        if (!roleData) {
            throw new Errors_1.UnauthorizedError("User role not found. Please contact admin.");
        }
        if (roleData.status !== "active") {
            throw new Errors_1.UnauthorizedError("Your role is not active. Please contact admin.");
        }
        roleName = roleData.name;
        const rolePermissions = (roleData.permissions || []).map((p) => ({
            module: p.module,
            actions: (p.actions || []).map((a) => ({
                id: a._id?.toString() || "",
                action: a.action || "",
            })),
        }));
        const userPermissions = (user.permissions || []).map((p) => ({
            module: p.module,
            actions: (p.actions || []).map((a) => ({
                id: a._id?.toString() || "",
                action: a.action || "",
            })),
        }));
        mappedPermissions = mergePermissions(rolePermissions, userPermissions);
    }
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: user._id,
        status: "open",
    });
    // ✅ Token خفيف - بدون permissions
    const token = (0, auth_1.generateToken)({
        _id: user._id,
        username: user.username,
        role: user.role,
        role_id: user.role_id || null,
        warehouse_id: user.warehouse_id || null,
    });
    // ✅ الـ permissions في الـ Response بس
    (0, response_1.SuccessResponse)(res, {
        message: "Login successful",
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            status: user.status,
            role: user.role,
            role_id: user.role_id || null,
            role_name: roleName || (user.role === "superadmin" ? "Super Admin" : null),
            warehouse_id: user.warehouse_id ? user.warehouse_id.toString() : null,
            permissions: mappedPermissions,
        },
        hasOpenShift: !!openShift,
    });
};
exports.login = login;
// ✅ Helper
function mergePermissions(rolePermissions, userPermissions) {
    const permissionMap = new Map();
    rolePermissions.forEach((p) => {
        if (!permissionMap.has(p.module)) {
            permissionMap.set(p.module, new Map());
        }
        p.actions.forEach((a) => {
            permissionMap.get(p.module).set(a.action, a);
        });
    });
    userPermissions.forEach((p) => {
        if (!permissionMap.has(p.module)) {
            permissionMap.set(p.module, new Map());
        }
        p.actions.forEach((a) => {
            permissionMap.get(p.module).set(a.action, a);
        });
    });
    const result = [];
    permissionMap.forEach((actionsMap, module) => {
        result.push({
            module,
            actions: Array.from(actionsMap.values()),
        });
    });
    return result;
}
const signup = async (req, res) => {
    const data = req.body;
    // ✅ check if user already exists
    const existingUser = await User_1.UserModel.findOne({
        $or: [{ email: data.email }, { phone: data.phone }],
    });
    if (existingUser) {
        if (existingUser.email === data.email) {
            throw new Errors_1.ConflictError("Email is already registered");
        }
        if (existingUser.phone === data.phone) {
            throw new Errors_1.ConflictError("Phone Number is already used");
        }
    }
    // ✅ hash password
    const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
    // ✅ create new user
    const newUser = await User_1.UserModel.create({
        username: data.username,
        email: data.email,
        password_hash: hashedPassword,
        phone: data.phone,
        company_name: data.company_name,
        role: data.role, // default = admin لو مش مبعوتة
        possitionId: data.possitionId,
        address: data.address,
        vat_number: data.vat_number,
        state: data.state,
        postal_code: data.postal_code,
    });
    // ✅ save image if exists
    if (data.imageBase64) {
        const imageUrl = await (0, handleImages_1.saveBase64Image)(data.imageBase64, String(newUser._id), req, "users");
        newUser.image_url = imageUrl;
        await newUser.save();
    }
    (0, response_1.SuccessResponse)(res, {
        message: "User Signup Successfully. Please login.",
    }, 201);
};
exports.signup = signup;
