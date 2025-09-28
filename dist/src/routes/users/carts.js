"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Cart_1 = require("../../controller/users/Cart");
const authenticated_1 = require("../../middlewares/authenticated");
const router = express_1.default.Router();
router.use(authenticated_1.authenticated);
router.get('/', Cart_1.getCart);
router.post('/add', Cart_1.addToCart);
router.put('/update', Cart_1.updateCartItem);
router.delete('/remove', Cart_1.removeFromCart);
router.delete('/clear', Cart_1.clearCart);
exports.default = router;
