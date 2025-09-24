"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = exports.login = void 0;
const User_1 = require("../models/schema/User");
const auth_1 = require("../utils/auth");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Errors_1 = require("../Errors");
const BadRequest_1 = require("../Errors/BadRequest");
const NotFound_1 = require("../Errors/NotFound");
const response_1 = require("../utils/response");
const login = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequest_1.BadRequest("Email and password are required");
    }
    // ✅ نجيب اليوزر + position + roles + actions
    const user = await User_1.UserModel.findOne({ email })
        .populate({
        path: "possitionid",
        model: "Position",
        populate: {
            path: "roles",
            model: "Role",
            populate: {
                path: "actions",
                model: "Action",
            },
        },
    })
        .lean(); // 👈 يخلي النتيجة تاخد شكل AppUser
    if (!user) {
        throw new NotFound_1.NotFound("User not found");
    }
    // ✅ التحقق من كلمة المرور
    const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isMatch) {
        throw new Errors_1.UnauthorizedError("Invalid email or password");
    }
    // ✅ توليد التوكن
    const token = (0, auth_1.generateToken)({
        id: user._id,
        position: user.positionId?.name, // نرجع اسم الـ Position
        name: user.username,
    });
    // ✅ استجابة منظمة
    (0, response_1.SuccessResponse)(res, {
        message: "Login successful",
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            position: user.positionId, // فيه جواه الـ roles + actions
            status: user.status,
        },
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
        image_url: data.image_url,
    });
    (0, response_1.SuccessResponse)(res, {
        message: "User Signup Successfully. Please login.",
        userId: newUser._id,
    }, 201);
};
exports.signup = signup;
