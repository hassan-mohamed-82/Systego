"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
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
    const user = await User_1.UserModel.findOne({ email });
    if (!user) {
        throw new NotFound_1.NotFound("User not found");
    }
    // التحقق من كلمة المرور باستخدام bcrypt مباشرة
    const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isMatch) {
        return next(new Errors_1.UnauthorizedError("Invalid email or password"));
    }
    const token = (0, auth_1.generateToken)({
        id: user._id,
        role: user.role,
        name: user.username,
    });
    (0, response_1.SuccessResponse)(res, { message: "Login successful",
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
        },
    });
};
exports.login = login;
