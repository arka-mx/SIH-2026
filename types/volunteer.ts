export type VolunteerStatus = "New request" | "Contacted" | "Assigned";

export interface Volunteer {
  id: string;
  name: string;
  location: string;
  service: "Medical Assistance" | "Food Distribution" | "Rescue Support" | "Transportation" | "Shelter Support";
  availability: string;
  contact: string;
  status: VolunteerStatus;
}
