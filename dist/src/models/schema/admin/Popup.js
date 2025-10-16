"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopupModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const PopupSchema = new mongoose_1.default.Schema({
    title_ar: { type: String, required: true },
    title_En: { type: String, required: true },
    description_ar: { type: String, required: true },
    description_En: { type: String, required: true },
    image_ar: { type: String },
    image_En: { type: String },
    link: { type: String, required: true },
});
exports.PopupModel = mongoose_1.default.model("Popup", PopupSchema);
