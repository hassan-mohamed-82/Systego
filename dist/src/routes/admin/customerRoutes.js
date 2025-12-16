"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const haspremission_1 = require("../../middlewares/haspremission");
const customer_1 = require("../../controller/admin/customer");
const catchAsync_1 = require("../../utils/catchAsync");
const router = express_1.default.Router();
router.post('/', (0, haspremission_1.authorizePermissions)("POS", "Add"), (0, haspremission_1.authorizePermissions)("customer", "Add"), (0, catchAsync_1.catchAsync)(customer_1.createCustomer));
router.get('/', (0, haspremission_1.authorizePermissions)("customer", "View"), (0, catchAsync_1.catchAsync)(customer_1.getCustomers));
router.get('/:id', (0, haspremission_1.authorizePermissions)("customer", "View"), (0, catchAsync_1.catchAsync)(customer_1.getCustomerById));
router.get('/due', (0, haspremission_1.authorizePermissions)("customer", "View"), (0, catchAsync_1.catchAsync)(customer_1.getDueCustomers));
router.put('/:id', (0, haspremission_1.authorizePermissions)("customer", "Edit"), (0, catchAsync_1.catchAsync)(customer_1.updateCustomer));
router.delete('/:id', (0, haspremission_1.authorizePermissions)("customer", "Delete"), (0, catchAsync_1.catchAsync)(customer_1.deleteCustomer));
exports.default = router;
