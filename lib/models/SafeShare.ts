let mongoose: any;
try {
  mongoose = require("mongoose");
} catch {
  mongoose = null;
}

let SafeShareModel: any = null;

if (mongoose) {
  const SafeShareSchema = new mongoose.Schema(
    {
      share_id: { type: String, required: true, unique: true, index: true },
      type: { type: String, required: true },
      status: { type: String, required: true },
      reported_safe: { type: Boolean, default: false },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      location_label: { type: String },
      note: { type: String },
      rescuer: { type: mongoose.Schema.Types.Mixed },
      source_created_at: { type: Date },
      source_updated_at: { type: Date },
    },
    { timestamps: { createdAt: "shared_at", updatedAt: "refreshed_at" } }
  );

  SafeShareModel = mongoose.models?.SafeShare || mongoose.model("SafeShare", SafeShareSchema);
}

export { SafeShareModel };
