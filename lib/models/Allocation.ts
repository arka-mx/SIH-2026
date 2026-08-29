import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAllocation extends Document {
  report_id: string;
  resource_id: string;
  status: "recommended" | "confirmed" | "en_route" | "at_scene" | "resolved";
  recommended_at: Date;
  confirmed_at?: Date;
  confirmed_by?: string;
  created_at: Date;
}

const AllocationSchema = new Schema<IAllocation>(
  {
    report_id: { type: String, required: true },
    resource_id: { type: String, required: true },
    status: { type: String, enum: ["recommended", "confirmed", "en_route", "at_scene", "resolved"], default: "recommended" },
    recommended_at: { type: Date, default: Date.now },
    confirmed_at: { type: Date },
    confirmed_by: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export const AllocationModel: Model<IAllocation> =
  mongoose.models.Allocation || mongoose.model<IAllocation>("Allocation", AllocationSchema);
