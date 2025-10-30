import mongoose from "mongoose";

const ZoneSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    ar_name: { type: String, required: true },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: "Country", required: true },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true },
    cost: { type: Number,  },    
});

export const ZoneModel = mongoose.model("Zone", ZoneSchema);