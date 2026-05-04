"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, Loader2, Save, Copy } from "lucide-react";
import {
  ActiveHours,
  DaySchedule,
  DEFAULT_ACTIVE_HOURS,
  getActiveHours,
  updateActiveHours,
} from "@/lib/api/settings-api";
import { useToast } from "@/hooks/use-toast";

type DayName =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

const DAYS: { key: DayName; label: string; short: string }[] = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

export function ActiveHoursCard() {
  const { toast } = useToast();
  const [activeHours, setActiveHours] =
    useState<ActiveHours>(DEFAULT_ACTIVE_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Bulk apply state
  const [selectedDays, setSelectedDays] = useState<DayName[]>([]);
  const [bulkOpenTime, setBulkOpenTime] = useState("09:00");
  const [bulkCloseTime, setBulkCloseTime] = useState("23:00");

  useEffect(() => {
    loadActiveHours();
  }, []);

  async function loadActiveHours() {
    try {
      setLoading(true);
      const hours = await getActiveHours();
      setActiveHours(hours);
    } catch (error) {
      console.error("Failed to load active hours:", error);
      toast({
        title: "Error",
        description: "Failed to load active hours",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await updateActiveHours(activeHours);
      toast({
        title: "Saved",
        description: "Active hours updated successfully",
      });
    } catch (error) {
      console.error("Failed to save active hours:", error);
      toast({
        title: "Error",
        description: "Failed to save active hours",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function updateDay(day: DayName, updates: Partial<DaySchedule>) {
    setActiveHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }));
  }

  function toggleDaySelection(day: DayName) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function selectWeekdays() {
    setSelectedDays(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  }

  function selectWeekend() {
    setSelectedDays(["saturday", "sunday"]);
  }

  function selectAll() {
    setSelectedDays(DAYS.map((d) => d.key));
  }

  function clearSelection() {
    setSelectedDays([]);
  }

  function applyBulkHours() {
    if (selectedDays.length === 0) return;

    setActiveHours((prev) => {
      const updated = { ...prev };
      selectedDays.forEach((day) => {
        updated[day] = {
          ...updated[day],
          isOpen: true,
          openTime: bulkOpenTime,
          closeTime: bulkCloseTime,
        };
      });
      return updated;
    });

    toast({
      title: "Applied",
      description: `Hours applied to ${selectedDays.length} day(s)`,
    });
    setSelectedDays([]);
  }

  function markSelectedAsClosed() {
    if (selectedDays.length === 0) return;

    setActiveHours((prev) => {
      const updated = { ...prev };
      selectedDays.forEach((day) => {
        updated[day] = { ...updated[day], isOpen: false };
      });
      return updated;
    });

    toast({
      title: "Applied",
      description: `${selectedDays.length} day(s) marked as closed`,
    });
    setSelectedDays([]);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Active Hours</CardTitle>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
        <CardDescription>
          Set when your restaurant is open to receive orders. Customers
          messaging outside these hours will be notified.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bulk Apply Section */}
        <div className="rounded-lg border border-dashed border-border p-4 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Quick Apply</span>
          </div>

          {/* Day Selection */}
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <label
                key={day.key}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                  selectedDays.includes(day.key)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/50"
                }`}
              >
                <Checkbox
                  checked={selectedDays.includes(day.key)}
                  onCheckedChange={() => toggleDaySelection(day.key)}
                  className="sr-only"
                />
                <span className="text-sm">{day.short}</span>
              </label>
            ))}
          </div>

          {/* Quick Selection Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectWeekdays}
              className="text-xs"
            >
              Weekdays
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectWeekend}
              className="text-xs"
            >
              Weekend
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="text-xs"
            >
              All Days
            </Button>
            {selectedDays.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Bulk Time Inputs */}
          {selectedDays.length > 0 && (
            <div className="flex flex-wrap items-end gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Opens</Label>
                <input
                  type="time"
                  value={bulkOpenTime}
                  onChange={(e) => setBulkOpenTime(e.target.value)}
                  className="flex h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Closes</Label>
                <input
                  type="time"
                  value={bulkCloseTime}
                  onChange={(e) => setBulkCloseTime(e.target.value)}
                  className="flex h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm"
                />
              </div>
              <Button size="sm" onClick={applyBulkHours}>
                Apply to {selectedDays.length} day(s)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={markSelectedAsClosed}
              >
                Mark Closed
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Individual Day Schedule */}
        <div className="space-y-3">
          {DAYS.map((day) => {
            const schedule = activeHours[day.key];
            return (
              <div
                key={day.key}
                className={`flex items-center gap-4 p-3 rounded-lg border ${
                  schedule.isOpen
                    ? "border-border bg-background"
                    : "border-border/50 bg-muted/30"
                }`}
              >
                {/* Day Name & Toggle */}
                <div className="w-28 flex items-center gap-3">
                  <Switch
                    checked={schedule.isOpen}
                    onCheckedChange={(checked) =>
                      updateDay(day.key, { isOpen: checked })
                    }
                  />
                  <span
                    className={`font-medium ${
                      !schedule.isOpen ? "text-muted-foreground" : ""
                    }`}
                  >
                    {day.short}
                  </span>
                </div>

                {/* Times or Closed Label */}
                {schedule.isOpen ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={schedule.openTime}
                      onChange={(e) =>
                        updateDay(day.key, { openTime: e.target.value })
                      }
                      className="flex h-8 w-28 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                    <span className="text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={schedule.closeTime}
                      onChange={(e) =>
                        updateDay(day.key, { closeTime: e.target.value })
                      }
                      className="flex h-8 w-28 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                    {schedule.closeTime < schedule.openTime && (
                      <span className="text-xs text-muted-foreground">
                        (next day)
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Closed</span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Tip: If closing time is earlier than opening time (e.g., 6 PM - 3 AM),
          it&apos;s treated as overnight hours.
        </p>
      </CardContent>
    </Card>
  );
}
