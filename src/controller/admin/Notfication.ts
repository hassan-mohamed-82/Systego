import { Request, Response } from "express";
import mongoose from "mongoose";
import { NotificationModel } from "../../models/schema/admin/Notfication";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const getAllNotifications = async (req: Request, res: Response) => {
  // 1️⃣ تشغيل الاستعلامين بالتوازي (Parallel Execution) لتسريع وقت الاستجابة
  const [notifications, unreadCount] = await Promise.all([
    NotificationModel.find()
      .populate("productId")
      .populate("purchaseItemId")
      .sort({ createdAt: -1 })
      .lean(), // استخدام lean للأداء العالي
    NotificationModel.countDocuments({ isRead: false }),
  ]);

  SuccessResponse(res, {
    message: "Get notifications successfully",
    notifications,
    unreadCount,
  });
};

export const getNotificationById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // 2️⃣ التحقق من صحة الـ ObjectId للحد من أخطاء CastError
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Valid Notification ID is required");
  }

  const notification = await NotificationModel.findById(id)
    .populate("productId")
    .populate("purchaseItemId");

  if (!notification) throw new NotFound("Notification not found");

  // 3️⃣ حفظ للتعديل فقط إذا لم تكن مقروءة بالفعل لتجنب الـ Write Operations الزائدة
  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  SuccessResponse(res, {
    message: "Get notification successfully",
    notification, // تعديل المسمى إلى المفرد (notification)
  });
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Valid Notification ID is required");
  }

  // 4️⃣ استخدام findByIdAndUpdate لتقليل عدد الـ Database Round-trips من مرتين لمرة واحدة
  const notification = await NotificationModel.findByIdAndUpdate(
    id,
    { isRead: true },
    { new: true },
  );

  if (!notification) throw new NotFound("Notification not found");

  SuccessResponse(res, {
    message: "Notification marked as read successfully",
    notification,
  });
};

export const markAllNotificationsAsRead = async (
  req: Request,
  res: Response,
) => {
  await NotificationModel.updateMany({ isRead: false }, { isRead: true });

  SuccessResponse(res, {
    message: "All notifications marked as read successfully",
  });
};
