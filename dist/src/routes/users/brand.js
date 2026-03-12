"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const brand_1 = require("../../controller/users/brand");
const brandRoute = (0, express_1.Router)();
brandRoute.get("/", brand_1.getAllBrands);
brandRoute.get("/:id", brand_1.getBrandById);
exports.default = brandRoute;
