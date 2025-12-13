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
import {authorizePermissions} from "../../middlewares/haspremission"

const router = Router();

router.post("/",authorizePermissions("offer","Add"),validate(createOfferSchema),catchAsync(createoffers));
router.get("/",authorizePermissions("offer","View"),catchAsync(getOffers));
router.get("/:id",authorizePermissions("offer","View"),catchAsync(getOffer));
router.put("/:id",authorizePermissions("offer","Edit"),validate(updateOfferSchema),catchAsync(updateoffer));
router.delete("/:id",authorizePermissions("offer","Delete"),catchAsync(deleteoffer));
export default router;