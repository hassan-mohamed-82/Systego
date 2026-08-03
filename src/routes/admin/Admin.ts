// src/routes/admin/userRoutes.ts

import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
//   toggleUserStatus,
  getSelectionData,
  getCashiermanShiftsReport,
  getShiftDetails,
} from "../../controller/admin/Admin";

const route = Router();


// Selection data (warehouses + roles)
route.get("/selection", catchAsync(getSelectionData));

// CRUD
route.post("/", catchAsync(createUser));
route.get("/", catchAsync(getAllUsers));
route.get("/:id", catchAsync(getUserById));
route.put("/:id", catchAsync(updateUser));
route.delete("/:id", catchAsync(deleteUser));
route.get("/report/:id", catchAsync(getCashiermanShiftsReport))
route.get("/shifts/:shift_id/details", catchAsync(getShiftDetails))

// Status toggle
// router.patch("/:id/status", catchAsync(toggleUserStatus));


export default route;
