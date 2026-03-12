import { Router } from 'express';
import { getAllCategorys, getCategoryById } from '../../controller/users/Category'

const categoryRoute = Router();

categoryRoute.get("/", getAllCategorys);
categoryRoute.get("/:id", getCategoryById);


export default categoryRoute;