"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Category_1 = require("../../controller/users/Category");
const categoryRoute = (0, express_1.Router)();
categoryRoute.get("/", Category_1.getAllCategorys);
categoryRoute.get("/:id", Category_1.getCategoryById);
exports.default = categoryRoute;
