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
router.get('/categories/:categoryId/products', POSHomeController_1.getProductsByCategory);
router.get('/brands/:brandId/products', POSHomeController_1.getProductsByBrand);
router.get('/selections', POSHomeController_1.getAllSelections);
exports.default = router;
