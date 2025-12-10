"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const Errors_1 = require("../Errors");
const User_1 = require("../models/schema/admin/User");
dotenv_1.default.config();
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user._id?.toString(),
        name: user.username,
        role: user.role,
        positionId: user.positionId?.toString(),
        roles: Array.isArray(user.roles) ? user.roles.map((role) => role.name) : [],
        actions: Array.isArray(user.actions) ? user.actions.map((action) => action.name) : [],
        tokenVersion: user.tokenVersion ?? 0, // 👈 مهم
    }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
exports.generateToken = generateToken;
const verifyToken = async (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // هات اليوزر من الـ DB
        const user = await User_1.UserModel.findById(decoded.id).select("username role positionId tokenVersion");
        if (!user) {
            throw new Errors_1.UnauthorizedError("Invalid token");
        }
        const tokenVersionInToken = decoded.tokenVersion ?? 0;
        // لو الـ version اللي في التوكن غير اللي في الـ DB يبقى التوكن خلاص باظ
        if (user.tokenVersion !== tokenVersionInToken) {
            throw new Errors_1.UnauthorizedError("Token expired, please login again");
        }
        return {
            id: user._id.toString(),
            name: decoded.name,
            role: decoded.role,
            positionId: decoded.positionId,
            roles: decoded.roles ?? [],
            actions: decoded.actions ?? [],
        };
    }
    catch (error) {
        throw new Errors_1.UnauthorizedError("Invalid token");
    }
};
exports.verifyToken = verifyToken;
