import { Request, Response } from "express";
import {DepartmentModel  } from "../../models/schema/admin/departments";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const createDepartment = async (req: Request, res: Response) => {
    const { name, description } = req.body;
    if (!name) {
  throw new BadRequest("Department name is required");
}
if (!description) {
  throw new BadRequest("Department description is required");
}

    const department = await DepartmentModel.create({ name, description });
    SuccessResponse(res, { message: "create department successfully", department });
};

export const getAllDepartments = async (req: Request, res: Response) => {
    const departments = await DepartmentModel.find({});
  if(!departments || departments.length === 0) throw new NotFound("No departments found");
    SuccessResponse(res, { message: "Get all departments successfully", departments });
};

export const getDepartmentById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Department ID is required");
    const department = await DepartmentModel.findById(id);
    if (!department) throw new NotFound("Department not found");
    SuccessResponse(res, { message: "Get department successfully", department });
};

export const updateDepartment = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Department ID is required");
    const department = await DepartmentModel.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!department) throw new NotFound("Department not found");
    SuccessResponse(res, { message: "Update department successfully", department });
  };

  export const deleteDepartment = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Department ID is required");
    const department = await DepartmentModel.findByIdAndDelete(id);
    if (!department) throw new NotFound("Department not found");
    SuccessResponse(res, { message: "Delete department successfully" });
  };