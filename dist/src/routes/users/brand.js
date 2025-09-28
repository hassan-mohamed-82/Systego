"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const brand_1 = require("../../controller/users/brand");
const route = (0, express_1.Router)();
route.get("/", brand_1.getAllBrands);
route.get("/:id", brand_1.getBrandById);
exports.default = route;
