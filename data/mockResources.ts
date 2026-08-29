import { Resource } from "@/types/resource";

export const mockResources: Resource[] = [
  { id: "RES-101", name: "Dharavi NDRF Boat Unit", type: "Inflatable Rescue Boat", total: 12, currentlyUsed: 0, unit: "boats", status: "Available", location: "Mumbai Harbor Base", latitude: 19.076, longitude: 72.8777, disasterTypes: ["Flood", "Cyclone"] },
  { id: "RES-102", name: "City Hospital Rapid Ambulance", type: "Medical Ambulance", total: 4, currentlyUsed: 1, unit: "ambulances", status: "En route", location: "Central City Hospital", latitude: 19.320, longitude: 84.800, disasterTypes: ["Medical", "Flood", "Fire"] },
  { id: "RES-103", name: "Brahmapur Relief Camp Shelter #4", type: "Emergency Shelter", total: 300, currentlyUsed: 120, unit: "beds", status: "Available", location: "Sports Complex", latitude: 19.308, longitude: 84.788, disasterTypes: ["Flood", "Cyclone", "Landslide"] },
];
