import { Request, Response } from "express";
import { WarehouseModel } from "../../../models/schema/admin/Warehouse";
import { BadRequest } from "../../../Errors/BadRequest";
import { SuccessResponse } from "../../../utils/response";
import { buildWarehouseProducts } from "../product_warehouse";

const getScopedWarehouseId = (
  req: Request,
  allowQuery = false,
  paramWarehouseId?: string,
): string => {
  const user = req.user as any;
  const assignedWarehouseId = user?.warehouse_id;

  if (user?.role === "superadmin") {
    if (!allowQuery) {
      if (!assignedWarehouseId) {
        throw new BadRequest("Warehouse is not assigned to this user");
      }
      return String(assignedWarehouseId);
    }

    const requested =
      paramWarehouseId ||
      req.query.warehouseId ||
      req.query.warehouse_id ||
      assignedWarehouseId;

    if (!requested) {
      throw new BadRequest("warehouseId is required");
    }

    return String(requested);
  }

  if (!assignedWarehouseId) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const requested =
    paramWarehouseId || req.query.warehouseId || req.query.warehouse_id;

  if (requested && String(requested) !== String(assignedWarehouseId)) {
    throw new BadRequest("You are not allowed to access another warehouse");
  }

  return String(assignedWarehouseId);
};

// GET /api/admin/pos/warehouse/products
// GET /api/admin/pos/warehouse/:warehouseId  (same response shape as the
// admin product-warehouse page; `:warehouseId` is mainly for superadmin)
// Same response shape as GET /api/admin/product_warehouse/:warehouseId.
export const getPOSWarehouseProducts = async (req: Request, res: Response) => {
  const warehouseId = getScopedWarehouseId(
    req,
    true,
    req.params?.warehouseId ? String(req.params.warehouseId) : undefined,
  );
  const data = await buildWarehouseProducts(warehouseId);

  const summary = (data.products as any[]).reduce(
    (acc, product) => {
      const quantity = Number(product.stock_quantity ?? product.quantity ?? 0);
      const unitPrice = Number(
        product.productPriceId?.price ?? product.price ?? 0,
      );

      acc.totalQuantity += quantity;
      acc.totalAmount += unitPrice * quantity;
      return acc;
    },
    { totalQuantity: 0, totalAmount: 0 },
  );

  SuccessResponse(res, {
    ...data,
    summary,
  });
};

// GET /api/admin/pos/warehouse/destinations
// Branches that the current POS user is allowed to transfer stock to.
export const getPOSWarehouseDestinations = async (
  req: Request,
  res: Response,
) => {
  const user = req.user as any;
  const assignedWarehouseId = user?.warehouse_id
    ? String(user.warehouse_id)
    : null;

  const filter: any = { enabled: { $ne: false } };

  if (user?.role !== "superadmin" && assignedWarehouseId) {
    filter._id = { $ne: assignedWarehouseId };
  }

  const warehouses = await WarehouseModel.find(filter)
    .select("name ar_name phone stock_Quantity Is_Online")
    .sort({ name: 1 })
    .lean();

  SuccessResponse(res, {
    message: "Destination warehouses list",
    warehouses,
  });
};
