"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeem_PointsModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const redeem_PointsShcema = new mongoose_1.default.Schema({
    amount: { type: Number, required: true, min: 0 },
    points: { type: Number, required: true, min: 0 },
});
exports.redeem_PointsModel = mongoose_1.default.model("Point", redeem_PointsShcema);
