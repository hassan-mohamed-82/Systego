"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Geidea_1 = require("../../controller/admin/Geidea");
const geideaRoute = (0, express_1.Router)();
geideaRoute.post("/", Geidea_1.addOrUpdateGeideaConfig);
geideaRoute.get("/", Geidea_1.getGeideaConfig);
geideaRoute.delete("/", Geidea_1.deleteGeideaConfig);
exports.default = geideaRoute;
