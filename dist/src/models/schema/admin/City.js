"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CityModels = void 0;
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
    shipingCost: {
        type: Number,
        default: 0
    }
});
exports.CityModels = (0, mongoose_1.model)('City', citySchema);
