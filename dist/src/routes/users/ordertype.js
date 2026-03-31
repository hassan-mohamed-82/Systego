"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ordertype_1 = require("../../controller/users/ordertype");
const router = (0, express_1.Router)();
router.get("/", ordertype_1.getOrderTypes);
exports.default = router;
