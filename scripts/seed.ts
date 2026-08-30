import "dotenv/config";
import mongoose from "mongoose";
import { ResourceModel } from "../lib/models/Resource";
import { ReportModel } from "../lib/models/Report";
import { AllocationModel } from "../lib/models/Allocation";
import { AdminUserModel } from "../lib/models/AdminUser";
import crypto from "crypto";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/momentum";

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return { salt, hash };
}

// Mumbai Center: 19.0760, 72.8777
const initialResources = [
  {
    name: "Dharavi Community Shelter",
    type: "shelter",
    capacity_total: 350,
    capacity_used: 120,
    status: "available",
    disaster_types: ["flood", "cyclone", "landslide"],
    location: { type: "Point", coordinates: [72.8627, 19.0880] },
  },
  {
    name: "NDRF Team Alpha",
    type: "rescue_team",
    capacity_total: 20,
    capacity_used: 0,
    status: "available",
    disaster_types: ["flood", "cyclone", "landslide", "fire"],
    location: { type: "Point", coordinates: [72.8727, 19.0790] },
  },
  {
    name: "Inflatable Rescue Boat IR-1",
    type: "boat",
    capacity_total: 8,
    capacity_used: 0,
    status: "available",
    disaster_types: ["flood"],
    location: { type: "Point", coordinates: [72.8577, 19.0680] },
  },
  {
    name: "Mobile ICU Van MV-01",
    type: "medical_van",
    capacity_total: 3,
    capacity_used: 1,
    status: "available",
    disaster_types: ["flood", "cyclone", "landslide", "medical"],
    location: { type: "Point", coordinates: [72.9027, 19.0860] },
  },
  {
    name: "City Hospital Rapid Ambulance AMB-101",
    type: "ambulance",
    capacity_total: 2,
    capacity_used: 0,
    status: "available",
    disaster_types: ["flood", "cyclone", "landslide", "medical", "fire"],
    location: { type: "Point", coordinates: [72.8857, 19.0910] },
  },
];

async function seed() {
  console.log("🌱 Seeding MongoDB database...");
  await mongoose.connect(MONGODB_URI);

  await AllocationModel.deleteMany({});
  await ReportModel.deleteMany({});
  await ResourceModel.deleteMany({});
  await AdminUserModel.deleteMany({});

  console.log("  🗑️ Cleared existing data.");

  await ResourceModel.insertMany(initialResources);
  console.log(`  ✅ Seeded ${initialResources.length} resources into MongoDB.`);

  const { salt, hash } = hashPassword("admin123");
  await AdminUserModel.create({
    username: "admin",
    passwordHash: hash,
    passwordSalt: salt,
    name: "Command Coordinator",
    role: "coordinator"
  });
  console.log("  ✅ Seeded default coordinator user (admin / admin123).");

  await mongoose.disconnect();
  console.log("🎉 Seed finished successfully!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
