import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const REPORT_TYPES = ["flood", "cyclone", "landslide", "medical", "fire", "other"] as const;
export const REPORT_STATUSES = ["unverified", "verified", "in_progress", "resolved"] as const;

const ReportSchema = new Schema(
  {
    session_id: { type: String, required: true },
    type: { type: String, enum: REPORT_TYPES, required: true },
    description: { type: String, default: null },
    photo_url: { type: String, default: null },
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    status: { type: String, enum: REPORT_STATUSES, default: "unverified" },
    created_at: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

ReportSchema.index({ location: "2dsphere" });

export type ReportDoc = InferSchemaType<typeof ReportSchema>;

export default mongoose.models.Report || mongoose.model("Report", ReportSchema);
