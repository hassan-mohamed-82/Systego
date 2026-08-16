import { CounterModel } from "../models/schema/admin/Counter";

export const generateCode = async (prefix: string): Promise<string> => {
  const counter = await CounterModel.findByIdAndUpdate(
    prefix,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix.toUpperCase()}-${String(counter.seq).padStart(4, "0")}`;
};