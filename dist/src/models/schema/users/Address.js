"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Address = void 0;
const mongoose_1 = require("mongoose");
const addressSchema = new mongoose_1.Schema({
    country: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Country',
        required: true
    },
    city: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'City',
        required: true
    },
    zone: {
        type: String,
        required: true
    },
    street: {
        type: String,
        required: true
    },
    buildingNumber: {
        type: String,
        required: true
    },
    floorNumber: {
        type: String
    },
    apartmentNumber: {
        type: String
    },
    uniqueIdentifier: {
        type: String
    }
}, {
    timestamps: true
});
exports.Address = (0, mongoose_1.model)('Address', addressSchema);
