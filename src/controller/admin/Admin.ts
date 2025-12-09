import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../../models/schema/admin/User";
import { BadRequest } from "../../Errors/BadRequest";
import { UnauthorizedError } from "../../Errors/unauthorizedError";
import { SuccessResponse } from "../../utils/response";
import { saveBase64Image } from "../../utils/handleImages";
import { NotFound } from "../../Errors";
import { PositionModel } from "../../models/schema/admin/position";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { RoleModel } from "../../models/schema/admin/roles";
import { ActionModel } from "../../models/schema/admin/Action";
import mongoose from "mongoose";

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const currentUser = req.user;

  const { username, email, password, positionId, company_name, phone, image_base64,warehouse_id} = req.body;

  if (!username || !email || !password || !positionId || !warehouse_id) {
    throw new BadRequest("Username, email, password, positionId, and warehouse_id are required");
  }
 
  const warehouseExists = await WarehouseModel.findById(warehouse_id);
  if (!warehouseExists) {
    throw new BadRequest("Invalid warehouse_id: Warehouse does not exist");
  }

  // ✅ التأكد من تكرار البيانات
  const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new BadRequest("User with this email or username already exists");
  }

  // ✅ تشفير الباسورد
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  let image_url: string | undefined;
  if (image_base64) {
    image_url = await saveBase64Image(image_base64, username, req, "users");
  }

  // ✅ إنشاء المستخدم
  const newUser = await (await (UserModel.create({
      username,
      email,
      password_hash,
      positionId,
      company_name,
      phone,
      image_url,
      warehouse_id
  }))).populate("positionId");

  SuccessResponse(res, {
    message: "User created successfully",
    user: {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      positionId: newUser.positionId,
      status: newUser.status,
      image_url: newUser.image_url,
      warehouse_id: newUser.warehouse_id
    },
  });
};


export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  // 🧍‍♂️ 1️⃣ هات المستخدمين
  const users = await UserModel.find().select("-password_hash").populate("warehouse_id","name");
  if (!users || users.length === 0) {
    throw new NotFound("No users found");
  }

  // 🧩 2️⃣ هات كل الـ Positions
  const positions = await PositionModel.find();

  // 🧠 3️⃣ جهز شكل البيانات المطلوب
  const formattedPositions = [];

  for (const position of positions) {
    const roles = await RoleModel.find({ positionId: position._id });

    const formattedRoles = [];
    for (const role of roles) {
      const actions = await ActionModel.find({ roleId: role._id });

      formattedRoles.push({
        _id: role._id,
        name: role.name,
        actions: actions.map((action) => action.name),
      });
    }

    formattedPositions.push({
      _id: position._id,
      name: position.name,
      roles: formattedRoles,
    });
  }

  // ✅ 4️⃣ رجّع الرد بالشكل اللي إنت عايزه
  SuccessResponse(res, {
    message: "get all users successfully",
    users,
    positions: formattedPositions,
  });
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // ✅ 1️⃣ تحقق من صحة الـ id
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid or missing user ID");
  }

  // 🧍‍♂️ 2️⃣ هات المستخدم بدون كلمة السر
  const user = await UserModel.findById(id).select("-password_hash -__v").populate("warehouse_id","name");
  if (!user) throw new NotFound("User not found");

  // 🧩 3️⃣ هات الـ position الخاص بالمستخدم (لو عنده)
  let positionData = null;
  if (user.positionId) {
    const position = await PositionModel.findById(user.positionId);
    if (position) {
      // 🧠 4️⃣ هات الـ roles الخاصة بالـ position
      const roles = await RoleModel.find({ positionId: position._id });

      const formattedRoles = [];
      for (const role of roles) {
        const actions = await ActionModel.find({ roleId: role._id });
        formattedRoles.push({
          _id: role._id,
          name: role.name,
          actions: actions.map((a) => a.name),
        });
      }

      positionData = {
        _id: position._id,
        name: position.name,
        roles: formattedRoles,
      };
    }
  }

  // ✅ 5️⃣ رجّع الرد النهائي
  SuccessResponse(res, {
    message: "User retrieved successfully",
    user,
    position: positionData,
  });
};


export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
 

  const { id } = req.params;
  const { username, email, password, positionId, company_name, phone, status, image_base64, warehouse_id } = req.body;

  const user = await UserModel.findById(id);
  if (!user) {
    throw new NotFound("User not found");
  }

  if (username) user.username = username;
  if (email) user.email = email;
  if (positionId) user.positionId = positionId;
  if (company_name) user.company_name = company_name;
  if (phone) user.phone = phone;
  if (status) user.status = status;
  if (warehouse_id) {
    const warehouseExists = await WarehouseModel.findById(warehouse_id);
    if (!warehouseExists) {
      throw new BadRequest("Invalid warehouse_id: Warehouse does not exist");
    }
    user.warehouse_id = warehouse_id;
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(password, salt);
  }

  if (image_base64) {
    user.image_url = await saveBase64Image(image_base64, user.username, req, "users");
  }

  await user.save();

  SuccessResponse(res, {
    message: "User updated successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      positionId: user.positionId,
      status: user.status,
      warehouse_id: user.warehouse_id,
      image_url: user.image_url,
    },
  });
};


export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {

  const { id } = req.params;

  if (!id) {
    throw new BadRequest("User id is required");
  }

  const user = await UserModel.findByIdAndDelete(id);
  if (!user) {
    throw new NotFound("User not found");
  }

  SuccessResponse(res, {
    message: "User deleted successfully",
  
  });
}; 


export const selection = async (req: Request, res: Response, next: NextFunction) => {
  const warehouse= await WarehouseModel.find().select("_id name");
   
  SuccessResponse(res, {
    message: "get all users successfully",
    warehouse,
  });
};