import { Router } from "express";
import { getAllCategorys, getCategoryById } from "../controller/categories";

const categoryRouter = Router();

categoryRouter.get("/", getAllCategorys);
categoryRouter.get("/:id", getCategoryById);

export default categoryRouter;