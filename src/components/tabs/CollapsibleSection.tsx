import React from 'react';
import { ChevronDownIcon } from '../ui/Icons';

interface CollapsibleSectionProps {
  title: string;
  value: string;
  description: string;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  value, 
  description, 
  isExpanded, 
  onToggle, 
  className = "" 
}) => {
  return (
    <div className={`rounded-2xl border border-sand-200 bg-white p-4 transition-colors hover:border-ink-300 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={isExpanded}
        aria-label={`${title}: ${value}`}
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-400">{title}</div>
          <div className="mt-1 font-display text-2xl leading-tight text-accent-strong tnum">{value}</div>
        </div>
        <ChevronDownIcon
          size={18}
          className={`mt-1 shrink-0 text-ink-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      {isExpanded && (
        <div className="mt-3 border-t border-sand-200 pt-3" role="region" aria-label={`Details for ${title}`}>
          <p className="text-sm leading-relaxed text-ink-600">{description}</p>
        </div>
      )}
    </div>
  );
};
