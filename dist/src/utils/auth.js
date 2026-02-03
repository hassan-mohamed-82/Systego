"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const Errors_1 = require("../Errors");
dotenv_1.default.config();
// ✅ Token خفيف - بدون permissions
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign({
        id: payload._id.toString(),
        name: payload.username,
        role: payload.role,
        role_id: payload.role_id ? payload.role_id.toString() : null,
        warehouse_id: payload.warehouse_id
            ? payload.warehouse_id.toString()
            : null,
    }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        return {
            id: decoded.id,
            name: decoded.name,
            role: decoded.role,
            role_id: decoded.role_id,
            warehouse_id: decoded.warehouse_id,
        };
    }
    catch {
        throw new Errors_1.UnauthorizedError("Invalid token");
    }
};
exports.verifyToken = verifyToken;
