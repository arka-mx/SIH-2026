import { Incident } from "@/types/incident";

export const mockIncidents: Incident[] = [
  { id: "INC-1042", reporterName: "Ananya Das", location: "Gosaninuagaon, Brahmapur", disasterType: "Flood", injured: 8, casualties: 1, status: "unverified", reporterStatus: "immediate_help", timestamp: "Today, 09:42 AM", coordinates: "19.314, 84.794" },
  { id: "INC-1041", reporterName: "Rakesh Behera", location: "Hinjilicut Road", disasterType: "Building Collapse", injured: 4, casualties: 2, status: "unverified", reporterStatus: "immediate_help", timestamp: "Today, 09:18 AM", coordinates: "19.475, 84.739" },
  { id: "INC-1038", reporterName: "Meera Patnaik", location: "New Bus Stand", disasterType: "Fire", injured: 2, casualties: 0, status: "unverified", reporterStatus: "safe", timestamp: "Today, 08:54 AM", coordinates: "19.315, 84.782" },
  { id: "INC-1024", reporterName: "Priya Rout", location: "Brahmapur Central", disasterType: "Flood", injured: 24, casualties: 5, status: "verified", reporterStatus: "immediate_help", timestamp: "Today, 07:56 AM", coordinates: "19.315, 84.794" },
  { id: "INC-1021", reporterName: "Arjun Mishra", location: "Aska Road", disasterType: "Fire", injured: 3, casualties: 0, status: "verified", reporterStatus: "safe", timestamp: "Today, 07:21 AM", coordinates: "19.280, 84.810" },
];
