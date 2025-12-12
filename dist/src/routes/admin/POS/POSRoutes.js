"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const saleController_1 = require("../../../controller/admin/POS/saleController");
const catchAsync_1 = require("../../../utils/catchAsync");
const router = express_1.default.Router();
router.post('/sales', (0, catchAsync_1.catchAsync)(saleController_1.createSale));
router.get('/sales', (0, catchAsync_1.catchAsync)(saleController_1.getSales));
router.get('/sales/pending', (0, catchAsync_1.catchAsync)(saleController_1.getsalePending));
router.get('/sales/complete', (0, catchAsync_1.catchAsync)(saleController_1.getsaleunPending));
router.get("/sales/pending/:sale_id", saleController_1.getSalePendingById);
exports.default = router;
