"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.City = void 0;
const mongoose_1 = require("mongoose");
const citySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    country: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Country',
        required: true
    },
    shippingCost: {
        type: Number,
        default: 0
    }
});
exports.City = (0, mongoose_1.model)('City', citySchema);
