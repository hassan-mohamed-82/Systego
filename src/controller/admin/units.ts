import { Request, Response } from "express";
import { UnitModel } from "../../models/schema/admin/units";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { SuccessResponse } from "../../utils/response";

// إنشاء وحدة جديدة
export const createUnit = async (req: Request, res: Response) => {
  const { code, name, ar_name, base_unit, operator, operator_value, is_base_unit } = req.body;

  if (!code || !name || !ar_name) {
    throw new BadRequest("code, name and ar_name are required");
  }

  // لو مش base unit لازم يكون فيه base_unit و operator_value
  if (!is_base_unit && !base_unit) {
    throw new BadRequest("base_unit is required for non-base units");
  }

  const existingUnit = await UnitModel.findOne({ 
    $or: [{ code }, { name }] 
  });
  if (existingUnit) throw new BadRequest("Unit already exists");

  // لو فيه base_unit، تأكد إنها موجودة
  if (base_unit) {
    const baseUnitExists = await UnitModel.findById(base_unit);
    if (!baseUnitExists) throw new NotFound("Base unit not found");
  }

  const unit = await UnitModel.create({
    code,
    name,
    ar_name,
    base_unit: is_base_unit ? null : base_unit,
    operator: operator || "*",
    operator_value: operator_value || 1,
    is_base_unit: is_base_unit || false,
    status: true
  });

  SuccessResponse(res, { 
    message: "Unit created successfully", 
    unit 
  });
};

// جلب كل الوحدات
export const getUnits = async (req: Request, res: Response) => {
  const units = await UnitModel.find()
    .populate("base_unit", "name ar_name code")
    .sort({ is_base_unit: -1, createdAt: -1 });

  SuccessResponse(res, { units });
};

// جلب الوحدات النشطة فقط
export const getActiveUnits = async (req: Request, res: Response) => {
  const units = await UnitModel.find({ status: true })
    .populate("base_unit", "name ar_name code");

  SuccessResponse(res, { units });
};

// جلب الوحدات الأساسية فقط (للاختيار منها)
export const getBaseUnits = async (req: Request, res: Response) => {
  const units = await UnitModel.find({ 
    is_base_unit: true, 
    status: true 
  });

  SuccessResponse(res, { units });
};

// جلب وحدة بالـ ID
export const getUnitById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const unit = await UnitModel.findById(id)
    .populate("base_unit", "name ar_name code");
    
  if (!unit) throw new NotFound("Unit not found");

  const baseUnits = await UnitModel.find({ is_base_unit: true });

  SuccessResponse(res, { unit, baseUnits });
};

// تحديث وحدة
export const updateUnit = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { code, name, ar_name, base_unit, operator, operator_value, is_base_unit, status } = req.body;

  const unit = await UnitModel.findById(id);
  if (!unit) throw new NotFound("Unit not found");

  // لو فيه base_unit جديد، تأكد إنه موجود
  if (base_unit) {
    const baseUnitExists = await UnitModel.findById(base_unit);
    if (!baseUnitExists) throw new NotFound("Base unit not found");
  }

  if (code !== undefined) unit.code = code;
  if (name !== undefined) unit.name = name;
  if (ar_name !== undefined) unit.ar_name = ar_name;
  if (base_unit !== undefined) unit.base_unit = base_unit;
  if (operator !== undefined) unit.operator = operator;
  if (operator_value !== undefined) unit.operator_value = operator_value;
  if (is_base_unit !== undefined) unit.is_base_unit = is_base_unit;
  if (status !== undefined) unit.status = status;

  await unit.save();

  SuccessResponse(res, { 
    message: "Unit updated successfully", 
    unit 
  });
};

// حذف وحدة
export const deleteUnit = async (req: Request, res: Response) => {
  const { id } = req.params;

  // تأكد إن مفيش وحدات تانية بتعتمد عليها
  const dependentUnits = await UnitModel.find({ base_unit: id });
  if (dependentUnits.length > 0) {
    throw new BadRequest("Cannot delete: Other units depend on this unit");
  }

  const unit = await UnitModel.findByIdAndDelete(id);
  if (!unit) throw new NotFound("Unit not found");

  SuccessResponse(res, { message: "Unit deleted successfully" });
};

// حذف عدة وحدات
export const deleteManyUnits = async (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new BadRequest("At least one unit ID is required");
  }

  // تأكد إن مفيش وحدات تانية بتعتمد عليهم
  const dependentUnits = await UnitModel.find({ base_unit: { $in: ids } });
  if (dependentUnits.length > 0) {
    throw new BadRequest("Cannot delete: Other units depend on these units");
  }

  const result = await UnitModel.deleteMany({ _id: { $in: ids } });

  SuccessResponse(res, { 
    message: "Units deleted successfully",
    deletedCount: result.deletedCount
  });
};

// تحويل من وحدة لوحدة (Helper Function)
export const convertUnit = async (req: Request, res: Response) => {
  const { from_unit_id, to_unit_id, quantity } = req.body;

  if (!from_unit_id || !to_unit_id || quantity == null) {
    throw new BadRequest("from_unit_id, to_unit_id and quantity are required");
  }

  const fromUnit = await UnitModel.findById(from_unit_id);
  const toUnit = await UnitModel.findById(to_unit_id);

  if (!fromUnit || !toUnit) throw new NotFound("Unit not found");

  // حساب التحويل
  let result = quantity;

  // تحويل للـ base unit أولاً
  if (!fromUnit.is_base_unit) {
    if (fromUnit.operator === "*") {
      result = result * fromUnit.operator_value;
    } else {
      result = result / fromUnit.operator_value;
    }
  }

  // تحويل من الـ base unit للوحدة المطلوبة
  if (!toUnit.is_base_unit) {
    if (toUnit.operator === "*") {
      result = result / toUnit.operator_value;
    } else {
      result = result * toUnit.operator_value;
    }
  }

  SuccessResponse(res, {
    from: { unit: fromUnit.name, quantity },
    to: { unit: toUnit.name, quantity: result }
  });
};
