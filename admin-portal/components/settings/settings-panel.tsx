"use client";

import { RestaurantInfoCard } from "./restaurant-info-card";
import { ActiveHoursCard } from "./active-hours-card";

export function SettingsPanel() {
  return (
    <div className="space-y-6">
      {/* Restaurant Info */}
      <RestaurantInfoCard />

      {/* Active Hours */}
      <ActiveHoursCard />
    </div>
  );
}
