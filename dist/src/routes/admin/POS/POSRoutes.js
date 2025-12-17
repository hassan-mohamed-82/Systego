"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const saleController_1 = require("../../../controller/admin/POS/saleController");
const catchAsync_1 = require("../../../utils/catchAsync");
const haspremission_1 = require("../../../middlewares/haspremission");
const router = express_1.default.Router();
router.post('/sales', (0, haspremission_1.authorizePermissions)("POS", "Add"), (0, catchAsync_1.catchAsync)(saleController_1.createSale));
router.get('/sales', (0, haspremission_1.authorizePermissions)("POS", "View"), (0, catchAsync_1.catchAsync)(saleController_1.getSales));
router.get('/sales/pending', (0, haspremission_1.authorizePermissions)("POS", "View"), (0, catchAsync_1.catchAsync)(saleController_1.getsalePending));
router.post('/sales/complete', (0, haspremission_1.authorizePermissions)("POS", "View"), (0, catchAsync_1.catchAsync)(saleController_1.getShiftCompletedSales));
router.get("/sales/pending/:sale_id", (0, haspremission_1.authorizePermissions)("POS", "View"), saleController_1.getSalePendingById);
router.get("/sales/dues", (0, haspremission_1.authorizePermissions)("POS", "View"), (0, catchAsync_1.catchAsync)(saleController_1.getDueSales));
router.post("/sales/pay-due", (0, haspremission_1.authorizePermissions)("POS", "Add"), (0, catchAsync_1.catchAsync)(saleController_1.payDue));
exports.default = router;
