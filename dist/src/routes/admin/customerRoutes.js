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
router.get('/countries', (0, haspremission_1.authorizePermissions)("customer", "View"), (0, catchAsync_1.catchAsync)(customer_1.getCountriesWithCities));
// Due customers route (must be before /:id)
router.get('/due', (0, haspremission_1.authorizePermissions)("customer", "View"), (0, catchAsync_1.catchAsync)(customer_1.getDueCustomers));
// Group Routes (must be before /:id to prevent "groups" being treated as customer ID)
router.post('/groups', (0, haspremission_1.authorizePermissions)("customer_group", "Add"), (0, catchAsync_1.catchAsync)(customer_1.creategroup));
router.get('/groups', (0, haspremission_1.authorizePermissions)("customer_group", "View"), (0, catchAsync_1.catchAsync)(customer_1.getallgroups));
router.get('/groups/:id', (0, haspremission_1.authorizePermissions)("customer_group", "View"), (0, catchAsync_1.catchAsync)(customer_1.getgroupbyid));
router.put('/groups/:id', (0, haspremission_1.authorizePermissions)("customer_group", "Edit"), (0, catchAsync_1.catchAsync)(customer_1.updategroup));
router.delete('/groups/:id', (0, haspremission_1.authorizePermissions)("customer_group", "Delete"), (0, catchAsync_1.catchAsync)(customer_1.deletegroup));
// Generic customer routes with :id parameter (must be LAST)
router.get('/:id', (0, haspremission_1.authorizePermissions)("customer", "View"), (0, catchAsync_1.catchAsync)(customer_1.getCustomerById));
router.put('/:id', (0, haspremission_1.authorizePermissions)("customer", "Edit"), (0, catchAsync_1.catchAsync)(customer_1.updateCustomer));
router.delete('/:id', (0, haspremission_1.authorizePermissions)("customer", "Delete"), (0, catchAsync_1.catchAsync)(customer_1.deleteCustomer));
exports.default = router;
