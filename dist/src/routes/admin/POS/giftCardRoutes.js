"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const giftCardController_1 = require("../../../controller/admin/POS/giftCardController");
const router = express_1.default.Router();
router.post('/', giftCardController_1.createGiftCard);
router.get('/', giftCardController_1.getAllGiftCards);
router.get('/:id', giftCardController_1.getGiftCard);
router.put('/:id', giftCardController_1.updateGiftCard);
router.post('/:id/redeem', giftCardController_1.redeemGiftCard);
exports.default = router;
