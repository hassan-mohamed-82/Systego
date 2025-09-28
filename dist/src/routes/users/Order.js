"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Order_1 = require("../../controller/users/Order");
const authenticated_1 = require("../../middlewares/authenticated");
const router = express_1.default.Router();
router.use(authenticated_1.authenticated);
router.post('/', Order_1.createOrder);
router.get('/', Order_1.getAllOrders);
router.get('/:id', Order_1.getOrderById);
router.get('/user', Order_1.getUserOrders);
exports.default = router;
