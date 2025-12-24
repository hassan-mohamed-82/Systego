import mongoose from "mongoose";

const PopupSchema = new mongoose.Schema({
    title_ar: { type: String, required: true },
    title_En: { type: String, required: true },
    description_ar: { type: String, required: true },
    description_En: { type: String, required: true },
    image: { type: String},
    link: { type: String, required: true },
});

export const PopupModel = mongoose.model("Popup", PopupSchema);