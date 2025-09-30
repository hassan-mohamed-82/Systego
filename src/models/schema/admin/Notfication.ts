import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["expiry", "low_stock"], required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const NotificationModel = mongoose.model("Notification", notificationSchema);
