"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteZone = exports.updateZone = exports.createZone = exports.getZoneById = exports.getZones = void 0;
const response_1 = require("../../utils/response");
const Zone_1 = require("../../models/schema/users/Zone");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors/");
const City_1 = require("../../models/schema/users/City");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const getZones = async (req, res) => {
    const zones = await Zone_1.Zone.find().populate("city", "name").populate("Warehouse");
    if (!zones || zones.length === 0)
        throw new Errors_1.NotFound("No zones found");
    (0, response_1.SuccessResponse)(res, { message: "get all zones successfully", zones });
};
exports.getZones = getZones;
const getZoneById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Zone id is required");
    const zone = await Zone_1.Zone.findById(id).populate("city", "name").populate("Warehouse");
    if (!zone)
        throw new Errors_1.NotFound("Zone not found");
    (0, response_1.SuccessResponse)(res, { message: "get zone successfully", zone });
};
exports.getZoneById = getZoneById;
const createZone = async (req, res) => {
    const { name, city, shippingCost, Warehouse } = req.body;
    if (!name || !city || shippingCost === undefined || !Warehouse)
        throw new BadRequest_1.BadRequest("Zone name, city, shippingCost and Warehouse are required");
    const check = await City_1.City.findById(city);
    if (!check)
        throw new Errors_1.NotFound("City not found");
    const sum = shippingCost + check.shippingCost;
    if (sum < 0)
        throw new BadRequest_1.BadRequest("Total shipping cost can not be negative");
    const existwarehouse = await Warehouse_1.WarehouseModel.findById(Warehouse);
    if (!existwarehouse)
        throw new Errors_1.NotFound("Warehouse not found");
    const zone = await Zone_1.Zone.create({ name, city, shippingCost: sum, Warehouse });
    (0, response_1.SuccessResponse)(res, { message: "create zone successfully", zone });
};
exports.createZone = createZone;
const updateZone = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Zone id is required");
    const updateData = { ...req.body };
    if (req.body.city) {
        const cityExists = await City_1.City.findById(req.body.city);
        if (!cityExists)
            throw new Errors_1.NotFound("City not found");
    }
    const zone = await Zone_1.Zone.findByIdAndUpdate(id, updateData, { new: true });
    if (!zone)
        throw new Errors_1.NotFound("Zone not found");
    (0, response_1.SuccessResponse)(res, { message: "update zone successfully", zone });
};
exports.updateZone = updateZone;
const deleteZone = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Zone id is required");
    const zone = await Zone_1.Zone.findByIdAndDelete(id);
    if (!zone)
        throw new Errors_1.NotFound("Zone not found");
    (0, response_1.SuccessResponse)(res, { message: "delete zone successfully", zone });
};
exports.deleteZone = deleteZone;
