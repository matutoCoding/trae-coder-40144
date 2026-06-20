import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

export function formatHours(h: number): string {
  return `${h.toFixed(1)}h`;
}

export function colorMap(color: string, shade: 50 | 100 | 200 | 500 | 600 | 700 | 800): string {
  const map: Record<string, Record<string, string>> = {
    blue: {
      '50': 'bg-blue-50',
      '100': 'bg-blue-100',
      '200': 'bg-blue-200',
      '500': 'bg-blue-500',
      '600': 'bg-blue-600',
      '700': 'bg-blue-700',
      '800': 'bg-primary-800',
    },
    green: {
      '50': 'bg-emerald-50',
      '100': 'bg-emerald-100',
      '200': 'bg-emerald-200',
      '500': 'bg-emerald-500',
      '600': 'bg-emerald-600',
      '700': 'bg-emerald-700',
      '800': 'bg-emerald-800',
    },
    amber: {
      '50': 'bg-amber-50',
      '100': 'bg-amber-100',
      '200': 'bg-amber-200',
      '500': 'bg-amber-500',
      '600': 'bg-amber-600',
      '700': 'bg-amber-700',
      '800': 'bg-amber-800',
    },
    rose: {
      '50': 'bg-rose-50',
      '100': 'bg-rose-100',
      '200': 'bg-rose-200',
      '500': 'bg-rose-500',
      '600': 'bg-rose-600',
      '700': 'bg-rose-700',
      '800': 'bg-rose-800',
    },
    violet: {
      '50': 'bg-violet-50',
      '100': 'bg-violet-100',
      '200': 'bg-violet-200',
      '500': 'bg-violet-500',
      '600': 'bg-violet-600',
      '700': 'bg-violet-700',
      '800': 'bg-violet-800',
    },
  };
  return map[color]?.[String(shade)] ?? 'bg-gray-100';
}

export function textColorMap(color: string): string {
  const map: Record<string, string> = {
    blue: 'text-blue-700',
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
    violet: 'text-violet-700',
  };
  return map[color] ?? 'text-gray-700';
}

export function borderColorMap(color: string): string {
  const map: Record<string, string> = {
    blue: 'border-blue-300',
    green: 'border-emerald-300',
    amber: 'border-amber-300',
    rose: 'border-rose-300',
    violet: 'border-violet-300',
  };
  return map[color] ?? 'border-gray-300';
}
