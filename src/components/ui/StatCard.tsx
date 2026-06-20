import React from 'react';
import { cn, formatCurrency } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { direction: 'up' | 'down' | 'flat'; value: string };
  variant?: 'default' | 'primary' | 'teal' | 'amber' | 'rose';
  className?: string;
  currency?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  className,
  currency,
}) => {
  const variants = {
    default: 'from-white to-slate-50 border-slate-100',
    primary: 'from-primary-50 to-white border-primary-100',
    teal: 'from-teal-50 to-white border-teal-100',
    amber: 'from-amber-50 to-white border-amber-100',
    rose: 'from-rose-50 to-white border-rose-100',
  };
  const iconVariants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-primary-100 text-primary-800',
    teal: 'bg-teal-100 text-teal-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
  };
  return (
    <div
      className={cn(
        'relative p-5 rounded-2xl border bg-gradient-to-br shadow-card hover:shadow-hover transition-all duration-300',
        variants[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
        </div>
        {icon && (
          <div className={cn('p-2.5 rounded-xl', iconVariants[variant])}>
            {icon}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
          {currency && typeof value === 'number' ? formatCurrency(value) : value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 text-xs">
            {subtitle && <span className="text-slate-500">{subtitle}</span>}
            {trend && (
              <span
                className={cn(
                  'font-medium',
                  trend.direction === 'up' && 'text-emerald-600',
                  trend.direction === 'down' && 'text-rose-600',
                  trend.direction === 'flat' && 'text-slate-500',
                )}
              >
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
