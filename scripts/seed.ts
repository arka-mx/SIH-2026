import "dotenv/config";
import { connectToDatabase } from "../lib/mongodb";
import Report from "../lib/models/Report";
import Resource from "../lib/models/Resource";
import Allocation from "../lib/models/Allocation";

// Mumbai center: 19.0760° N, 72.8777° E
function mumbaiCoord(latOffset: number, lonOffset: number): { lat: number; lon: number } {
  return {
    lat: 19.076 + latOffset,
    lon: 72.8777 + lonOffset,
  };
}

interface ResourceSeed {
  name: string;
  type: string;
  capacity_total: number;
  disaster_types: string[];
  lat: number;
  lon: number;
}

const resources: ResourceSeed[] = [
  // ── 5 Shelters (capacity 100–500) ──
  { name: "Dharavi Community Shelter", type: "shelter", capacity_total: 350, disaster_types: ["flood", "cyclone", "landslide"], ...mumbaiCoord(0.012, -0.015) },
  { name: "Bandra Relief Camp", type: "shelter", capacity_total: 500, disaster_types: ["flood", "cyclone", "landslide"], ...mumbaiCoord(0.025, -0.008) },
  { name: "Andheri East Shelter", type: "shelter", capacity_total: 200, disaster_types: ["flood", "cyclone", "landslide"], ...mumbaiCoord(0.045, -0.022) },
  { name: "Chembur Municipal Shelter", type: "shelter", capacity_total: 150, disaster_types: ["flood", "cyclone", "landslide"], ...mumbaiCoord(-0.015, 0.018) },
  { name: "Kurla West Emergency Shelter", type: "shelter", capacity_total: 100, disaster_types: ["flood", "cyclone", "landslide"], ...mumbaiCoord(0.008, 0.005) },

  // ── 4 Rescue Teams (capacity 10–20) ──
  { name: "NDRF Team Alpha", type: "rescue_team", capacity_total: 20, disaster_types: ["flood", "cyclone", "landslide", "fire"], ...mumbaiCoord(0.003, -0.005) },
  { name: "NDRF Team Bravo", type: "rescue_team", capacity_total: 15, disaster_types: ["flood", "cyclone", "landslide", "fire"], ...mumbaiCoord(-0.02, 0.01) },
  { name: "Mumbai Fire Brigade Unit 7", type: "rescue_team", capacity_total: 12, disaster_types: ["fire", "cyclone", "landslide"], ...mumbaiCoord(0.03, 0.015) },
  { name: "Navy Rescue Squad", type: "rescue_team", capacity_total: 10, disaster_types: ["flood", "cyclone"], ...mumbaiCoord(-0.035, -0.012) },

  // ── 3 Boats (capacity 5–10) ──
  { name: "Inflatable Rescue Boat IR-1", type: "boat", capacity_total: 8, disaster_types: ["flood"], ...mumbaiCoord(-0.008, -0.02) },
  { name: "Motorized Dinghy MD-3", type: "boat", capacity_total: 10, disaster_types: ["flood"], ...mumbaiCoord(0.018, -0.03) },
  { name: "Flat-bottom Rescue Craft FRC-2", type: "boat", capacity_total: 5, disaster_types: ["flood"], ...mumbaiCoord(-0.025, 0.008) },

  // ── 3 Medical Vans (capacity 2–5) ──
  { name: "Mobile ICU Van MV-01", type: "medical_van", capacity_total: 3, disaster_types: ["flood", "cyclone", "landslide", "medical"], ...mumbaiCoord(0.01, 0.025) },
  { name: "First Aid Response Van FA-02", type: "medical_van", capacity_total: 5, disaster_types: ["flood", "cyclone", "landslide", "medical"], ...mumbaiCoord(-0.04, -0.005) },
  { name: "Trauma Care Unit TC-01", type: "medical_van", capacity_total: 2, disaster_types: ["flood", "cyclone", "landslide", "medical", "fire"], ...mumbaiCoord(0.022, -0.018) },

  // ── 2 Food Stocks (capacity 500–1000) ──
  { name: "SDMA Central Warehouse", type: "food_stock", capacity_total: 1000, disaster_types: ["flood", "cyclone", "landslide"], ...mumbaiCoord(0.005, -0.01) },
  { name: "Municipal Ration Depot Sion", type: "food_stock", capacity_total: 500, disaster_types: ["flood", "cyclone", "landslide"], ...mumbaiCoord(-0.012, 0.022) },

  // ── 3 Ambulances (capacity 1–2) ──
  { name: "Ambulance AMB-101", type: "ambulance", capacity_total: 2, disaster_types: ["flood", "cyclone", "landslide", "medical", "fire"], ...mumbaiCoord(0.015, 0.008) },
  { name: "Ambulance AMB-102", type: "ambulance", capacity_total: 1, disaster_types: ["flood", "cyclone", "landslide", "medical", "fire"], ...mumbaiCoord(-0.005, -0.025) },
  { name: "Ambulance AMB-103", type: "ambulance", capacity_total: 2, disaster_types: ["flood", "cyclone", "landslide", "medical", "fire"], ...mumbaiCoord(0.038, -0.003) },
];

async function main() {
  console.log("Seeding database with Mumbai resources...\n");

  await connectToDatabase();

  await Allocation.deleteMany({});
  await Report.deleteMany({});
  await Resource.deleteMany({});
  console.log("  Cleared existing data.\n");

  for (const r of resources) {
    await Resource.create({
      name: r.name,
      type: r.type,
      capacity_total: r.capacity_total,
      capacity_used: 0,
      location: { type: "Point", coordinates: [r.lon, r.lat] },
      status: "available",
      disaster_types: r.disaster_types,
    });
    console.log(`  ${r.type.padEnd(12)} | ${r.name}`);
  }

  console.log(`\nSeeded ${resources.length} resources around Mumbai.`);
}

main()
  .then(async () => {
    const mongoose = await connectToDatabase();
    await mongoose.disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    const mongoose = await connectToDatabase();
    await mongoose.disconnect();
    process.exit(1);
  });
