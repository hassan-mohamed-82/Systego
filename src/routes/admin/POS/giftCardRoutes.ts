import express from 'express';
import { createGiftCard, getGiftCard, redeemGiftCard, updateGiftCard, getAllGiftCards } from '../../../controller/admin/POS/giftCardController';
const router = express.Router();

router.post('/', createGiftCard);
router.get('/', getAllGiftCards);
router.get('/:id', getGiftCard);
router.put('/:id', updateGiftCard);
router.post('/:id/redeem', redeemGiftCard);

export default router;