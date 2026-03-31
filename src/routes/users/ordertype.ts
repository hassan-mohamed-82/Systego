import { Router } from "express";
import { getOrderTypes } from "../../controller/users/ordertype";

const router = Router();

router.get("/", getOrderTypes);

export default router;
