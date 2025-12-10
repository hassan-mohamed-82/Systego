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
// ✅ virtual يلم كل الـ Cities اللي الـ country بتاعها = _id بتاع الـ Country ده
countrySchema.virtual("cities", {
    ref: "City", // اسم الموديل
    localField: "_id", // في Country
    foreignField: "country", // في CitySchema
    justOne: false, // عايزينه Array
});
// لازم نفعّل الـ virtuals في toJSON / toObject عشان تظهر في الريسبونس
countrySchema.set("toJSON", { virtuals: true });
countrySchema.set("toObject", { virtuals: true });
exports.CountryModel = (0, mongoose_1.model)("Country", countrySchema);
