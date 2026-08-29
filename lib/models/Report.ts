import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReport extends Document {
  session_id: string;
  type: "flood" | "cyclone" | "landslide" | "medical" | "fire" | "other";
  description?: string;
  photo_url?: string;
  status: "unverified" | "verified" | "in_progress" | "resolved";
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  created_at: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    session_id: { type: String, required: true },
    type: { type: String, required: true, enum: ["flood", "cyclone", "landslide", "medical", "fire", "other"] },
    description: { type: String },
    photo_url: { type: String },
    status: { type: String, enum: ["unverified", "verified", "in_progress", "resolved"], default: "unverified" },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

ReportSchema.index({ location: "2dsphere" });

export const ReportModel: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
