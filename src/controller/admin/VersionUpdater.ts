import { Request, Response, NextFunction } from "express";
import { BadRequest } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import * as versionUpdater from "../../utils/versionUpdater";

// =========================
// Check for Changes (dry run)
// =========================
export const checkForChanges = async (req: Request, res: Response, next: NextFunction) => {
    const { clientName } = req.body;

    if (!clientName || typeof clientName !== "string") {
        throw new BadRequest("clientName is required");
    }

    const result = await versionUpdater.checkForChanges(clientName.trim());

    SuccessResponse(res, {
        message: "Version check completed",
        result,
    });
};

// =========================
// Sync All (frontend + backend)
// =========================
export const syncAll = async (req: Request, res: Response, next: NextFunction) => {
    const { clientName } = req.body;

    if (!clientName || typeof clientName !== "string") {
        throw new BadRequest("clientName is required");
    }

    const result = await versionUpdater.syncAll(clientName.trim());

    SuccessResponse(res, {
        message: "Full sync completed",
        result,
    });
};

// =========================
// Sync Frontend Only
// =========================
export const syncFrontend = async (req: Request, res: Response, next: NextFunction) => {
    const { clientName } = req.body;

    if (!clientName || typeof clientName !== "string") {
        throw new BadRequest("clientName is required");
    }

    const result = await versionUpdater.syncFrontend(clientName.trim());

    SuccessResponse(res, {
        message: "Frontend sync completed",
        result,
    });
};

// =========================
// Sync Backend Only
// =========================
export const syncBackend = async (req: Request, res: Response, next: NextFunction) => {
    const { clientName } = req.body;

    if (!clientName || typeof clientName !== "string") {
        throw new BadRequest("clientName is required");
    }

    const result = await versionUpdater.syncBackend(clientName.trim());

    SuccessResponse(res, {
        message: "Backend sync completed",
        result,
    });
};
