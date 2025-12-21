import mongoose from "mongoose";

const UnitSchema = new mongoose.Schema(
  {
    code: { 
      type: String, 
      required: true, 
      unique: true 
    },
    name: { 
      type: String, 
      required: true, 
      unique: true 
    },
    ar_name: { 
      type: String, 
      required: true 
    },
    base_unit: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Unit",
      default: null  // null يعني هي نفسها base unit
    },
    operator: { 
      type: String, 
      enum: ["*", "/"],  // ضرب أو قسمة
      default: "*"
    },
    operator_value: { 
      type: Number, 
      default: 1  // القيمة اللي هنضرب أو نقسم فيها
    },
    is_base_unit: {
      type: Boolean,
      default: false  // هل دي وحدة أساسية ولا لأ
    },
    status: { 
      type: Boolean, 
      default: true 
    }
  },
  { timestamps: true }
);

export const UnitModel = mongoose.model("Unit", UnitSchema);
