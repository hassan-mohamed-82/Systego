"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PointModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const PointShcema = new mongoose_1.default.Schema({
    amount: { type: Number, required: true, min: 0 },
    points: { type: Number, required: true, min: 0 },
});
exports.PointModel = mongoose_1.default.model("Point", PointShcema);
