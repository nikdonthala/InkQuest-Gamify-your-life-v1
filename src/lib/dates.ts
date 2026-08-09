// ---- date helpers ----

export const pad = (n: number) => String(n).padStart(2, '0');

export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => iso(new Date());

export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export const daysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

export const dateFromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** last n days as ISO strings, ending today */
export function lastNDays(n: number, end = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(iso(addDays(end, -i)));
  return out;
}

export function monthGrid(year: number, month: number) {
  // returns cells: {iso, day, weekday, inMonth}
  const first = new Date(year, month, 1);
  const startWd = first.getDay();
  const dim = daysInMonth(year, month);
  const cells: { iso: string; day: number; weekday: number; inMonth: boolean }[] = [];
  for (let i = 0; i < startWd; i++) cells.push({ iso: '', day: 0, weekday: i, inMonth: false });
  for (let d = 1; d <= dim; d++) {
    const date = new Date(year, month, d);
    cells.push({ iso: iso(date), day: d, weekday: date.getDay(), inMonth: true });
  }
  return cells;
}

export function monthDates(year: number, month: number): { iso: string; day: number }[] {
  const dim = daysInMonth(year, month);
  const out: { iso: string; day: number }[] = [];
  for (let d = 1; d <= dim; d++) out.push({ iso: iso(new Date(year, month, d)), day: d });
  return out;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const monthLabel = (mk: string) => {
  const [y, m] = mk.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

export const monthShortLabel = (mk: string) => {
  const [y, m] = mk.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${String(y).slice(2)}`;
};

export const weekdayLetter = (d: Date) => DAY_LETTERS[d.getDay()];

export const todayWeekdayIndex = (d = new Date()) => d.getDay();
