"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const POSHomeController_1 = require("../../../controller/admin/POS/POSHomeController");
const haspremission_1 = require("../../../middlewares/haspremission");
const router = express_1.default.Router();
router.get('/categories', (0, haspremission_1.authorizePermissions)("POS", "View"), POSHomeController_1.getAllCategorys);
router.get('/brands', (0, haspremission_1.authorizePermissions)("POS", "View"), POSHomeController_1.getAllBrands);
router.get('/cashiers', (0, haspremission_1.authorizePermissions)("POS", "View"), POSHomeController_1.getCashiers);
router.post('/cashiers/select', (0, haspremission_1.authorizePermissions)("POS", "Add"), POSHomeController_1.selectCashier);
router.get('/categories/:categoryId/products', (0, haspremission_1.authorizePermissions)("POS", "View"), POSHomeController_1.getProductsByCategory);
router.get('/brands/:brandId/products', (0, haspremission_1.authorizePermissions)("POS", "View"), POSHomeController_1.getProductsByBrand);
router.get('/selections', (0, haspremission_1.authorizePermissions)("POS", "View"), POSHomeController_1.getAllSelections);
router.get('/featured', (0, haspremission_1.authorizePermissions)("POS", "View"), POSHomeController_1.getFeaturedProducts);
exports.default = router;
