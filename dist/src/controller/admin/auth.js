"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = exports.login = void 0;
const User_1 = require("../../models/schema/admin/User");
const auth_1 = require("../../utils/auth");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Errors_1 = require("../../Errors");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
const handleImages_1 = require("../../utils/handleImages");
const CashierShift_1 = require("../../models/schema/admin/POS/CashierShift");
const login = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequest_1.BadRequest("Email and password are required");
    }
    const user = await User_1.UserModel.findOne({ email }).lean();
    if (!user) {
        throw new NotFound_1.NotFound("User not found");
    }
    const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isMatch) {
        throw new Errors_1.UnauthorizedError("Invalid email or password");
    }
    const mappedPermissions = (user.permissions || []).map((p) => ({
        module: p.module,
        actions: (p.actions || []).map((a) => ({
            id: a._id.toString(),
            action: a.action,
        })),
    }));
    // ✅ التحقق من وجود شيفت مفتوح
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: user._id,
        status: "open",
    });
    const token = (0, auth_1.generateToken)({
        _id: user._id,
        username: user.username,
        role: user.role,
        warehouse_id: user.warehouse_id || null,
        permissions: mappedPermissions,
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Login successful",
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            status: user.status,
            role: user.role,
            warehouse_id: user.warehouse_id
                ? user.warehouse_id.toString()
                : null,
            permissions: mappedPermissions,
        },
        hasOpenShift: !!openShift, // ✅ true أو false بس
    });
};
exports.login = login;
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
