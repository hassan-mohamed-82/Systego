"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOption = exports.updateOption = exports.deleteVariation = exports.updateVariation = exports.getVariationById = exports.getVariations = exports.createVariation = void 0;
const Variation_1 = require("../../models/schema/admin/Variation");
const Variation_2 = require("../../models/schema/admin/Variation");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
// Create Variation + Options
const createVariation = async (req, res) => {
    const { name, options } = req.body;
    if (!name) {
        throw new BadRequest_1.BadRequest("Variation name is required");
    }
    const existingVariation = await Variation_1.VariationModel.findOne({ name });
    if (existingVariation) {
        throw new BadRequest_1.BadRequest("Variation already exists");
    }
    let createdOptions = [];
    if (Array.isArray(options) && options.length > 0) {
        const optionDocs = options.map((opt) => {
            if (typeof opt === "string") {
                // لو مبعوت كـ string
                return { variationId: variation._id, name: opt };
            }
            else if (typeof opt === "object" && opt.name) {
                // لو مبعوت كـ object { name: "Small" }
                return {
                    variationId: variation._id,
                    name: opt.name,
                    status: opt.status ?? true,
                };
            }
        });
        createdOptions = await Variation_2.OptionModel.insertMany(optionDocs);
    }
    const variation = await Variation_1.VariationModel.create({ name });
    (0, response_1.SuccessResponse)(res, { message: "Variation created successfully", variation, createdOptions });
};
exports.createVariation = createVariation;
const getVariations = async (req, res) => {
    const variations = await Variation_1.VariationModel.find().lean();
    const populated = await Promise.all(variations.map(async (variation) => {
        const options = await Variation_2.OptionModel.find({ variationId: variation._id }).lean();
        return { ...variation, options };
    }));
    (0, response_1.SuccessResponse)(res, { message: "Get variations successfully", populated });
};
exports.getVariations = getVariations;
const getVariationById = async (req, res) => {
    const { id } = req.params;
    const variation = await Variation_1.VariationModel.findById(id).lean();
    if (!variation) {
        return res.status(404).json({ message: "Variation not found" });
    }
    const options = await Variation_2.OptionModel.find({ variationId: id }).lean();
    (0, response_1.SuccessResponse)(res, { message: "Get variation successfully", variation: { ...variation, options } });
};
exports.getVariationById = getVariationById;
const updateVariation = async (req, res) => {
    const { id } = req.params;
    const { name, options } = req.body;
    // 1. Update variation
    const variation = await Variation_1.VariationModel.findByIdAndUpdate(id, { name }, { new: true });
    // 2. Update options (هنا ممكن نمسح القديم ونضيف الجديد أو نعدل)
    if (options) {
        await Variation_2.OptionModel.deleteMany({ variationId: id });
        const optionDocs = options.map((opt) => ({
            variationId: id,
            name: opt,
        }));
        await Variation_2.OptionModel.insertMany(optionDocs);
    }
    (0, response_1.SuccessResponse)(res, { message: "Variation updated successfully", variation });
};
exports.updateVariation = updateVariation;
const deleteVariation = async (req, res) => {
    const { id } = req.params;
    await Variation_2.OptionModel.deleteMany({ variationId: id });
    await Variation_1.VariationModel.findByIdAndDelete(id);
    (0, response_1.SuccessResponse)(res, { message: "Variation deleted successfully" });
};
exports.deleteVariation = deleteVariation;
const updateOption = async (req, res) => {
    const { optionId } = req.params;
    const { name, status } = req.body;
    const option = await Variation_2.OptionModel.findByIdAndUpdate(optionId, { name, status }, { new: true });
    if (!option) {
        throw new Errors_1.NotFound("Option not found");
    }
    (0, response_1.SuccessResponse)(res, { message: "Option updated successfully", option });
};
exports.updateOption = updateOption;
const deleteOption = async (req, res) => {
    const { optionId } = req.params;
    const option = await Variation_2.OptionModel.findByIdAndDelete(optionId);
    if (!option) {
        throw new Errors_1.NotFound("Option not found");
    }
    (0, response_1.SuccessResponse)(res, { message: "Option deleted successfully" });
};
exports.deleteOption = deleteOption;
