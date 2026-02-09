"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getNotificationById = exports.getAllNotifications = void 0;
const Notfication_1 = require("../../models/schema/admin/Notfication");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const getAllNotifications = async (req, res) => {
    const notifications = await Notfication_1.NotificationModel.find().populate('productId').populate('purchaseItemId').sort({ createdAt: -1 });
    if (!notifications || notifications.length === 0)
        throw new Errors_1.NotFound("No notifications found");
    const unreadCount = await Notfication_1.NotificationModel.countDocuments({ isRead: false });
    (0, response_1.SuccessResponse)(res, { message: "Get notifications successfully", notifications, unreadCount });
};
exports.getAllNotifications = getAllNotifications;
const getNotificationById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Notification ID is required");
    const notifications = await Notfication_1.NotificationModel.findById(id).populate('productId').populate('purchaseItemId');
    if (!notifications)
        throw new Errors_1.NotFound("Notification not found");
    notifications.isRead = true;
    await notifications.save();
    (0, response_1.SuccessResponse)(res, { message: "Get notification successfully", notifications });
};
exports.getNotificationById = getNotificationById;
const markNotificationAsRead = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Notification ID is required");
    const notification = await Notfication_1.NotificationModel.findById(id);
    if (!notification)
        throw new Errors_1.NotFound("Notification not found");
    notification.isRead = true;
    await notification.save();
    (0, response_1.SuccessResponse)(res, { message: "Notification marked as read successfully" });
};
exports.markNotificationAsRead = markNotificationAsRead;
const markAllNotificationsAsRead = async (req, res) => {
    await Notfication_1.NotificationModel.updateMany({ isRead: false }, { isRead: true });
    (0, response_1.SuccessResponse)(res, { message: "All notifications marked as read successfully" });
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
