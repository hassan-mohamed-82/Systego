import { Server } from "socket.io";
import { ProductModel } from "../models/schema/admin/products";
import { PurchaseItemModel } from "../models/schema/admin/purchase_item";
import { NotificationModel } from "../models/schema/admin/Notfication";
import cron from "node-cron";

export class NotificationService {
  constructor(private io: Server) {}

  async checkLowStock(productId: string) {
    const product = await ProductModel.findById(productId);
    if (!product) return;

    if (product.low_stock && product.quantity <= product.low_stock) {
      const existingNotification = await NotificationModel.findOne({
        type: "low_stock",
        productId: product._id,
        isRead: false,
      });

      if (existingNotification) return;

      const notification = await NotificationModel.create({
        type: "low_stock",
        productId: product._id,
        message: `⚠️ Product ${product.name} is low in stock (${product.quantity}).`,
      });

      this.io.emit("notification", notification);
    }
  }

  async checkExpiry() {
    const now = new Date();
    const soon = new Date();
    soon.setDate(now.getDate() + 7);

    now.setHours(0, 0, 0, 0);
    soon.setHours(23, 59, 59, 999);

    const expiringItems = await PurchaseItemModel.find({
      item_type: "product",
      date_of_expiery: { $lte: soon, $gte: now },
      quantity: { $gt: 0 },
    }).populate({
      path: "product_id",
      select: "_id name",
    });

    for (const item of expiringItems) {
      const product = item.product_id as any;
      if (!product) continue;

      const existingNotification = await NotificationModel.findOne({
        type: "expiry",
        purchaseItemId: item._id,
        isRead: false,
      });

      if (existingNotification) continue;

      const expiryDate = item.date_of_expiery?.toDateString() || "Unknown";

      const notification = await NotificationModel.create({
        type: "expiry",
        productId: product._id,
        purchaseItemId: item._id,
        message: `⏰ Product ${product.name} will expire on ${expiryDate}. Quantity: ${item.quantity}`,
      });

      this.io.emit("notification", notification);
    }
  }

  async checkExpired() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const expiredItems = await PurchaseItemModel.find({
      item_type: "product",
      date_of_expiery: { $lt: now },
      quantity: { $gt: 0 },
    }).populate({
      path: "product_id",
      select: "_id name",
    });

    for (const item of expiredItems) {
      const product = item.product_id as any;
      if (!product) continue;

      const existingNotification = await NotificationModel.findOne({
        type: "expired",
        purchaseItemId: item._id,
        isRead: false,
      });

      if (existingNotification) continue;

      const expiryDate = item.date_of_expiery?.toDateString() || "Unknown";

      const notification = await NotificationModel.create({
        type: "expired",
        productId: product._id,
        purchaseItemId: item._id,
        message: `🚨 Product ${product.name} has EXPIRED on ${expiryDate}. Quantity: ${item.quantity}`,
      });

      this.io.emit("notification", notification);
    }
  }

  async checkAllLowStock() {
    const products = await ProductModel.find({
      low_stock: { $exists: true, $ne: null },
    });

    for (const product of products) {
      if (product.low_stock && product.quantity <= product.low_stock) {
        const existingNotification = await NotificationModel.findOne({
          type: "low_stock",
          productId: product._id,
          isRead: false,
        });

        if (existingNotification) continue;

        const notification = await NotificationModel.create({
          type: "low_stock",
          productId: product._id,
          message: `⚠️ Product ${product.name} is low in stock (${product.quantity}).`,
        });

        this.io.emit("notification", notification);
      }
    }
  }
}

export function startCron(io: Server) {
  const service = new NotificationService(io);

  // يتشيك كل يوم الساعة 3 العصر على المنتجات القريبة من الانتهاء
  cron.schedule("0 15 * * *", async () => {
    console.log("🔔 Running expiry check...");
    await service.checkExpiry();
  });

  // يتشيك كل يوم الساعة 3:30 على المنتجات المنتهية فعلاً
  cron.schedule("30 15 * * *", async () => {
    console.log("🚨 Running expired check...");
    await service.checkExpired();
  });

  // يتشيك كل يوم الساعة 4 على المنتجات اللي كميتها قليلة
  cron.schedule("0 16 * * *", async () => {
    console.log("⚠️ Running low stock check...");
    await service.checkAllLowStock();
  });

  console.log("✅ Cron jobs scheduled successfully");
}
