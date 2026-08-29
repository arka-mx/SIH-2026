import { Resource } from "@/types/resource";

export const mockResources: Resource[] = [
  { id: "RES-01", type: "Medical", name: "Advanced Life Support Ambulances", location: "Brahmapur District HQ", latitude: 19.3151, longitude: 84.7941, total: 8, currentlyUsed: 3, unit: "vehicles", status: "En route", disasterTypes: ["Flood", "Cyclone", "Medical"] },
  { id: "RES-02", type: "Rescue team", name: "Coastal Rescue Team Alpha", location: "Gopalpur Coast Guard Post", latitude: 19.2667, longitude: 84.9167, total: 18, currentlyUsed: 12, unit: "responders", status: "At scene", disasterTypes: ["Cyclone", "Flood", "Search and rescue"] },
  { id: "RES-03", type: "Water rescue", name: "Swift Water Rescue Boats", location: "Gopalpur Depot", latitude: 19.2852, longitude: 84.8834, total: 6, currentlyUsed: 2, unit: "boats", status: "Available", disasterTypes: ["Flood", "Cyclone"] },
  { id: "RES-04", type: "Relief supplies", name: "Ready-to-eat Food Stock", location: "Brahmapur Relief Store", latitude: 19.3032, longitude: 84.8068, total: 4200, currentlyUsed: 1680, unit: "packets", status: "Available", disasterTypes: ["Flood", "Cyclone", "Earthquake"] },
  { id: "RES-05", type: "Shelter", name: "Temporary Shelter Capacity", location: "Khallikote Block", latitude: 19.6167, longitude: 85.0833, total: 850, currentlyUsed: 620, unit: "people", status: "At scene", disasterTypes: ["Flood", "Cyclone"] },
  { id: "RES-06", type: "Medical", name: "Mobile Medical Vans", location: "MKCG Medical College", latitude: 19.3049, longitude: 84.7972, total: 5, currentlyUsed: 4, unit: "vans", status: "En route", disasterTypes: ["Flood", "Cyclone", "Medical"] },
  { id: "RES-07", type: "Water and sanitation", name: "Water Purification Units", location: "Chatrapur Depot", latitude: 19.3556, longitude: 84.9833, total: 4, currentlyUsed: 0, unit: "units", status: "Unavailable", disasterTypes: ["Flood", "Cyclone"] },
];
