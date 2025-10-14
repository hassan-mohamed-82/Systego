"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const saleController_1 = require("../../../controller/admin/POS/saleController");
const router = express_1.default.Router();
router.post('/sales', saleController_1.createSale);
router.get('/sales/:saleId', saleController_1.getSaleById);
router.get('/sales', saleController_1.getAllSales);
router.get('/sales/status/:status', saleController_1.getSalesByStatus);
router.put('/sales/:saleId/status', saleController_1.updateSaleStatus);
exports.default = router;
