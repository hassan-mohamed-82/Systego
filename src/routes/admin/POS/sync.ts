import { Router } from "express";
import {
  bootstrapTable,
  pushChanges,
  pullChangeLog,
} from "../../../controller/admin/POS/sync";

const router = Router();

router.get("/bootstrap/:table", bootstrapTable);
router.post("/push", pushChanges);
router.get("/pull", pullChangeLog);

export default router;
