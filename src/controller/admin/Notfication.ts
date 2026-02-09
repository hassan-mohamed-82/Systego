import { Request, Response } from "express";
import { NotificationModel } from "../../models/schema/admin/Notfication";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const getAllNotifications = async (req: Request, res: Response) => {
  const notifications = await NotificationModel.find().populate('productId').populate('purchaseItemId').sort({ createdAt: -1 });
  if (!notifications || notifications.length === 0) throw new NotFound("No notifications found");
  const unreadCount = await NotificationModel.countDocuments({ isRead: false });

  SuccessResponse(res, { message: "Get notifications successfully", notifications, unreadCount });
};

export const getNotificationById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Notification ID is required");
  const notifications = await NotificationModel.findById(id).populate('productId').populate('purchaseItemId');
  if (!notifications) throw new NotFound("Notification not found");
  notifications.isRead = true;
  await notifications.save();
  SuccessResponse(res, { message: "Get notification successfully", notifications });
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Notification ID is required");

  const notification = await NotificationModel.findById(id);
  if (!notification) throw new NotFound("Notification not found");

  notification.isRead = true;
  await notification.save();

  SuccessResponse(res, { message: "Notification marked as read successfully" });
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  await NotificationModel.updateMany({ isRead: false }, { isRead: true });

  SuccessResponse(res, { message: "All notifications marked as read successfully" });
};
