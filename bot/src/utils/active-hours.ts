import {
  ActiveHours,
  DaySchedule,
} from '../database/schemas/restaurant.schema';

const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

type DayName = (typeof DAY_NAMES)[number];

/**
 * Get current time parts (hours, minutes, day of week) in the specified timezone
 * Returns an object with time components instead of a Date to avoid timezone issues
 */
function getCurrentTimeInTimezone(timezone: string): {
  hours: number;
  minutes: number;
  dayOfWeek: number;
} {
  const now = new Date();

  // Get hours and minutes in the target timezone
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const timeParts = timeFormatter.formatToParts(now);
  const hours = parseInt(
    timeParts.find((p) => p.type === 'hour')?.value || '0',
  );
  const minutes = parseInt(
    timeParts.find((p) => p.type === 'minute')?.value || '0',
  );

  // Get day of week in the target timezone
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });
  const dayStr = dayFormatter.format(now);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayMap[dayStr] ?? 0;

  return { hours, minutes, dayOfWeek };
}

/**
 * Convert time string "HH:mm" to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format time from 24h to 12h format for display
 */
export function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get day name from day of week number
 */
function getDayNameFromNumber(dayOfWeek: number): DayName {
  return DAY_NAMES[dayOfWeek];
}

/**
 * Check if the restaurant is currently open
 */
export function isRestaurantOpen(activeHours: ActiveHours): boolean {
  if (!activeHours) return true; // If no hours set, assume open

  const timezone = activeHours.timezone || 'Asia/Karachi';
  const now = getCurrentTimeInTimezone(timezone);
  const currentDay = getDayNameFromNumber(now.dayOfWeek);
  const schedule = activeHours[currentDay] as DaySchedule;

  if (!schedule || !schedule.isOpen) {
    return false;
  }

  const currentMinutes = now.hours * 60 + now.minutes;
  const openMinutes = timeToMinutes(schedule.openTime);
  const closeMinutes = timeToMinutes(schedule.closeTime);

  if (closeMinutes > openMinutes) {
    // Normal hours (e.g., 09:00 - 23:00)
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else {
    // Overnight hours (e.g., 18:00 - 03:00)
    // Restaurant is open if current time is after open OR before close
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }
}

/**
 * Get today's schedule with formatted times for the closed message
 */
export function getTodaySchedule(activeHours: ActiveHours): {
  dayName: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  openTime12h: string;
  closeTime12h: string;
} {
  const timezone = activeHours.timezone || 'Asia/Karachi';
  const now = getCurrentTimeInTimezone(timezone);
  const dayKey = getDayNameFromNumber(now.dayOfWeek);
  const schedule = activeHours[dayKey] as DaySchedule;

  const dayDisplayName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);

  if (!schedule) {
    return {
      dayName: dayDisplayName,
      isOpen: false,
      openTime: '',
      closeTime: '',
      openTime12h: '',
      closeTime12h: '',
    };
  }

  return {
    dayName: dayDisplayName,
    isOpen: schedule.isOpen,
    openTime: schedule.openTime,
    closeTime: schedule.closeTime,
    openTime12h: formatTime12h(schedule.openTime),
    closeTime12h: formatTime12h(schedule.closeTime),
  };
}

/**
 * Generate the closed message to send to customers
 */
export function generateClosedMessage(activeHours: ActiveHours): string {
  const today = getTodaySchedule(activeHours);

  if (!today.isOpen) {
    return (
      `🕐 We're currently closed.\n\n` +
      `We are closed on ${today.dayName}s.\n\n` +
      `Please message us on our open days!`
    );
  }

  return (
    `🕐 We're currently closed.\n\n` +
    `Our hours today (${today.dayName}):\n` +
    `Opens: ${today.openTime12h}\n` +
    `Closes: ${today.closeTime12h}\n\n` +
    `Please message us during our active hours!`
  );
}
