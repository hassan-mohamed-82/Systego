import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../../models/schema/admin/User";
import { BadRequest, NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { saveBase64Image } from "../../utils/handleImages";
import { formatUserResponseDetailed } from "./Admin";

// =========================
// Get My Profile
// =========================
export const getMyProfile = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new BadRequest("User ID not found in request");
  }

  const user = await UserModel.findById(userId)
    .select("-password_hash -__v")
    .populate("warehouse_id", "name")
    .populate("role_id", "name status permissions");

  if (!user) {
    throw new NotFound("Profile not found");
  }

  SuccessResponse(res, {
    message: "Profile retrieved successfully",
    profile: formatUserResponseDetailed(user),
  });
};

// =========================
// Update My Profile
// =========================
export const updateMyProfile = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new BadRequest("User ID not found in request");
  }

  const {
    username,
    email,
    password,
    company_name,
    phone,
    image_base64,
  } = req.body;

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFound("Profile not found");
  }

  // Check unique username
  if (username && username !== user.username) {
    const exists = await UserModel.findOne({ username, _id: { $ne: userId } });
    if (exists) throw new BadRequest("Username already exists");
    user.username = username;
  }

  // Check unique email
  if (email && email !== user.email) {
    const exists = await UserModel.findOne({ email, _id: { $ne: userId } });
    if (exists) throw new BadRequest("Email already exists");
    user.email = email;
  }

  // Update fields
  if (company_name !== undefined) user.company_name = company_name;
  if (phone !== undefined) user.phone = phone;

  // Handle password
  if (password) {
    user.password_hash = await bcrypt.hash(password, 10);
  }

  // Handle image
  if (image_base64) {
    user.image_url = await saveBase64Image(image_base64, user.username, req, "users");
  }

  await user.save();
  await user.populate("role_id", "name");
  await user.populate("warehouse_id", "name");

  SuccessResponse(res, {
    message: "Profile updated successfully",
    profile: formatUserResponseDetailed(user),
  });
};

// =========================
// Delete My Profile
// =========================
export const deleteMyProfile = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new BadRequest("User ID not found in request");
  }

  // Prevent superadmin from deleting themselves to avoid locking the system
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFound("Profile not found");
  }

  if (user.role === "superadmin") {
    // Check if it's the only superadmin
    const superAdminCount = await UserModel.countDocuments({ role: "superadmin" });
    if (superAdminCount <= 1) {
      throw new BadRequest("Cannot delete the only superadmin account in the system");
    }
  }

  await UserModel.findByIdAndDelete(userId);

  SuccessResponse(res, { message: "Profile deleted successfully" });
};
