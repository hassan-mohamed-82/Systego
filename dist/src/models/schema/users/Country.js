"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Country = void 0;
const mongoose_1 = require("mongoose");
const countrySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        default: 'Egypt'
    }
});
exports.Country = (0, mongoose_1.model)('Country', countrySchema);
