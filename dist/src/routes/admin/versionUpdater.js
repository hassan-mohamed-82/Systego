"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const VersionUpdater_1 = require("../../controller/admin/VersionUpdater");
const route = (0, express_1.Router)();
// Check for changes (dry run)
route.post("/", (0, catchAsync_1.catchAsync)(VersionUpdater_1.checkForChanges));
// Sync all (frontend + backend)
route.post("/sync", (0, catchAsync_1.catchAsync)(VersionUpdater_1.syncAll));
// Sync frontend only
route.post("/sync-frontend", (0, catchAsync_1.catchAsync)(VersionUpdater_1.syncFrontend));
// Sync backend only
route.post("/sync-backend", (0, catchAsync_1.catchAsync)(VersionUpdater_1.syncBackend));
exports.default = route;
