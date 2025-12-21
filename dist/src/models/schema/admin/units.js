"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const UnitSchema = new mongoose_1.default.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    ar_name: {
        type: String,
        required: true
    },
    base_unit: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Unit",
        default: null // null يعني هي نفسها base unit
    },
    operator: {
        type: String,
        enum: ["*", "/"], // ضرب أو قسمة
        default: "*"
    },
    operator_value: {
        type: Number,
        default: 1 // القيمة اللي هنضرب أو نقسم فيها
    },
    is_base_unit: {
        type: Boolean,
        default: false // هل دي وحدة أساسية ولا لأ
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });
exports.UnitModel = mongoose_1.default.model("Unit", UnitSchema);
