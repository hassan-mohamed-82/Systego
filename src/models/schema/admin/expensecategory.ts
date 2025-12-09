import mongoose from "mongoose";

const ExpenseCategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        ar_name: {
            type: String,
            required: true,
            unique: true,
        },
        status: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export const ExpenseCategoryModel = mongoose.model("ExpenseCategory", ExpenseCategorySchema);