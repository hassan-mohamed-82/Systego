import { Router } from "express";
import { createFawry, updateFawry, getFawry, getFawryId } from "../../controller/admin/Fawry";

const router = Router();

router.post("/", createFawry);
router.put("/:id", updateFawry);
router.get("/", getFawry);
router.get("/:id", getFawryId);

export default router;