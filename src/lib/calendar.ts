import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { seasonOf, type Season } from './liturgical';

export type EventCategory = 'feast' | 'event' | 'liturgy' | 'outreach';

export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  description: string;
  category: EventCategory;
}

export interface DayCell {
  iso: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  season: Season | null;
  events: CalEvent[];
}

/** One calendar page (always full weeks, Sun-Sat) for the given month. */
export function buildMonthGrid(monthDate: Date, events: CalEvent[]): DayCell[] {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 });
  const today = new Date();

  return eachDayOfInterval({ start, end }).map((date) => {
    const iso = format(date, 'yyyy-MM-dd');
    return {
      iso,
      dayNumber: date.getDate(),
      inMonth: isSameMonth(date, monthDate),
      isToday: isSameDay(date, today),
      season: seasonOf(date),
      events: events.filter((e) => e.date === iso),
    };
  });
}

export function monthLabel(monthDate: Date): string {
  return format(monthDate, 'MMMM yyyy');
}

export function sortedByDate(events: CalEvent[]): CalEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date));
}

/** Local-date ISO string (YYYY-MM-DD) for comparing against event dates. */
export function isoDay(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** A time worth printing: "All Day" is the default and adds nothing. */
export function displayTime(time: string): string | null {
  return time && time.toLowerCase() !== 'all day' ? time : null;
}

export function formatAgendaDate(iso: string): string {
  return format(parseISO(iso), 'EEE, d MMM yyyy');
}

export const categoryLabel: Record<EventCategory, string> = {
  feast: 'Feast',
  event: 'ACC Event',
  liturgy: 'Liturgy',
  outreach: 'Outreach',
};
