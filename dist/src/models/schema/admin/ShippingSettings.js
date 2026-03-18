"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingSettingsModel = void 0;
const mongoose_1 = require("mongoose");
const shippingSettingsSchema = new mongoose_1.Schema({
    singletonKey: { type: String, default: "default", unique: true },
    shippingMethod: {
        type: String,
        enum: ["zone", "flat_rate", "carrier"],
        default: "zone",
    },
    flatRate: { type: Number, default: 0, min: 0 },
    carrierRate: { type: Number, default: 0, min: 0 },
    carrierId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Courier", default: null },
    freeShippingEnabled: { type: Boolean, default: false },
}, {
    timestamps: true,
});
exports.ShippingSettingsModel = (0, mongoose_1.model)("ShippingSettings", shippingSettingsSchema);
