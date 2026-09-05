import React from 'react';
import { InfoIcon, AlertIcon, Spinner } from './Icons';

/* ------------------------------------------------------------------
   Panel — the primary surface for each section of the tool
   ------------------------------------------------------------------ */
export const Panel = ({
  children,
  className = '',
  as: Tag = 'section',
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'article' }) => (
  <Tag
    className={`rounded-3xl border border-sand-200 bg-white shadow-card ${className}`}
    {...rest}
  >
    {children}
  </Tag>
);

/* ------------------------------------------------------------------
   StepHeader — numbered heading used at the top of each workflow step
   ------------------------------------------------------------------ */
export const StepHeader = ({
  step,
  title,
  description,
  icon,
  aside,
  id,
}: {
  step?: number | string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  aside?: React.ReactNode;
  id?: string;
}) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex items-start gap-4 min-w-0">
      {step !== undefined && (
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white text-sm font-semibold tnum shadow-sm">
          {step}
        </span>
      )}
      {icon && !step && (
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <h2 id={id} className="font-display text-xl sm:text-2xl text-ink-900 leading-tight">
          {title}
        </h2>
        {description && <div className="mt-1 text-sm text-ink-500 leading-relaxed">{description}</div>}
      </div>
    </div>
    {aside && <div className="shrink-0">{aside}</div>}
  </div>
);

/* ------------------------------------------------------------------
   Eyebrow — small uppercase label
   ------------------------------------------------------------------ */
export const Eyebrow = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 ${className}`}>
    {children}
  </span>
);

/* ------------------------------------------------------------------
   Badge
   ------------------------------------------------------------------ */
type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-sand-100 text-ink-700 border-sand-200',
  accent: 'bg-accent-soft text-accent-strong border-transparent',
  success: 'bg-forest-100 text-forest-800 border-transparent',
  warning: 'bg-ember-100 text-ember-700 border-transparent',
  danger: 'bg-red-50 text-red-700 border-red-100',
};

export const Badge = ({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeTones[tone]} ${className}`}
  >
    {children}
  </span>
);

/* ------------------------------------------------------------------
   Button
   ------------------------------------------------------------------ */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong shadow-sm',
  secondary: 'bg-white text-ink-700 border border-sand-300 hover:border-ink-300 hover:bg-sand-50',
  ghost: 'bg-transparent text-ink-700 hover:bg-sand-100',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-sm gap-2',
};

export const Button = ({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);

/* ------------------------------------------------------------------
   SegmentedControl
   ------------------------------------------------------------------ */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  ariaLabel,
  className = '',
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
  size?: 'sm' | 'md' | 'lg';
  ariaLabel: string;
  className?: string;
}) {
  const pad = size === 'lg' ? 'h-11 px-5 text-sm' : size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm';
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex items-center rounded-2xl border border-sand-200 bg-sand-100 p-1 ${className}`}
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-2 rounded-xl font-medium transition-all ${pad} ${
              active
                ? 'bg-white text-ink-900 shadow-sm ring-1 ring-sand-200'
                : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            {opt.icon && <span className={active ? 'text-accent' : 'text-ink-400'}>{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------
   Callout — informational / warning notes
   ------------------------------------------------------------------ */
export const Callout = ({
  tone = 'info',
  title,
  children,
  className = '',
}: {
  tone?: 'info' | 'warning' | 'accent';
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => {
  const styles =
    tone === 'warning'
      ? 'border-ember-200 bg-ember-50 text-ember-700'
      : tone === 'accent'
        ? 'border-transparent bg-accent-soft text-accent-strong'
        : 'border-sand-200 bg-sand-50 text-ink-700';
  const Icon = tone === 'warning' ? AlertIcon : InfoIcon;
  return (
    <div className={`flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed ${styles} ${className}`} role="note">
      <Icon size={18} className="mt-0.5 shrink-0 opacity-80" />
      <div className="min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
   DataRow — label / value pair used in configuration summaries
   ------------------------------------------------------------------ */
export const DataRow = ({
  label,
  value,
  hint,
  emphasize = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: string;
  emphasize?: boolean;
}) => (
  <div className="flex items-baseline justify-between gap-4 py-2.5">
    <dt className="text-sm text-ink-500 flex items-center gap-1.5" title={hint}>
      {label}
      {hint && <InfoIcon size={14} className="text-ink-300 cursor-help" />}
    </dt>
    <dd className={`text-right tnum ${emphasize ? 'text-base font-semibold text-accent-strong' : 'text-sm font-medium text-ink-900'}`}>
      {value}
    </dd>
  </div>
);

/* ------------------------------------------------------------------
   Loading / empty states
   ------------------------------------------------------------------ */
export const LoadingBlock = ({ label = 'Loading…', className = '' }: { label?: string; className?: string }) => (
  <div className={`flex items-center justify-center gap-3 rounded-2xl border border-dashed border-sand-300 bg-sand-50 text-sm text-ink-500 ${className}`}>
    <Spinner size={18} className="text-accent" />
    {label}
  </div>
);

export const EmptyState = ({
  icon,
  title,
  description,
  className = '',
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) => (
  <div className={`flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-6 py-10 ${className}`}>
    {icon && <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-400 shadow-sm">{icon}</div>}
    <p className="text-sm font-semibold text-ink-900">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
  </div>
);
