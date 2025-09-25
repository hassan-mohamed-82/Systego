"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import userRouter from './user/index';
const index_1 = __importDefault(require("./admin/index"));
const route = (0, express_1.Router)();
route.use('/admin', index_1.default);
// route.use('/user', userRouter);
exports.default = route;
