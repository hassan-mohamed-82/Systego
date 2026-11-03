import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
    checkForChanges,
    syncAll,
    getSyncStatus,
    syncFrontend,
    syncBackend,
} from "../../controller/admin/VersionUpdater";

const route = Router();

// Check for changes (dry run)
route.post("/", catchAsync(checkForChanges));

// Sync all (frontend + backend)
route.post("/sync", catchAsync(syncAll));

// Get sync status (polling)
route.get("/status/:clientName", catchAsync(getSyncStatus));
route.post("/status", catchAsync(getSyncStatus));

// Sync frontend only
route.post("/sync-frontend", catchAsync(syncFrontend));

// Sync backend only
route.post("/sync-backend", catchAsync(syncBackend));

export default route;
