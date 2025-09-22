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
exports.SupplierModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SupplierSchema = new mongoose_1.Schema({
    image: { type: String },
    username: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, maxlength: 150 },
    phone_number: { type: String, maxlength: 20, unique: true, required: true },
    vat_number: { type: String, maxlength: 50 },
    address: { type: String },
    state: { type: String, maxlength: 100 },
    postal_code: { type: String, maxlength: 20 },
    total_due: { type: mongoose_1.Schema.Types.Decimal128, default: 0.0 },
    created_at: { type: Date, default: Date.now },
});
exports.SupplierModel = mongoose_1.default.model("Supplier", SupplierSchema);
