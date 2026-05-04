import { getStoredToken } from "./auth-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface DaySchedule {
  isOpen: boolean;
  openTime: string; // "09:00" (24h format)
  closeTime: string; // "23:00" or "03:00" (next day)
}

export interface ActiveHours {
  sunday: DaySchedule;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  timezone: string;
}

export const DEFAULT_ACTIVE_HOURS: ActiveHours = {
  sunday: { isOpen: true, openTime: "09:00", closeTime: "23:00" },
  monday: { isOpen: true, openTime: "09:00", closeTime: "23:00" },
  tuesday: { isOpen: true, openTime: "09:00", closeTime: "23:00" },
  wednesday: { isOpen: true, openTime: "09:00", closeTime: "23:00" },
  thursday: { isOpen: true, openTime: "09:00", closeTime: "23:00" },
  friday: { isOpen: true, openTime: "09:00", closeTime: "23:00" },
  saturday: { isOpen: true, openTime: "09:00", closeTime: "23:00" },
  timezone: "Asia/Karachi",
};

function getAuthHeaders() {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getActiveHours(): Promise<ActiveHours> {
  const response = await fetch(`${API_BASE_URL}/api/admin/active-hours`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch active hours");
  }

  return response.json();
}

export async function updateActiveHours(
  activeHours: ActiveHours
): Promise<ActiveHours> {
  const response = await fetch(`${API_BASE_URL}/api/admin/active-hours`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ activeHours }),
  });

  if (!response.ok) {
    throw new Error("Failed to update active hours");
  }

  return response.json();
}

// Restaurant Info
export interface RestaurantInfo {
  name: string;
  address: string;
  city: string;
  deliveryFee: number;
  minOrderAmount: number;
  imageUrl: string;
}

export async function getRestaurantInfo(): Promise<RestaurantInfo> {
  const response = await fetch(`${API_BASE_URL}/api/admin/restaurant`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch restaurant info");
  }

  return response.json();
}

export async function updateRestaurantInfo(
  info: Partial<RestaurantInfo>
): Promise<RestaurantInfo> {
  const response = await fetch(`${API_BASE_URL}/api/admin/restaurant`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(info),
  });

  if (!response.ok) {
    throw new Error("Failed to update restaurant info");
  }

  return response.json();
}

export async function uploadRestaurantImage(
  file: File
): Promise<{ imageUrl: string }> {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_BASE_URL}/api/admin/restaurant/image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload image");
  }

  return response.json();
}
