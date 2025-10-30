"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountryModel = void 0;
const mongoose_1 = require("mongoose");
const countrySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    ar_name: {
        type: String,
        required: true,
    },
    isDefault: {
        type: Boolean,
        default: false,
    }
});
exports.CountryModel = (0, mongoose_1.model)('Country', countrySchema);
