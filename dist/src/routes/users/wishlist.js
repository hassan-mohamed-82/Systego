"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Wishlist_1 = require("../../controller/users/Wishlist");
const authenticated_1 = require("../../middlewares/authenticated");
const wishlistRoute = express_1.default.Router();
wishlistRoute.use(authenticated_1.authenticated);
wishlistRoute.post('/toggle', Wishlist_1.toggleWishlist);
wishlistRoute.get('/', Wishlist_1.getUserWishlist);
wishlistRoute.delete('/clear', Wishlist_1.clearWishlist);
exports.default = wishlistRoute;
