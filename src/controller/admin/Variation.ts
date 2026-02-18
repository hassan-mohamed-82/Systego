import { Request, Response } from "express";
import { VariationModel } from "../../models/schema/admin/Variation";
import { OptionModel } from "../../models/schema/admin/Variation";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { exist } from "joi";

export const createVariationWithOptions = async (req: Request, res: Response) => {

const { name, ar_name, options } = req.body;
    if (!name) throw new BadRequest("Variation name is required");

    const existVariation = await VariationModel.findOne({ name });
    if (existVariation) throw new BadRequest("Variation already exists")
    // إنشاء الـ Variation
    const variation = await VariationModel.create({ name, ar_name });

    // إنشاء الـ Options لو موجودة
    if (options && Array.isArray(options)) {
      for (const opt of options) {
        await OptionModel.create({ variationId: variation._id, name: opt.name, status: opt.status ?? true });
      }
    }

    SuccessResponse(res, { variation });
};


export const getAllVariations = async (req: Request, res: Response) => {
    const variations = await VariationModel.find().lean();

    for (const v of variations) {
      const options = await OptionModel.find({ variationId: v._id }).lean();
      (v as any).options = options;
    }

    SuccessResponse(res, { variations });
  
};



export const getOneVariation = async (req: Request, res: Response) => {
    const { id } = req.params;
    const variation = await VariationModel.findById(id).lean();
    if (!variation) throw new NotFound("Variation not found");

    const options = await OptionModel.find({ variationId: id }).lean();
    (variation as any).options = options;

    SuccessResponse(res, { variation });
  
};

export const updateVariationWithOptions = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, ar_name, options } = req.body;

  const variation = await VariationModel.findById(id);
  if (!variation) throw new NotFound("Variation not found");

  if (name !== undefined) variation.name = name;
  if (ar_name !== undefined) variation.ar_name = ar_name;
  
  await variation.save();

  if (options && Array.isArray(options)) {
    for (const opt of options) {
      if (opt._id) {
        // تحديث Option موجود
        const updateData: any = {};
        if (opt.name !== undefined) updateData.name = opt.name;
        if (opt.status !== undefined) updateData.status = opt.status;
        
        await OptionModel.findByIdAndUpdate(opt._id, updateData);
      } else {
        // إنشاء Option جديد
        await OptionModel.create({
          variationId: id,
          name: opt.name,
          status: opt.status !== undefined ? opt.status : true,
        });
      }
    }
  }

  const updatedVariation = await VariationModel.findById(id).populate("options");

  SuccessResponse(res, {
    message: "Variation and options updated successfully",
    variation: updatedVariation,
  });
};


export const deleteVariationWithOptions = async (req: Request, res: Response) => {
    const { id } = req.params;

    const variation = await VariationModel.findByIdAndDelete(id);
    if (!variation) throw new NotFound("Variation not found");

    await OptionModel.deleteMany({ variationId: id });

    SuccessResponse(res, { message: "Variation and all related options deleted successfully" });
 
};

export const deleteOption = async (req: Request, res: Response) => {
    const { id } = req.params;
    const option = await OptionModel.findByIdAndDelete(id);
    if (!option) throw new NotFound("Option not found");
    SuccessResponse(res, { message: "Option deleted successfully" });
 
};