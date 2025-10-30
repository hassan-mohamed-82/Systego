"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.getDepartmentById = exports.getAllDepartments = exports.createDepartment = void 0;
const departments_1 = require("../../models/schema/admin/departments");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createDepartment = async (req, res) => {
    const { name, description, ar_name, ar_description } = req.body;
    if (!name) {
        throw new BadRequest_1.BadRequest("Department name is required");
    }
    if (!description) {
        throw new BadRequest_1.BadRequest("Department description is required");
    }
    const existingDepartment = await departments_1.DepartmentModel.findOne({ name });
    if (existingDepartment)
        throw new BadRequest_1.BadRequest("Department already exists");
    const department = await departments_1.DepartmentModel.create({ name, description, ar_name, ar_description });
    (0, response_1.SuccessResponse)(res, { message: "create department successfully", department });
};
exports.createDepartment = createDepartment;
const getAllDepartments = async (req, res) => {
    const departments = await departments_1.DepartmentModel.find({});
    if (!departments || departments.length === 0)
        throw new Errors_1.NotFound("No departments found");
    (0, response_1.SuccessResponse)(res, { message: "Get all departments successfully", departments });
};
exports.getAllDepartments = getAllDepartments;
const getDepartmentById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Department ID is required");
    const department = await departments_1.DepartmentModel.findById(id);
    if (!department)
        throw new Errors_1.NotFound("Department not found");
    (0, response_1.SuccessResponse)(res, { message: "Get department successfully", department });
};
exports.getDepartmentById = getDepartmentById;
const updateDepartment = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Department ID is required");
    const department = await departments_1.DepartmentModel.findByIdAndUpdate(id, req.body, {
        new: true,
    });
    if (!department)
        throw new Errors_1.NotFound("Department not found");
    (0, response_1.SuccessResponse)(res, { message: "Update department successfully", department });
};
exports.updateDepartment = updateDepartment;
const deleteDepartment = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Department ID is required");
    const department = await departments_1.DepartmentModel.findByIdAndDelete(id);
    if (!department)
        throw new Errors_1.NotFound("Department not found");
    (0, response_1.SuccessResponse)(res, { message: "Delete department successfully" });
};
exports.deleteDepartment = deleteDepartment;
