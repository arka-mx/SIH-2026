let mongoose: any;
try {
  mongoose = require("mongoose");
} catch {
  mongoose = null;
}

export interface IAnonymousClient {
  device_id: string;
  first_seen_at: Date;
  last_seen_at: Date;
  created_at: Date;
  updated_at: Date;
}

let ClientModel: any = null;

if (mongoose) {
  const ClientSchema = new mongoose.Schema(
    {
      device_id: { type: String, required: true, unique: true, index: true },
      first_seen_at: { type: Date, default: Date.now },
      last_seen_at: { type: Date, default: Date.now },
    },
    { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
  );

  ClientModel = mongoose.models?.AnonymousClient || mongoose.model("AnonymousClient", ClientSchema);
}

export { ClientModel };
