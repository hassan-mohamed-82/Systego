"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Wishlist_1 = require("../../controller/users/Wishlist");
const authenticated_1 = require("../../middlewares/authenticated");
const router = express_1.default.Router();
router.use(authenticated_1.authenticated);
router.post('/add', Wishlist_1.addProductToWishlist);
router.delete('/remove', Wishlist_1.removeProductFromWishlist);
router.get('/', Wishlist_1.getUserWishlist);
router.get('/check/:productId', Wishlist_1.checkProductInWishlist);
router.delete('/clear', Wishlist_1.clearWishlist);
exports.default = router;
