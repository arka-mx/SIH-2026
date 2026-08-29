import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const ALLOCATION_STATUSES = ["recommended", "confirmed", "en_route", "at_scene", "resolved"] as const;

const AllocationSchema = new Schema(
  {
    report_id: { type: Schema.Types.ObjectId, ref: "Report", required: true },
    resource_id: { type: Schema.Types.ObjectId, ref: "Resource", required: true },
    status: { type: String, enum: ALLOCATION_STATUSES, default: "recommended" },
    recommended_at: { type: Date, default: Date.now },
    confirmed_at: { type: Date, default: null },
    confirmed_by: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        ret.report_id = (ret.report_id as mongoose.Types.ObjectId)?.toString();
        ret.resource_id = (ret.resource_id as mongoose.Types.ObjectId)?.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

AllocationSchema.index({ report_id: 1, resource_id: 1 }, { unique: true });

export type AllocationDoc = InferSchemaType<typeof AllocationSchema>;

export default mongoose.models.Allocation || mongoose.model("Allocation", AllocationSchema);
