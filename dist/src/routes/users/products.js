"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_1 = require("../../controller/users/products");
const route = (0, express_1.Router)();
route.get("/", products_1.getAllProduct);
route.get("/:id", products_1.getProductById);
exports.default = route;
