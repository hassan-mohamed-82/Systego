import { Request, Response } from "express";
import { VariationModel } from "../../models/schema/admin/Variation";
import { OptionModel } from "../../models/schema/admin/Variation";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import {  Types } from "mongoose";
import { IOption } from "../../models/schema/admin/Variation";

// Create Variation + Options
export const createVariation = async (req: Request, res: Response) => {
  const { name, options } = req.body;
    if (!name) {
      throw new BadRequest("Variation name is required");
    }

    const existingVariation = await VariationModel.findOne({ name });
    if (existingVariation) {
      throw new BadRequest("Variation already exists");
    }


    let createdOptions: IOption[] = [];
    if (Array.isArray(options) && options.length > 0) {
      const optionDocs = options.map((opt) => {
        if (typeof opt === "string") {
          // لو مبعوت كـ string
          return { variationId: variation._id, name: opt };
        } else if (typeof opt === "object" && opt.name) {
          // لو مبعوت كـ object { name: "Small" }
          return {
            variationId: variation._id,
            name: opt.name,
            status: opt.status ?? true,
          };
        }
      });
      createdOptions = await OptionModel.insertMany(optionDocs);
    }
    const variation = await VariationModel.create({ name });


    SuccessResponse(res, { message: "Variation created successfully", variation, createdOptions });  
};




export const getVariations = async (req: Request, res: Response) => {
    const variations = await VariationModel.find().lean();

    const populated = await Promise.all(
      variations.map(async (variation) => {
        const options = await OptionModel.find({ variationId: variation._id }).lean();
        return { ...variation, options };
      })
    );

    SuccessResponse(res, { message: "Get variations successfully", populated });
  
};



export const getVariationById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const variation = await VariationModel.findById(id).lean();
    if (!variation) {
      return res.status(404).json({ message: "Variation not found" });
    }

    const options = await OptionModel.find({ variationId: id }).lean();

    SuccessResponse(res, { message: "Get variation successfully", variation: { ...variation, options } });
  
};


export const updateVariation = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, options } = req.body;

    // 1. Update variation
    const variation = await VariationModel.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    // 2. Update options (هنا ممكن نمسح القديم ونضيف الجديد أو نعدل)
    if (options) {
      await OptionModel.deleteMany({ variationId: id });
      const optionDocs = options.map((opt: string) => ({
       variationId: id,
      name: opt,
        }));
      await OptionModel.insertMany(optionDocs);
    }

    SuccessResponse(res, { message: "Variation updated successfully", variation });
  
};



export const deleteVariation = async (req: Request, res: Response) => {
    const { id } = req.params;

    await OptionModel.deleteMany({ variationId: id });
    await VariationModel.findByIdAndDelete(id);

    SuccessResponse(res, { message: "Variation deleted successfully" }); 
};

export const updateOption = async (req: Request, res: Response) => {
  const { optionId } = req.params;
  const { name, status } = req.body;

  const option = await OptionModel.findByIdAndUpdate(
    optionId,
    { name, status },
    { new: true }
  );

  if (!option) {
    throw new NotFound("Option not found");
  }

  SuccessResponse(res, { message: "Option updated successfully", option });
};

export const deleteOption = async (req: Request, res: Response) => {
  const { optionId } = req.params;

  const option = await OptionModel.findByIdAndDelete(optionId);

  if (!option) {
    throw new NotFound("Option not found");
  }

  SuccessResponse(res, { message: "Option deleted successfully" });
};
