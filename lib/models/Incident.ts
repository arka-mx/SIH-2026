let mongoose: any;
try {
  mongoose = require("mongoose");
} catch {
  mongoose = null;
}

export interface IIncident {
  incident_id: string;
  device_id: string;
  status: "unverified" | "verified" | "in_progress" | "resolved" | "cancelled";
  severity: "critical" | "high" | "moderate" | "low";
  latitude: number;
  longitude: number;
  location_wkt?: string;
  address?: string;
  description?: string;
  type: string;
  report_count: number;
  assigned_rescuer_id?: string;
  assigned_rescuer?: any;
  rescuer_status?: "pending_admin" | "assigned" | "admin_denied_auto_routed" | "arrived";
  denied_by_admin?: boolean;
  assignment_source?: "admin_dispatch" | "nearest_fallback_admin_denied";
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
}

let IncidentModel: any = null;

if (mongoose) {
  const IncidentSchema = new mongoose.Schema(
    {
      incident_id: { type: String, required: true, unique: true, index: true },
      device_id: { type: String, required: true, index: true },
      status: { 
        type: String, 
        enum: ["unverified", "verified", "in_progress", "resolved", "cancelled"], 
        default: "unverified",
        index: true 
      },
      severity: { type: String, enum: ["critical", "high", "moderate", "low"], default: "high" },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      location_wkt: { type: String },
      address: { type: String },
      description: { type: String },
      type: { type: String, required: true },
      report_count: { type: Number, default: 1 },
      assigned_rescuer_id: { type: String },
      assigned_rescuer: { type: mongoose.Schema.Types.Mixed },
      rescuer_status: { type: String },
      denied_by_admin: { type: Boolean, default: false },
      assignment_source: { type: String },
      resolved_at: { type: Date },
    },
    { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
  );

  // Composite index for fast active incident lookup per device_id
  IncidentSchema.index({ device_id: 1, status: 1 });

  IncidentModel = mongoose.models?.Incident || mongoose.model("Incident", IncidentSchema);
}

export { IncidentModel };
