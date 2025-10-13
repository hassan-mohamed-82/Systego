"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customerGroupController_1 = require("../../../controller/admin/POS/customerGroupController");
const router = express_1.default.Router();
router.post('/', customerGroupController_1.createCustomerGroup);
exports.default = router;
