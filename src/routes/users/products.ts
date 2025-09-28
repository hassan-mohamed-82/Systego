import { Router } from 'express';
import { getAllProduct, getProductById} from '../../controller/users/products'

const route = Router();

route.get("/", getAllProduct);

route.get("/:id", getProductById);


export default route;