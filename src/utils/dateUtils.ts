import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  startOfMonth,
  endOfMonth,
  isSameDay,
  parseISO,
  differenceInMinutes,
  eachDayOfInterval,
  isWithinInterval,
  getDay,
  subMonths,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
export const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

export function formatDate(date: Date | string, pattern = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern);
}

export function formatDateTime(date: Date | string, pattern = 'yyyy-MM-dd HH:mm'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm');
}

export function getWeekDates(base: Date): Date[] {
  const start = startOfWeek(base, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getMonthDates(year: number, month: number): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(new Date(year, month)),
    end: endOfMonth(new Date(year, month)),
  });
}

export function formatCNDate(date: Date): string {
  return format(date, 'M月d日 EEEE', { locale: zhCN });
}

export function calcHours(startAt: string, endAt: string): number {
  const mins = differenceInMinutes(parseISO(endAt), parseISO(startAt));
  return Math.round((mins / 60) * 100) / 100;
}

export function isTimeOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const as = parseISO(aStart).getTime();
  const ae = parseISO(aEnd).getTime();
  const bs = parseISO(bStart).getTime();
  const be = parseISO(bEnd).getTime();
  return as < be && bs < ae;
}

export function dateInRange(dateStr: string, start: string, end: string): boolean {
  const d = parseISO(dateStr);
  return isWithinInterval(d, { start: parseISO(start), end: parseISO(end) });
}

export function combineDateAndTime(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00`;
}

export function getMonthKey(date = new Date()): { year: number; month: number } {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function getRecentMonths(n = 6): Array<{ year: number; month: number; label: string }> {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = subMonths(now, i);
    result.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
  }
  return result;
}

export function buildISODate(date: Date | string, hhmm: string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const [h, m] = hhmm.split(':').map(Number);
  const result = new Date(d);
  result.setHours(h, m, 0, 0);
  return result;
}

export function weekdayMatches(date: Date, weekdays: number[]): boolean {
  return weekdays.includes(getDay(date));
}

export function getWeeksInRange(startStr: string, endStr: string, weeks = 12): Date[] {
  const start = parseISO(startStr);
  const end = parseISO(endStr);
  const result: Date[] = [];
  const maxWeeks = Math.min(weeks, 52);
  let cursor = new Date(start);
  let count = 0;
  while (cursor <= end && count < maxWeeks * 7) {
    result.push(new Date(cursor));
    cursor = addDays(cursor, 1);
    count++;
  }
  if (result.length === 0) {
    for (let i = 0; i < 7; i++) {
      result.push(addDays(start, i));
    }
  }
  return result;
}

export { addDays, addWeeks, isSameDay, parseISO, startOfWeek };
