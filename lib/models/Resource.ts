import mongoose, { Schema, Document, Model } from "mongoose";

export interface IResource extends Document {
  name: string;
  type: "shelter" | "rescue_team" | "medical_van" | "boat" | "food_stock" | "ambulance" | "fire_engine";
  capacity_total: number;
  capacity_used: number;
  status: "available" | "en_route" | "at_scene";
  disaster_types: string[];
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  created_at: Date;
}

const ResourceSchema = new Schema<IResource>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    capacity_total: { type: Number, required: true },
    capacity_used: { type: Number, default: 0 },
    status: { type: String, enum: ["available", "en_route", "at_scene"], default: "available" },
    disaster_types: { type: [String], default: [] },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

ResourceSchema.index({ location: "2dsphere" });

export const ResourceModel: Model<IResource> =
  mongoose.models.Resource || mongoose.model<IResource>("Resource", ResourceSchema);
