import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const RESOURCE_TYPES = [
  "shelter",
  "rescue_team",
  "medical_van",
  "boat",
  "food_stock",
  "ambulance",
  "fire_engine",
] as const;
export const RESOURCE_STATUSES = ["available", "en_route", "at_scene"] as const;

const ResourceSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: RESOURCE_TYPES, required: true },
    capacity_total: { type: Number, required: true },
    capacity_used: { type: Number, default: 0 },
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    status: { type: String, enum: RESOURCE_STATUSES, default: "available" },
    disaster_types: { type: [String], default: [] },
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

ResourceSchema.index({ location: "2dsphere" });

export type ResourceDoc = InferSchemaType<typeof ResourceSchema>;

export default mongoose.models.Resource || mongoose.model("Resource", ResourceSchema);
