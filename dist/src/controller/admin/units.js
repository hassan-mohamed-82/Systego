"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertUnit = exports.deleteManyUnits = exports.deleteUnit = exports.updateUnit = exports.getUnitById = exports.getBaseUnits = exports.getActiveUnits = exports.getUnits = exports.createUnit = void 0;
const units_1 = require("../../models/schema/admin/units");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
// إنشاء وحدة جديدة
const createUnit = async (req, res) => {
    const { code, name, ar_name, base_unit, operator, operator_value, is_base_unit } = req.body;
    if (!code || !name || !ar_name) {
        throw new BadRequest_1.BadRequest("code, name and ar_name are required");
    }
    // لو مش base unit لازم يكون فيه base_unit و operator_value
    if (!is_base_unit && !base_unit) {
        throw new BadRequest_1.BadRequest("base_unit is required for non-base units");
    }
    const existingUnit = await units_1.UnitModel.findOne({
        $or: [{ code }, { name }]
    });
    if (existingUnit)
        throw new BadRequest_1.BadRequest("Unit already exists");
    // لو فيه base_unit، تأكد إنها موجودة
    if (base_unit) {
        const baseUnitExists = await units_1.UnitModel.findById(base_unit);
        if (!baseUnitExists)
            throw new NotFound_1.NotFound("Base unit not found");
    }
    const unit = await units_1.UnitModel.create({
        code,
        name,
        ar_name,
        base_unit: is_base_unit ? null : base_unit,
        operator: operator || "*",
        operator_value: operator_value || 1,
        is_base_unit: is_base_unit || false,
        status: true
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Unit created successfully",
        unit
    });
};
exports.createUnit = createUnit;
// جلب كل الوحدات
const getUnits = async (req, res) => {
    const units = await units_1.UnitModel.find()
        .populate("base_unit", "name ar_name code")
        .sort({ is_base_unit: -1, createdAt: -1 });
    (0, response_1.SuccessResponse)(res, { units });
};
exports.getUnits = getUnits;
// جلب الوحدات النشطة فقط
const getActiveUnits = async (req, res) => {
    const units = await units_1.UnitModel.find({ status: true })
        .populate("base_unit", "name ar_name code");
    (0, response_1.SuccessResponse)(res, { units });
};
exports.getActiveUnits = getActiveUnits;
// جلب الوحدات الأساسية فقط (للاختيار منها)
const getBaseUnits = async (req, res) => {
    const units = await units_1.UnitModel.find({
        is_base_unit: true,
        status: true
    });
    (0, response_1.SuccessResponse)(res, { units });
};
exports.getBaseUnits = getBaseUnits;
// جلب وحدة بالـ ID
const getUnitById = async (req, res) => {
    const { id } = req.params;
    const unit = await units_1.UnitModel.findById(id)
        .populate("base_unit", "name ar_name code");
    if (!unit)
        throw new NotFound_1.NotFound("Unit not found");
    const baseUnits = await units_1.UnitModel.find({ is_base_unit: true });
    (0, response_1.SuccessResponse)(res, { unit, baseUnits });
};
exports.getUnitById = getUnitById;
// تحديث وحدة
const updateUnit = async (req, res) => {
    const { id } = req.params;
    const { code, name, ar_name, base_unit, operator, operator_value, is_base_unit, status } = req.body;
    const unit = await units_1.UnitModel.findById(id);
    if (!unit)
        throw new NotFound_1.NotFound("Unit not found");
    // لو فيه base_unit جديد، تأكد إنه موجود
    if (base_unit) {
        const baseUnitExists = await units_1.UnitModel.findById(base_unit);
        if (!baseUnitExists)
            throw new NotFound_1.NotFound("Base unit not found");
    }
    if (code !== undefined)
        unit.code = code;
    if (name !== undefined)
        unit.name = name;
    if (ar_name !== undefined)
        unit.ar_name = ar_name;
    if (base_unit !== undefined)
        unit.base_unit = base_unit;
    if (operator !== undefined)
        unit.operator = operator;
    if (operator_value !== undefined)
        unit.operator_value = operator_value;
    if (is_base_unit !== undefined)
        unit.is_base_unit = is_base_unit;
    if (status !== undefined)
        unit.status = status;
    await unit.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Unit updated successfully",
        unit
    });
};
exports.updateUnit = updateUnit;
// حذف وحدة
const deleteUnit = async (req, res) => {
    const { id } = req.params;
    // تأكد إن مفيش وحدات تانية بتعتمد عليها
    const dependentUnits = await units_1.UnitModel.find({ base_unit: id });
    if (dependentUnits.length > 0) {
        throw new BadRequest_1.BadRequest("Cannot delete: Other units depend on this unit");
    }
    const unit = await units_1.UnitModel.findByIdAndDelete(id);
    if (!unit)
        throw new NotFound_1.NotFound("Unit not found");
    (0, response_1.SuccessResponse)(res, { message: "Unit deleted successfully" });
};
exports.deleteUnit = deleteUnit;
// حذف عدة وحدات
const deleteManyUnits = async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new BadRequest_1.BadRequest("At least one unit ID is required");
    }
    // تأكد إن مفيش وحدات تانية بتعتمد عليهم
    const dependentUnits = await units_1.UnitModel.find({ base_unit: { $in: ids } });
    if (dependentUnits.length > 0) {
        throw new BadRequest_1.BadRequest("Cannot delete: Other units depend on these units");
    }
    const result = await units_1.UnitModel.deleteMany({ _id: { $in: ids } });
    (0, response_1.SuccessResponse)(res, {
        message: "Units deleted successfully",
        deletedCount: result.deletedCount
    });
};
exports.deleteManyUnits = deleteManyUnits;
// تحويل من وحدة لوحدة (Helper Function)
const convertUnit = async (req, res) => {
    const { from_unit_id, to_unit_id, quantity } = req.body;
    if (!from_unit_id || !to_unit_id || quantity == null) {
        throw new BadRequest_1.BadRequest("from_unit_id, to_unit_id and quantity are required");
    }
    const fromUnit = await units_1.UnitModel.findById(from_unit_id);
    const toUnit = await units_1.UnitModel.findById(to_unit_id);
    if (!fromUnit || !toUnit)
        throw new NotFound_1.NotFound("Unit not found");
    // حساب التحويل
    let result = quantity;
    // تحويل للـ base unit أولاً
    if (!fromUnit.is_base_unit) {
        if (fromUnit.operator === "*") {
            result = result * fromUnit.operator_value;
        }
        else {
            result = result / fromUnit.operator_value;
        }
    }
    // تحويل من الـ base unit للوحدة المطلوبة
    if (!toUnit.is_base_unit) {
        if (toUnit.operator === "*") {
            result = result / toUnit.operator_value;
        }
        else {
            result = result * toUnit.operator_value;
        }
    }
    (0, response_1.SuccessResponse)(res, {
        from: { unit: fromUnit.name, quantity },
        to: { unit: toUnit.name, quantity: result }
    });
};
exports.convertUnit = convertUnit;
