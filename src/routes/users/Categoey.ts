import { Router } from 'express';
import { getAllCategorys, getCategoryById} from '../../controller/users/Category'

const route = Router();

route.get("/", getAllCategorys);

route.get("/:id", getCategoryById);


export default route;