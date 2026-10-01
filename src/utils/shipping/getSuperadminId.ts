import { Request } from "express";
import { BadRequest } from "../../Errors/BadRequest";
import { UserModel } from "../../models/schema/admin/User";

/**
 * ✅ بيجيب الـ superadminId (tenant) من الـ request
 * - لو اليوزر superadmin → هو نفسه
 * - لو admin → بنجيب الـ superadmin المرتبط بالـ warehouse بتاعه
 */
export const getSuperadminId = async (req: Request): Promise<string> => {
  const jwtUser = req.user as any;

  if (!jwtUser?.id) {
    throw new BadRequest("Unauthorized: user not found in token");
  }

  // ✅ الحالة 1: superadmin → هو نفسه (مفيش query)
  if (jwtUser.role === "superadmin") {
    return jwtUser.id.toString();
  }

  // ✅ الحالة 2: admin → عندنا warehouse_id في الـ JWT already
  if (!jwtUser.warehouse_id) {
    throw new BadRequest("Warehouse is not assigned to this user");
  }

  const superadmin = await UserModel.findOne({
    role: "superadmin",
    warehouse_id: jwtUser.warehouse_id,
  })
    .select("_id")
    .lean();

  if (!superadmin) {
    throw new BadRequest(
      "No superadmin found for this warehouse. Contact your administrator.",
    );
  }

  return (superadmin as any)._id.toString();
};
