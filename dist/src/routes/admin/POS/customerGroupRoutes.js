"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customerGroupController_1 = require("../../../controller/admin/POS/customerGroupController");
const catchAsync_1 = require("../../../utils/catchAsync");
const router = express_1.default.Router();
router.post('/', (0, catchAsync_1.catchAsync)(customerGroupController_1.createCustomerGroup));
exports.default = router;
