import mongoose, { Schema, Document } from "mongoose";

export interface IStoreSettings extends Document {
    title: string;
    logo: string | null;
}

const storeSettingsSchema = new Schema<IStoreSettings>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        logo: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export const StoreSettingsModel = mongoose.model<IStoreSettings>(
    "StoreSettings",
    storeSettingsSchema
);