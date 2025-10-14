import { UnauthorizedError } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { NextFunction, Request, Response } from "express";
import { PositionModel } from "../../models/schema/admin/position";
import { RoleModel } from "../../models/schema/admin/roles";
import { ActionModel } from "../../models/schema/admin/Action";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";

export const createPositionWithRolesAndActions = async (req: Request,res: Response,) => {
  const { name, roles } = req.body;

  if (!name || !roles) {
    throw new BadRequest("Position name and roles are required");
  }

  const position = await PositionModel.create({ name });

  const createdRoles = [];

  for (const role of roles) {
    const newRole = await RoleModel.create({
  positionId: position._id,
  name: role.name,
});


    const createdActions = [];
    if (role.actions && role.actions.length > 0) {
      for (const actionName of role.actions) {
        const action = await ActionModel.create({
          roleId: newRole._id,
          name: actionName,
        });
        createdActions.push(action);
      }
    }

    createdRoles.push({ ...newRole.toObject(), actions: createdActions });
  }

  SuccessResponse(res, {
    message: "Position, Roles, and Actions created successfully",
    position: {
      ...position.toObject(),
      roles: createdRoles,
    },
  });
};

export const getAllPositions = async (req: Request, res: Response, next: NextFunction) => {
  const positions = await PositionModel.find().lean();

  const result = [];
  for (const pos of positions) {
    const roles = await RoleModel.find({ possitionId: pos._id }).lean();

    const rolesWithActions = [];
    for (const role of roles) {
      const actions = await ActionModel.find({ roleId: role._id }).lean();
      rolesWithActions.push({ ...role, actions });
    }

    result.push({ ...pos, roles: rolesWithActions });
  }

  SuccessResponse(res, {
    message: "Get all positions successfully",
    positions: result,
  });
};

export const getPositionById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const position = await PositionModel.findById(id).lean();
  if (!position) throw new BadRequest("Position not found");

  const roles = await RoleModel.find({ possitionId: position._id }).lean();

  const rolesWithActions = [];
  for (const role of roles) {
    const actions = await ActionModel.find({ roleId: role._id }).lean();
    rolesWithActions.push({ ...role, actions });
  }

  SuccessResponse(res, {
    message: "Get position successfully",
    position: { ...position, roles: rolesWithActions },
  });
};

export const updatePosition = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, roles } = req.body;

  const position = await PositionModel.findById(id);
  if (!position) throw new BadRequest("Position not found");

  if (name) position.name = name;
  await position.save();

  if (roles) {
    for (const role of roles) {
      let roleDoc = await RoleModel.findOne({ possitionId: id, name: role.name });

      if (!roleDoc) {
        roleDoc = await RoleModel.create({ possitionId: id, name: role.name });
      }

      if (role.actions) {
        await ActionModel.deleteMany({ roleId: roleDoc._id }); // clear old actions
        for (const actionName of role.actions) {
          await ActionModel.create({ roleId: roleDoc._id, name: actionName });
        }
      }
    }
  }

  SuccessResponse(res, { message: "Position updated successfully" });
};


export const deletePosition = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const position = await PositionModel.findByIdAndDelete(id);
  if (!position) throw new BadRequest("Position not found");

  const roles = await RoleModel.find({ possitionId: id });
  for (const role of roles) {
    await ActionModel.deleteMany({ roleId: role._id });
  }

  await RoleModel.deleteMany({ possitionId: id });

  SuccessResponse(res, { message: "Position and related Roles & Actions deleted successfully" });
};
