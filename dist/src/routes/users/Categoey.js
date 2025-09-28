"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Category_1 = require("../../controller/users/Category");
const route = (0, express_1.Router)();
route.get("/", Category_1.getAllCategorys);
route.get("/:id", Category_1.getCategoryById);
exports.default = route;
