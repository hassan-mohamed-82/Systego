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
exports.PurchaseItemModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PurchaseItemSchema = new mongoose_1.Schema({
    date: { type: Date, required: true, default: Date.now },
    product_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Product" },
    material_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Material" }, // ✅ جديد
    category_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Category" },
    date_of_expiery: { type: Date }, // ✅ جديد
    purchase_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Purchase" },
    warehouse_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Warehouse" },
    quantity: { type: Number, required: true },
    unit_cost: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    item_type: {
        type: String,
        enum: ["product", "material"],
        default: "product",
    }, // ✅ جديد
}, { timestamps: true });
// Validation
PurchaseItemSchema.pre("save", function (next) {
    if (!this.product_id && !this.material_id) {
        return next(new Error("Either product_id or material_id is required"));
    }
    if (this.product_id && this.material_id) {
        return next(new Error("Cannot have both product_id and material_id"));
    }
    next();
});
PurchaseItemSchema.virtual("options", {
    ref: "PurchaseItemOption",
    localField: "_id",
    foreignField: "purchase_item_id",
});
exports.PurchaseItemModel = mongoose_1.default.model("PurchaseItem", PurchaseItemSchema);
