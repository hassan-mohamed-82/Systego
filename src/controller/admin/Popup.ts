import { Request, Response } from "express";
import { PopupModel } from "../../models/schema/admin/Popup";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const getPopup = async (req: Request, res: Response) => {
    const popup = await PopupModel.find();
    if (!popup) throw new NotFound("Popup not found");
    return SuccessResponse(res, {message: "Popup found successfully", popup});
};

export const getPopupById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Popup id is required");
    const popup = await PopupModel.findById(id);
    if (!popup) throw new NotFound("Popup not found");
    return SuccessResponse(res, {message: "Popup found successfully", popup});
}

export const createPopup=async (req: Request, res: Response) => {
    const { title_ar, title_En, description_ar, description_En,image, link } = req.body;
    if (!title_ar || !title_En || !description_ar || !description_En || !link) throw new BadRequest("All fields are required");
   const image_url = await saveBase64Image(image, Date.now().toString(), req, "popup");
    const popup = await PopupModel.create({ title_ar, title_En, description_ar, description_En, image: image_url, link });
    return SuccessResponse(res, {message: "Popup created successfully", popup});
}

export const deletePopup = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Popup id is required");
    const popup = await PopupModel.findByIdAndDelete(id);
    if (!popup) throw new NotFound("Popup not found");
    return SuccessResponse(res, {message: "Popup deleted successfully", popup});
}

export const updatePopup = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Popup id is required");
    const updateData: any = { ...req.body };

    if (req.body.image) {
        const image_url= await saveBase64Image(req.body.image, Date.now().toString(), req, "popup");
        updateData.image = image_url;
    }
    const popup = await PopupModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!popup) throw new NotFound("Popup not found");
    return SuccessResponse(res, {message: "Popup updated successfully", popup});
}