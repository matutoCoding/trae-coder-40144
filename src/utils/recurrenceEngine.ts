import { addDays, isAfter, isBefore, parseISO } from 'date-fns';
import { RecurringRule } from '@/types';
import { buildISODate, weekdayMatches } from './dateUtils';

export interface GeneratedOccurrence {
  date: string;
  weekdayLabel: string;
  startAt: string;
  endAt: string;
  hours: number;
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function generateOccurrences(
  rule: RecurringRule,
  limitWeeks = 12,
): GeneratedOccurrence[] {
  const result: GeneratedOccurrence[] = [];
  let cursor = parseISO(rule.startDate);
  const ruleEnd = parseISO(rule.endDate);
  const hardLimit = addDays(parseISO(rule.startDate), limitWeeks * 7);
  const effectiveEnd = isBefore(ruleEnd, hardLimit) ? ruleEnd : hardLimit;
  const step = rule.interval === 'biweekly' ? 14 : 7;

  while (!isAfter(cursor, effectiveEnd)) {
    for (let i = 0; i < 7; i++) {
      const d = addDays(cursor, i);
      if (isAfter(d, effectiveEnd)) break;
      if (isBefore(d, parseISO(rule.startDate))) continue;
      if (weekdayMatches(d, rule.weekdays)) {
        const startDT = buildISODate(d, rule.startTime);
        const endDT = buildISODate(d, rule.endTime);
        const hours =
          Math.round(((endDT.getTime() - startDT.getTime()) / 3600000) * 100) / 100;
        result.push({
          date: d.toISOString().slice(0, 10),
          weekdayLabel: WEEKDAY_LABELS[d.getDay()],
          startAt: startDT.toISOString(),
          endAt: endDT.toISOString(),
          hours,
        });
      }
    }
    cursor = addDays(cursor, step);
  }
  return result;
}

export function calcOccurrenceCost(
  occurrences: GeneratedOccurrence[],
  hourlyRate: number,
): { totalHours: number; totalAmount: number } {
  const totalHours = occurrences.reduce((s, o) => s + o.hours, 0);
  const totalAmount = Math.round(totalHours * hourlyRate * 100) / 100;
  return { totalHours, totalAmount };
}
