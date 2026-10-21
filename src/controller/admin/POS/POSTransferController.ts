import { Request, Response } from "express";
import { BadRequest } from "../../../Errors/BadRequest";
import {
  createTransfer,
  getalltransfers,
  getTransferById,
  updateTransferStatus,
} from "../Transfer";

const getAssignedWarehouseId = (req: Request): string | null => {
  const warehouseId = (req.user as any)?.warehouse_id;
  return warehouseId ? String(warehouseId) : null;
};

// GET /api/admin/pos/transfer
export const listPOSTransfers = async (req: Request, res: Response) => {
  const user = req.user as any;

  if (user?.role !== "superadmin" && !getAssignedWarehouseId(req)) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  return getalltransfers(req, res);
};

// GET /api/admin/pos/transfer/:id
export const getPOSTransferById = async (req: Request, res: Response) => {
  const user = req.user as any;

  if (user?.role !== "superadmin" && !getAssignedWarehouseId(req)) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  return getTransferById(req, res);
};

// POST /api/admin/pos/transfer
// A scoped cashier can only send stock from their assigned warehouse.
// The created transfer stays pending until it is received/rejected.
export const createPOSTransfer = async (req: Request, res: Response) => {
  const user = req.user as any;

  if (user?.role !== "superadmin") {
    const assignedWarehouseId = getAssignedWarehouseId(req);

    if (!assignedWarehouseId) {
      throw new BadRequest("Warehouse is not assigned to this user");
    }

    req.body.fromWarehouseId = assignedWarehouseId;
  }

  return createTransfer(req, res);
};

// PUT /api/admin/pos/transfer/:id
// A scoped cashier can only receive/reject transfers coming into their
// assigned warehouse. Superadmin can act on any receiving warehouse.
export const updatePOSTransferStatus = async (req: Request, res: Response) => {
  const user = req.user as any;

  if (user?.role !== "superadmin") {
    const assignedWarehouseId = getAssignedWarehouseId(req);

    if (!assignedWarehouseId) {
      throw new BadRequest("Warehouse is not assigned to this user");
    }

    req.body.warehouseId = assignedWarehouseId;
  } else if (!req.body.warehouseId) {
    throw new BadRequest("warehouseId is required");
  }

  return updateTransferStatus(req, res);
};
