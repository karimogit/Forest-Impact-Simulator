import React from 'react';

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
    <div className={`bg-white rounded shadow p-4 ${className}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded transition-colors"
        aria-expanded={isExpanded}
        aria-label={`${title}: ${value}`}
      >
        <div className="flex-1">
          <div className="text-xs text-gray-900 font-bold mb-1">{title}</div>
          <div className="text-primary font-bold text-sm">{value}</div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100" role="region" aria-label={`Details for ${title}`}>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
};
