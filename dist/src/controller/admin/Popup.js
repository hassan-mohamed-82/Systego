"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePopup = exports.deletePopup = exports.createPopup = exports.getPopupById = exports.getPopup = void 0;
const Popup_1 = require("../../models/schema/admin/Popup");
const handleImages_1 = require("../../utils/handleImages");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const getPopup = async (req, res) => {
    const popup = await Popup_1.PopupModel.findOne();
    if (!popup)
        throw new Errors_1.NotFound("Popup not found");
    return (0, response_1.SuccessResponse)(res, { message: "Popup found successfully", popup });
};
exports.getPopup = getPopup;
const getPopupById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Popup id is required");
    const popup = await Popup_1.PopupModel.findById(id);
    if (!popup)
        throw new Errors_1.NotFound("Popup not found");
    return (0, response_1.SuccessResponse)(res, { message: "Popup found successfully", popup });
};
exports.getPopupById = getPopupById;
const createPopup = async (req, res) => {
    const { title_ar, title_En, description_ar, description_En, image_ar, image_En, link } = req.body;
    if (!title_ar || !title_En || !description_ar || !description_En || !link)
        throw new BadRequest_1.BadRequest("All fields are required");
    const image_ar_url = await (0, handleImages_1.saveBase64Image)(image_ar, Date.now().toString(), req, "popup");
    const image_En_url = await (0, handleImages_1.saveBase64Image)(image_En, Date.now().toString(), req, "popup");
    const popup = await Popup_1.PopupModel.create({ title_ar, title_En, description_ar, description_En, image_ar: image_ar_url, image_En: image_En_url, link });
    return (0, response_1.SuccessResponse)(res, { message: "Popup created successfully", popup });
};
exports.createPopup = createPopup;
const deletePopup = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Popup id is required");
    const popup = await Popup_1.PopupModel.findByIdAndDelete(id);
    if (!popup)
        throw new Errors_1.NotFound("Popup not found");
    return (0, response_1.SuccessResponse)(res, { message: "Popup deleted successfully", popup });
};
exports.deletePopup = deletePopup;
const updatePopup = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Popup id is required");
    const updateData = { ...req.body };
    if (req.body.image_ar) {
        const image_ar_url = await (0, handleImages_1.saveBase64Image)(req.body.image_ar, Date.now().toString(), req, "popup");
        updateData.image_ar = image_ar_url;
    }
    if (req.body.image_En) {
        const image_En_url = await (0, handleImages_1.saveBase64Image)(req.body.image_En, Date.now().toString(), req, "popup");
        updateData.image_En = image_En_url;
    }
    const popup = await Popup_1.PopupModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!popup)
        throw new Errors_1.NotFound("Popup not found");
    return (0, response_1.SuccessResponse)(res, { message: "Popup updated successfully", popup });
};
exports.updatePopup = updatePopup;
