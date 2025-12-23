import mongoose, { Schema } from "mongoose";


const ReturnItemSchema = new Schema({
    product_id: { type: Schema.Types.ObjectId, ref: "Product" },
    product_price_id: { type: Schema.Types.ObjectId, ref: "ProductPrice" },
    bundle_id: { type: Schema.Types.ObjectId, ref: "Pandel" },
    original_quantity: { type: Number, required: true },
    returned_quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    subtotal: { type: Number, required: true },
});

const ReturnPurchaseSchema = new Schema({
    reference: {
        type: String,
        trim: true,
        unique: true,
        maxlength: 8,
        default: function () {
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const day = String(now.getDate()).padStart(2, "0");
            const datePart = `${month}${day}`;
            const randomPart = Math.floor(1000 + Math.random() * 9000);
            return `${datePart}${randomPart}`;
        },
    },
    purchase_id: { type: Schema.Types.ObjectId, ref: "Purchase" },
    purchase_reference: { type: String, required: true },
    warehouse_id: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },

    supplier_id: { type: Schema.Types.ObjectId, ref: "Supplier" },
    // ---- Admin -----
    user_id: { type: Schema.Types.ObjectId, ref: "User" },
    // ---- Admin -----
    items: [ReturnItemSchema],
    total_amount: {
        type: Number,
        required: true,
    },
    refund_account_id: {
        type: Schema.Types.ObjectId,
        ref: "BankAccount",
    },
    refund_method: {
        type: String,
        enum: ["cash", "card", "store_credit", "original_method"],
        default: "original_method",
    },
    image: {
        type: String,
        default: "",
    },
    note: {
        type: String,
        default: ""
    },
    date: {
        type: Date,
        default: Date.now
    },
}, {
    timestamps: true
});
ReturnPurchaseSchema.index({ purchase_id: 1 });
ReturnPurchaseSchema.index({ supplier_id: 1 });
ReturnPurchaseSchema.index({ reference: 1 });
ReturnPurchaseSchema.index({ purchase_reference: 1 });

export const ReturnPurchaseModel = mongoose.model("ReturnPurchase", ReturnPurchaseSchema);
