import { addDays, parseISO, format } from 'date-fns';

export interface IcsEvent {
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** A single all-day VEVENT, as its own VCALENDAR — one event per download. */
export function buildIcsContent(event: IcsEvent): string {
  const start = parseISO(`${event.date}T00:00:00`);
  const dtstart = format(start, 'yyyyMMdd');
  const dtend = format(addDays(start, 1), 'yyyyMMdd'); // iCal all-day DTEND is exclusive
  const uid = `${event.date}-${slug(event.title)}@acc-kengeri.org`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Association of Christian Christites//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Triggers a browser download of the event as a .ics file. Client-only. */
export function downloadIcs(event: IcsEvent) {
  const content = buildIcsContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(event.title)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
