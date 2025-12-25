"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customerGroupController_1 = require("../../../controller/admin/POS/customerGroupController");
const catchAsync_1 = require("../../../utils/catchAsync");
const haspremission_1 = require("../../../middlewares/haspremission");
const router = express_1.default.Router();
router.post('/', (0, haspremission_1.authorizePermissions)("POS", "Add"), (0, haspremission_1.authorizePermissions)("customer_group", "Add"), (0, catchAsync_1.catchAsync)(customerGroupController_1.createCustomerGroup));
router.get('/', (0, haspremission_1.authorizePermissions)("customer_group", "View"), (0, catchAsync_1.catchAsync)(customerGroupController_1.getallgroups));
router.get('/customers', (0, haspremission_1.authorizePermissions)("customer_group", "View"), (0, catchAsync_1.catchAsync)(customerGroupController_1.getCustomers));
router.post('/customer', (0, haspremission_1.authorizePermissions)("POS", "Add"), (0, haspremission_1.authorizePermissions)("customer", "Add"), (0, catchAsync_1.catchAsync)(customerGroupController_1.createCustomer));
exports.default = router;
