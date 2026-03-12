"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_1 = require("../../controller/users/products");
const productRoute = (0, express_1.Router)();
productRoute.get('/', products_1.getAllProducts);
productRoute.get('/:id', products_1.getProductById);
exports.default = productRoute;
