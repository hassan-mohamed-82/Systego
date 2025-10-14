"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ReturnSaleController_1 = require("../../../controller/admin/POS/ReturnSaleController");
const router = express_1.default.Router();
router.post('/', ReturnSaleController_1.createReturnSale);
router.get('/', ReturnSaleController_1.getAllReturnSales);
router.get('/:id', ReturnSaleController_1.getReturnSaleById);
router.delete('/:id', ReturnSaleController_1.deleteReturnSale);
exports.default = router;
