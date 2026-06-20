import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className,
}) => {
  const variants = {
    default: 'bg-primary-100 text-primary-800 border border-primary-200',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    danger: 'bg-rose-100 text-rose-800 border border-rose-200',
    info: 'bg-teal-100 text-teal-800 border border-teal-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  };
  const sizes = {
    sm: 'px-2 py-0.5 text-[11px] rounded-md',
    md: 'px-2.5 py-1 text-xs rounded-lg',
  };
  return (
    <span className={cn('inline-flex items-center font-medium', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
};
