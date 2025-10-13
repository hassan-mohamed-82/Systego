"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customer_1 = require("../../../controller/admin/POS/customer");
const router = express_1.default.Router();
router.post('/', customer_1.createCustomer);
exports.default = router;
