import { Request, Response } from "express";
import { NotificationModel } from "../../models/schema/admin/Notfication";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const getAllNotifications = async (req: Request, res: Response) => {
    const notifications = await NotificationModel.find().sort({ createdAt: -1 });
    if (!notifications || notifications.length === 0) throw new NotFound("No notifications found");
    SuccessResponse(res, { message: "Get notifications successfully", notifications });
  };

  export const getNotificationById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Notification ID is required");
    const notifications = await NotificationModel.findById(id);
    if (!notifications) throw new NotFound("Notification not found");
    notifications.isRead = true;
    SuccessResponse(res, { message: "Get notification successfully", notifications });
  };
  