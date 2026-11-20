/**
 * Liturgical seasons for the Calendar's faint tint layer.
 * Only the two penitential seasons are marked (Lent and Advent). Everything
 * else is Ordinary Time / festal and stays untinted, so the grid never turns
 * into confetti.
 */
export type Season = 'lent' | 'advent';

/** Western (Gregorian) Easter Sunday, via the Anonymous Gregorian algorithm. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

/** First Sunday of Advent: the fourth Sunday before Christmas Day. */
export function adventStart(year: number): Date {
  const christmas = new Date(year, 11, 25);
  // Sunday on or before Dec 24, then back three more weeks.
  const lastSunday = addDays(christmas, -(christmas.getDay() === 0 ? 7 : christmas.getDay()));
  return addDays(lastSunday, -21);
}

const cache = new Map<number, { lentStart: number; lentEnd: number; adventStart: number; adventEnd: number }>();

function bounds(year: number) {
  let b = cache.get(year);
  if (!b) {
    const easter = easterSunday(year);
    b = {
      lentStart: addDays(easter, -46).getTime(), // Ash Wednesday
      lentEnd: addDays(easter, -1).getTime(), // Holy Saturday
      adventStart: adventStart(year).getTime(),
      adventEnd: new Date(year, 11, 24).getTime(),
    };
    cache.set(year, b);
  }
  return b;
}

/** The penitential season a calendar day falls in, or null. */
export function seasonOf(date: Date): Season | null {
  const t = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const b = bounds(date.getFullYear());
  if (t >= b.lentStart && t <= b.lentEnd) return 'lent';
  if (t >= b.adventStart && t <= b.adventEnd) return 'advent';
  return null;
}
