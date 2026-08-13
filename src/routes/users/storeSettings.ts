// routes/storeSettings.routes.ts

import { Router } from "express";
import {
    getStoreSettings,
    updateStoreSettings,
} from "../../controller/admin/storeSettings";

const router = Router();

router.get("/", getStoreSettings);

router.put("/", updateStoreSettings);

export default router;