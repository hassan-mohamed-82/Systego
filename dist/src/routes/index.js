"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.route = void 0;
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const brand_1 = __importDefault(require("./brand"));
const Admin_1 = __importDefault(require("./Admin"));
exports.route = (0, express_1.Router)();
exports.route.use("/auth", auth_1.default);
exports.route.use("/brand", brand_1.default);
exports.route.use("/admin", Admin_1.default);
exports.default = exports.route;
