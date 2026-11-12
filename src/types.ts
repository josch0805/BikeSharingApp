export type Role = "admin" | "member";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: Role;
}

export interface Resource {
  id: string;
  name: string;
  description: string;
  kind: string;
  active: boolean;
  current_location: string;
  current_lat: number | null;
  current_lng: number | null;
  location_updated_at: string | null;
}

export type BookingStatus = "booked" | "returned" | "cancelled";

export interface Booking {
  id: string;
  resource_id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  note: string;
  status: BookingStatus;
  returned_at: string | null;
  return_location: string | null;
  return_lat: number | null;
  return_lng: number | null;
  profiles?: { display_name: string } | null;
  resources?: { name: string } | null;
}
