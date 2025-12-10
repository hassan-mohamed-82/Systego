import { Schema, model } from "mongoose";

const countrySchema = new Schema({
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
  ref: "City",               // اسم الموديل
  localField: "_id",         // في Country
  foreignField: "country",   // في CitySchema
  justOne: false,            // عايزينه Array
});

// لازم نفعّل الـ virtuals في toJSON / toObject عشان تظهر في الريسبونس
countrySchema.set("toJSON", { virtuals: true });
countrySchema.set("toObject", { virtuals: true });

export const CountryModel = model("Country", countrySchema);
