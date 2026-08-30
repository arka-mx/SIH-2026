let mongoose: any;
try {
  mongoose = require("mongoose");
} catch {
  mongoose = null;
}

export interface IReportEvent {
  id: string;
  incident_id: string;
  device_id: string;
  type: string;
  message?: string;
  latitude: number;
  longitude: number;
  location_accuracy?: number;
  ip_address?: string;
  user_agent?: string;
  idempotency_key?: string;
  created_at: Date;
}

let ReportEventModel: any = null;

if (mongoose) {
  const ReportEventSchema = new mongoose.Schema(
    {
      id: { type: String, required: true, unique: true },
      incident_id: { type: String, required: true, index: true },
      device_id: { type: String, required: true, index: true },
      type: { type: String, required: true },
      message: { type: String },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      location_accuracy: { type: Number, default: 10 },
      ip_address: { type: String },
      user_agent: { type: String },
      idempotency_key: { type: String, index: true },
    },
    { timestamps: { createdAt: "created_at", updatedAt: false } }
  );

  ReportEventModel = mongoose.models?.ReportEvent || mongoose.model("ReportEvent", ReportEventSchema);
}

export { ReportEventModel };
