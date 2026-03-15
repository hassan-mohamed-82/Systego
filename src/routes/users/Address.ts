import { Router } from 'express';
import { authenticated } from '../../middlewares/authenticated';
import { addAddress, getMyAddresses, deleteAddress, updateAddress, getAllLists } from '../../controller/users/address';
import { validate } from '../../middlewares/validation';
import { addressSchema, updateAddressSchema } from '../../validation/users/address';

const addressRoute = Router();

addressRoute.use(authenticated);

addressRoute.get("/lists", getAllLists)

addressRoute.post("/", validate(addressSchema), addAddress);
addressRoute.put("/:id", validate(updateAddressSchema), updateAddress);
addressRoute.get("/", getMyAddresses);
addressRoute.delete("/:id", deleteAddress);

export default addressRoute;