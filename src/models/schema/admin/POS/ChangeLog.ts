import mongoose, { Schema } from "mongoose";

const ChangeLogSchema = new Schema(
  {
    table_name: { type: String, required: true },
    record_id: { type: String, required: true },
    op: { type: String, enum: ["insert", "update", "delete"], required: true }, 
    payload: { type: Schema.Types.Mixed, default: null },
    warehouseId: { type: Schema.Types.Mixed, default: null },
    originClientId: { type: String, default: null, index: true },
    sourceChangeId: { type: String, unique: true}, 
  },
  { timestamps: true }
);

ChangeLogSchema.index({ createdAt: 1 });
ChangeLogSchema.index({ warehouseId: 1, createdAt: 1 });
ChangeLogSchema.index({ table_name: 1, record_id: 1 });
ChangeLogSchema.index({ originClientId: 1, createdAt: 1 });
ChangeLogSchema.index(
  { sourceChangeId: 1 },
  { unique: true, partialFilterExpression: { sourceChangeId: { $type: "string" } } }
);

export const ChangeLogModel = mongoose.model("ChangeLog", ChangeLogSchema);