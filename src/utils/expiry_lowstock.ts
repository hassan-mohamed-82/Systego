import { Server } from "socket.io";
import {ProductModel} from "../models/schema/admin/products";
import {NotificationModel} from "../models/schema/admin/Notfication";
import cron from "node-cron";


export class NotificationService {
  constructor(private io: Server) {}

  async checkLowStock(productId: string) {
    const product = await ProductModel.findById(productId);
    if (!product) return;

    if (product.low_stock && product.quantity <= product.low_stock) {
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
    soon.setDate(now.getDate() + 7); // قرب يخلص بعد 7 أيام

    const products = await ProductModel.find({
      date_of_expiery: { $lte: soon, $gte: now },
    });

    for (const product of products) {
      const notification = await NotificationModel.create({
        type: "expiry",
        productId: product._id,
        message: `⏰ Product ${product.name} will expire on ${product.date_of_expiery?.toDateString()}.`,
      });

      this.io.emit("notification", notification);
    }
  }
}

// cron-jobs.ts

export function startCron(io: Server) {
  const service = new NotificationService(io);

  // يتشيك كل يوم الساعة 12 بليل
cron.schedule("0 15 * * *", async () => {
  await service.checkExpiry();
});

}
