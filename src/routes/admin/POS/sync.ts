import { Router } from "express";
import {
  bootstrapTable,
  pullTable,
  pushChanges,
} from "../../../controller/admin/POS/sync";

const router = Router();

router.get("/bootstrap/:table", bootstrapTable);
router.get("/pull/:table", pullTable);
router.post("/push", pushChanges);

export default router;
