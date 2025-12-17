"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ReturnSaleController_1 = require("../../../controller/admin/POS/ReturnSaleController");
const haspremission_1 = require("../../../middlewares/haspremission");
const catchAsync_1 = require("../../../utils/catchAsync");
const router = express_1.default.Router();
router.post('/sale-for-return', (0, haspremission_1.authorizePermissions)("POS", "View"), (0, catchAsync_1.catchAsync)(ReturnSaleController_1.getSaleForReturn));
router.post('/create-return', (0, haspremission_1.authorizePermissions)("POS", "Add"), (0, catchAsync_1.catchAsync)(ReturnSaleController_1.createReturn));
router.get('/all-returns', (0, haspremission_1.authorizePermissions)("POS", "View"), (0, catchAsync_1.catchAsync)(ReturnSaleController_1.getAllReturns));
router.get('/return-by-id', (0, haspremission_1.authorizePermissions)("POS", "View"), (0, catchAsync_1.catchAsync)(ReturnSaleController_1.getReturnById));
router.get('/sale-returns', (0, haspremission_1.authorizePermissions)("POS", "View"), (0, catchAsync_1.catchAsync)(ReturnSaleController_1.getSaleReturns));
exports.default = router;
