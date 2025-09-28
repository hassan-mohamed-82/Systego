import { Router } from 'express';
import { getAllBrands, getBrandById} from '../../controller/users/brand';

const route = Router();

route.get("/", getAllBrands);

route.get("/:id", getBrandById);


export default route;