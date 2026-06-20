import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  error,
  className,
  id,
  ...rest
}) => {
  const inputId = id || rest.name || '';
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400 hover:border-slate-300',
            icon && 'pl-9',
            error && 'border-rose-300 focus:ring-rose-300/40 focus:border-rose-400',
            className,
          )}
          {...rest}
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, id, ...rest }) => {
  const inputId = id || rest.name || '';
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400 hover:border-slate-300 resize-y',
          error && 'border-rose-300 focus:ring-rose-300/40 focus:border-rose-400',
          className,
        )}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, className, id, ...rest }) => {
  const inputId = id || rest.name || '';
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400 hover:border-slate-300',
          error && 'border-rose-300 focus:ring-rose-300/40 focus:border-rose-400',
          className,
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
};
