import { Router } from 'express';
import { getAllBrands, getBrandById } from '../../controller/users/brand';

const brandRoute = Router();

brandRoute.get("/", getAllBrands);
brandRoute.get("/:id", getBrandById);


export default brandRoute;