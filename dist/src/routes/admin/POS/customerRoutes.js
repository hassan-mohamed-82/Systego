"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customer_1 = require("../../../controller/admin/POS/customer");
const catchAsync_1 = require("../../../utils/catchAsync");
const haspremission_1 = require("../../../middlewares/haspremission");
const router = express_1.default.Router();
router.post('/', (0, haspremission_1.authorizePermissions)("POS", "Add"), (0, haspremission_1.authorizePermissions)("customer", "Add"), (0, catchAsync_1.catchAsync)(customer_1.createCustomer));
exports.default = router;
