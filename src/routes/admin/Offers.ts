import { Router } from 'express';
import { 
    createoffers,
    getOffer,
    getOffers,
    updateoffer,
    deleteoffer
 
} from '../../controller/admin/Offers';
import { catchAsync } from '../../utils/catchAsync';
import { validate } from '../../middlewares/validation';
import {  createOfferSchema, updateOfferSchema} from '../../validation/admin/Offers';

const router = Router();

router.post("/",validate(createOfferSchema),catchAsync(createoffers));
router.get("/",catchAsync(getOffers));
router.get("/:id",catchAsync(getOffer));
router.put("/:id",validate(updateOfferSchema),catchAsync(updateoffer));
router.delete("/:id",catchAsync(deleteoffer));
export default router;