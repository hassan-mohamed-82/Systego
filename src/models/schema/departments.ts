import mongoose, { Schema } from "mongoose";

const departmentSchema =new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
},{timestamps:true})

export const DepartmentModel = mongoose.model("Department", departmentSchema);