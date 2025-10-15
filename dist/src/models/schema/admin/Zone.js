"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoneModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ZoneSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true },
    countryId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Country", required: true },
    cityId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "City", required: true },
    cost: { type: Number, },
});
exports.ZoneModel = mongoose_1.default.model("Zone", ZoneSchema);
