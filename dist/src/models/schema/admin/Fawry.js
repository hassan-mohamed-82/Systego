"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FawryModel = void 0;
const mongoose_1 = require("mongoose");
const fawrySchema = new mongoose_1.Schema({
    payment_method_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "PaymentMethod",
        required: true
    },
    merchantCode: {
        type: String,
        required: true,
        trim: true
    },
    secureKey: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    sandboxMode: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
exports.FawryModel = (0, mongoose_1.model)('Fawry', fawrySchema);
