"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const POSHomeController_1 = require("../../../controller/admin/POS/POSHomeController");
const router = express_1.default.Router();
router.get('/categories', POSHomeController_1.getAllCategorys);
router.get('/brands', POSHomeController_1.getAllBrands);
router.get('/cashiers', POSHomeController_1.getCashiers);
router.post('/cashiers/select', POSHomeController_1.selectCashier);
router.get('/brands/:brandId/products', POSHomeController_1.getProductsByBrand);
router.get('/selections', POSHomeController_1.getAllSelections);
router.get('/featured', POSHomeController_1.getFeaturedProducts);
exports.default = router;
