import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { getMyProfile, updateMyProfile, deleteMyProfile } from "../../controller/admin/ProfileController";

const route = Router();

route.get("/", catchAsync(getMyProfile));
route.put("/", catchAsync(updateMyProfile));
route.delete("/", catchAsync(deleteMyProfile));

export default route;
