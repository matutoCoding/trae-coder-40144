import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  children,
  disabled,
  ...rest
}) => {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary:
      'bg-gradient-to-r from-primary-800 to-primary-700 text-white shadow-sm hover:from-primary-700 hover:to-primary-600 hover:shadow-md focus:ring-primary-500',
    secondary:
      'bg-teal-500 text-white shadow-sm hover:bg-teal-600 hover:shadow-md focus:ring-teal-400',
    outline:
      'bg-white text-primary-800 border border-primary-200 hover:bg-primary-50 hover:border-primary-300 focus:ring-primary-300',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300',
    danger:
      'bg-rose-600 text-white shadow-sm hover:bg-rose-700 hover:shadow-md focus:ring-rose-400',
  };

  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
          <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {!loading && icon}
      {children}
    </button>
  );
};
