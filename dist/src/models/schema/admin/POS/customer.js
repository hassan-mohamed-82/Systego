"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerGroupModel = exports.CustomerModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CustomerSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String },
    phone_number: { type: String, required: true },
    address: { type: String },
    country: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Country' },
    city: { type: mongoose_1.Schema.Types.ObjectId, ref: 'City' },
    customer_group_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'CustomerGroup' },
    total_points_earned: { type: Number, default: 0, min: 0 }
}, { timestamps: true });
const CustomerGroupSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    status: { type: Boolean, default: true },
}, { timestamps: true });
exports.CustomerModel = mongoose_1.default.model("Customer", CustomerSchema);
exports.CustomerGroupModel = mongoose_1.default.model("CustomerGroup", CustomerGroupSchema);
