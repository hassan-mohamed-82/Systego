"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePosition = exports.updatePosition = exports.getPositionById = exports.getAllPositions = exports.createPositionWithRolesAndActions = void 0;
const response_1 = require("../../utils/response");
const position_1 = require("../../models/schema/admin/position");
const roles_1 = require("../../models/schema/admin/roles");
const Action_1 = require("../../models/schema/admin/Action");
const BadRequest_1 = require("../../Errors/BadRequest");
const createPositionWithRolesAndActions = async (req, res) => {
    const { name, roles } = req.body;
    if (!name || !roles) {
        throw new BadRequest_1.BadRequest("Position name and roles are required");
    }
    const position = await position_1.PositionModel.create({ name });
    const createdRoles = [];
    for (const role of roles) {
        const newRole = await roles_1.RoleModel.create({
            positionId: position._id, // ✅ الاسم الصحيح
            name: role.name,
        });
        const createdActions = [];
        if (role.actions && role.actions.length > 0) {
            for (const actionName of role.actions) {
                const action = await Action_1.ActionModel.create({
                    roleId: newRole._id,
                    name: actionName,
                });
                createdActions.push(action);
            }
        }
        createdRoles.push({ ...newRole.toObject(), actions: createdActions });
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Position, Roles, and Actions created successfully",
        position: {
            ...position.toObject(),
            roles: createdRoles,
        },
    });
};
exports.createPositionWithRolesAndActions = createPositionWithRolesAndActions;
const getAllPositions = async (req, res, next) => {
    const positions = await position_1.PositionModel.find().lean();
    const result = [];
    for (const pos of positions) {
        const roles = await roles_1.RoleModel.find({ possitionId: pos._id }).lean();
        const rolesWithActions = [];
        for (const role of roles) {
            const actions = await Action_1.ActionModel.find({ roleId: role._id }).lean();
            rolesWithActions.push({ ...role, actions });
        }
        result.push({ ...pos, roles: rolesWithActions });
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Get all positions successfully",
        positions: result,
    });
};
exports.getAllPositions = getAllPositions;
const getPositionById = async (req, res, next) => {
    const { id } = req.params;
    const position = await position_1.PositionModel.findById(id).lean();
    if (!position)
        throw new BadRequest_1.BadRequest("Position not found");
    const roles = await roles_1.RoleModel.find({ possitionId: position._id }).lean();
    const rolesWithActions = [];
    for (const role of roles) {
        const actions = await Action_1.ActionModel.find({ roleId: role._id }).lean();
        rolesWithActions.push({ ...role, actions });
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Get position successfully",
        position: { ...position, roles: rolesWithActions },
    });
};
exports.getPositionById = getPositionById;
const updatePosition = async (req, res, next) => {
    const { id } = req.params;
    const { name, roles } = req.body;
    const position = await position_1.PositionModel.findById(id);
    if (!position)
        throw new BadRequest_1.BadRequest("Position not found");
    if (name)
        position.name = name;
    await position.save();
    if (roles) {
        for (const role of roles) {
            let roleDoc = await roles_1.RoleModel.findOne({ possitionId: id, name: role.name });
            if (!roleDoc) {
                roleDoc = await roles_1.RoleModel.create({ possitionId: id, name: role.name });
            }
            if (role.actions) {
                await Action_1.ActionModel.deleteMany({ roleId: roleDoc._id }); // clear old actions
                for (const actionName of role.actions) {
                    await Action_1.ActionModel.create({ roleId: roleDoc._id, name: actionName });
                }
            }
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Position updated successfully" });
};
exports.updatePosition = updatePosition;
const deletePosition = async (req, res, next) => {
    const { id } = req.params;
    const position = await position_1.PositionModel.findByIdAndDelete(id);
    if (!position)
        throw new BadRequest_1.BadRequest("Position not found");
    const roles = await roles_1.RoleModel.find({ possitionId: id });
    for (const role of roles) {
        await Action_1.ActionModel.deleteMany({ roleId: role._id });
    }
    await roles_1.RoleModel.deleteMany({ possitionId: id });
    (0, response_1.SuccessResponse)(res, { message: "Position and related Roles & Actions deleted successfully" });
};
exports.deletePosition = deletePosition;
