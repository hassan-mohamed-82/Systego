"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVariationWithOptions = exports.updateVariationWithOptions = exports.getOneVariation = exports.getAllVariations = exports.createVariationWithOptions = void 0;
const Variation_1 = require("../../models/schema/admin/Variation");
const Variation_2 = require("../../models/schema/admin/Variation");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createVariationWithOptions = async (req, res) => {
    const { name, ar_name, options } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Variation name is required");
    // إنشاء الـ Variation
    const variation = await Variation_1.VariationModel.create({ name, ar_name });
    // إنشاء الـ Options لو موجودة
    if (options && Array.isArray(options)) {
        for (const opt of options) {
            await Variation_2.OptionModel.create({ variationId: variation._id, name: opt.name, status: opt.status ?? true });
        }
    }
    (0, response_1.SuccessResponse)(res, { variation });
};
exports.createVariationWithOptions = createVariationWithOptions;
const getAllVariations = async (req, res) => {
    const variations = await Variation_1.VariationModel.find().lean();
    for (const v of variations) {
        const options = await Variation_2.OptionModel.find({ variationId: v._id }).lean();
        v.options = options;
    }
    (0, response_1.SuccessResponse)(res, { variations });
};
exports.getAllVariations = getAllVariations;
const getOneVariation = async (req, res) => {
    const { id } = req.params;
    const variation = await Variation_1.VariationModel.findById(id).lean();
    if (!variation)
        throw new Errors_1.NotFound("Variation not found");
    const options = await Variation_2.OptionModel.find({ variationId: id }).lean();
    variation.options = options;
    (0, response_1.SuccessResponse)(res, { variation });
};
exports.getOneVariation = getOneVariation;
const updateVariationWithOptions = async (req, res) => {
    const { id } = req.params;
    const { name, ar_name, options } = req.body;
    const variation = await Variation_1.VariationModel.findById(id);
    if (!variation)
        throw new Errors_1.NotFound("Variation not found");
    if (name)
        variation.name = name;
    if (ar_name)
        variation.ar_name = ar_name;
    await variation.save();
    if (options && Array.isArray(options)) {
        for (const opt of options) {
            if (opt._id) {
                // تحديث Option موجود
                await Variation_2.OptionModel.findByIdAndUpdate(opt._id, { name: opt.name, status: opt.status ?? true });
            }
            else {
                // إنشاء Option جديد
                await Variation_2.OptionModel.create({ variationId: id, name: opt.name, status: opt.status ?? true });
            }
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Variation and options updated successfully" });
};
exports.updateVariationWithOptions = updateVariationWithOptions;
const deleteVariationWithOptions = async (req, res) => {
    const { id } = req.params;
    const variation = await Variation_1.VariationModel.findByIdAndDelete(id);
    if (!variation)
        throw new Errors_1.NotFound("Variation not found");
    await Variation_2.OptionModel.deleteMany({ variationId: id });
    (0, response_1.SuccessResponse)(res, { message: "Variation and all related options deleted successfully" });
};
exports.deleteVariationWithOptions = deleteVariationWithOptions;
