import { Incident } from "@/types/incident";

export const mockIncidents: Incident[] = [
  { id: "INC-1042", reporterName: "Ananya Das", location: "Gosaninuagaon, Brahmapur", disasterType: "Flood", injured: 8, casualties: 1, status: "unverified", reporterStatus: "immediate_help", timestamp: "Today, 09:42 AM", coordinates: "19.314, 84.794" },
  { id: "INC-1041", reporterName: "Rakesh Behera", location: "Hinjilicut Road", disasterType: "Building Collapse", injured: 4, casualties: 2, status: "unverified", reporterStatus: "immediate_help", timestamp: "Today, 09:18 AM", coordinates: "19.475, 84.739" },
  { id: "INC-1038", reporterName: "Meera Patnaik", location: "New Bus Stand", disasterType: "Fire", injured: 2, casualties: 0, status: "unverified", reporterStatus: "safe", timestamp: "Today, 08:54 AM", coordinates: "19.315, 84.782" },
  { id: "INC-1036", reporterName: "Sanjay Sahu", location: "Golanthara", disasterType: "Cyclone", injured: 6, casualties: 1, status: "unverified", reporterStatus: "immediate_help", timestamp: "Today, 08:21 AM", coordinates: "19.221, 84.875" },
  { id: "INC-1032", reporterName: "Lipi Mohanty", location: "Chatrapur", disasterType: "Flood", injured: 3, casualties: 0, status: "unverified", reporterStatus: "safe", timestamp: "Yesterday, 11:40 PM", coordinates: "19.355, 84.984" },
  { id: "INC-1028", reporterName: "Bijay Naik", location: "Khalikote", disasterType: "Landslide", injured: 5, casualties: 1, status: "unverified", reporterStatus: "immediate_help", timestamp: "Yesterday, 10:12 PM", coordinates: "19.610, 85.080" },
  { id: "INC-1024", reporterName: "Priya Rout", location: "Brahmapur Central", disasterType: "Flood", injured: 24, casualties: 5, status: "verified", reporterStatus: "immediate_help", timestamp: "Today, 07:56 AM", coordinates: "19.315, 84.794" },
  { id: "INC-1021", reporterName: "Arjun Mishra", location: "Aska Road", disasterType: "Fire", injured: 3, casualties: 0, status: "verified", reporterStatus: "safe", timestamp: "Today, 07:21 AM", coordinates: "19.280, 84.810" },
  { id: "INC-1019", reporterName: "Sunita Jena", location: "Berhampur University", disasterType: "Cyclone", injured: 7, casualties: 1, status: "verified", reporterStatus: "safe", timestamp: "Today, 06:48 AM", coordinates: "19.321, 84.866" },
  { id: "INC-1016", reporterName: "Amit Kumar", location: "Gopalpur Beach", disasterType: "Cyclone", injured: 12, casualties: 2, status: "verified", reporterStatus: "immediate_help", timestamp: "Yesterday, 11:15 PM", coordinates: "19.260, 84.906" },
  { id: "INC-1012", reporterName: "Kavita Rao", location: "Huma", disasterType: "Landslide", injured: 1, casualties: 0, status: "verified", reporterStatus: "safe", timestamp: "Yesterday, 09:44 PM", coordinates: "19.530, 84.930" },
  { id: "INC-1008", reporterName: "Nikhil Das", location: "Gate Bazaar", disasterType: "Building Collapse", injured: 9, casualties: 1, status: "verified", reporterStatus: "immediate_help", timestamp: "Yesterday, 08:32 PM", coordinates: "19.310, 84.790" },
];
