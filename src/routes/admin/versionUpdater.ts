import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
    checkForChanges,
    syncAll,
    syncFrontend,
    syncBackend,
} from "../../controller/admin/VersionUpdater";

const route = Router();

// Check for changes (dry run)
route.post("/", catchAsync(checkForChanges));

// Sync all (frontend + backend)
route.post("/sync", catchAsync(syncAll));

// Sync frontend only
route.post("/sync-frontend", catchAsync(syncFrontend));

// Sync backend only
route.post("/sync-backend", catchAsync(syncBackend));

export default route;
