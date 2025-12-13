"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const giftCardController_1 = require("../../../controller/admin/POS/giftCardController");
const haspremission_1 = require("../../../middlewares/haspremission");
const router = express_1.default.Router();
router.post('/', (0, haspremission_1.authorizePermissions)("POS", "Add"), (0, haspremission_1.authorizePermissions)("gift_card", "Add"), giftCardController_1.createGiftCard);
router.get('/', (0, haspremission_1.authorizePermissions)("POS", "View"), (0, haspremission_1.authorizePermissions)("gift_card", "View"), giftCardController_1.getAllGiftCards);
router.get('/:id', (0, haspremission_1.authorizePermissions)("POS", "View"), (0, haspremission_1.authorizePermissions)("gift_card", "View"), giftCardController_1.getGiftCard);
router.put('/:id', (0, haspremission_1.authorizePermissions)("POS", "Edit"), (0, haspremission_1.authorizePermissions)("gift_card", "Edit"), giftCardController_1.updateGiftCard);
router.post('/:id/redeem', (0, haspremission_1.authorizePermissions)("POS", "Edit"), (0, haspremission_1.authorizePermissions)("gift_card", "Edit"), giftCardController_1.redeemGiftCard);
exports.default = router;
