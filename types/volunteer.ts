export type VolunteerStatus = "Available" | "Contacted" | "Assigned";

export interface Volunteer {
  id: string;
  name: string;
  location: string;
  service: string;
  availability: string;
  contact: string;
  status: VolunteerStatus;
}
