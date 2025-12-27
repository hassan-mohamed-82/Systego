"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const returnPurchase_1 = require("../../controller/admin/returnPurchase");
const haspremission_1 = require("../../middlewares/haspremission");
const catchAsync_1 = require("../../utils/catchAsync");
const router = express_1.default.Router();
router.post('/purchase-for-return', (0, haspremission_1.authorizePermissions)("purchase_return", "View"), (0, catchAsync_1.catchAsync)(returnPurchase_1.getPurchaseForReturn));
router.post('/create-return', (0, haspremission_1.authorizePermissions)("purchase_return", "Add"), (0, catchAsync_1.catchAsync)(returnPurchase_1.createReturn));
router.get('/all-returns', (0, haspremission_1.authorizePermissions)("purchase_return", "View"), (0, catchAsync_1.catchAsync)(returnPurchase_1.getAllReturns));
router.get('/return-by-id/:id', (0, haspremission_1.authorizePermissions)("purchase_return", "View"), (0, catchAsync_1.catchAsync)(returnPurchase_1.getReturnById));
router.get('/purchase-returns/:id', (0, haspremission_1.authorizePermissions)("purchase_return", "View"), (0, catchAsync_1.catchAsync)(returnPurchase_1.getPurchaseReturns));
exports.default = router;
