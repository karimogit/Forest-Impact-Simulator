import React from 'react';
import { BriefcaseIcon } from '../ui/Icons';

interface EconomicTabProps {
  simulationMode: 'planting' | 'clear-cutting';
  jobCreation: number;
}

export const EconomicTab: React.FC<EconomicTabProps> = ({
  simulationMode,
  jobCreation
}) => {
  const isPlanting = simulationMode === 'planting';
  return (
    <div className="space-y-4" role="tabpanel" id="economic-panel" aria-labelledby="economic-tab">
      <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
        <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <BriefcaseIcon size={16} className="text-accent" />
          {isPlanting ? 'Employment impact' : 'Economic impact'}
        </h5>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-ink-500">{isPlanting ? 'Jobs created' : 'Jobs affected'}</span>
          <span className="text-2xl font-semibold text-accent-strong tnum">{jobCreation}</span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          {isPlanting
            ? 'Based on typical forest project staffing needs for planting, maintenance, and monitoring.'
            : 'Based on typical forest management operations including logging, transportation, and processing activities.'}
        </p>
      </div>

      <div className="rounded-2xl border border-sand-200 bg-white p-4">
        <h5 className="mb-3 text-sm font-semibold text-ink-900">
          {isPlanting ? 'Conservation benefits' : 'Economic considerations'}
        </h5>
        <ul className="space-y-2 text-sm text-ink-600">
          {isPlanting ? (
            <>
              <li>Conservation and restoration employment opportunities</li>
              <li>Ecosystem services (clean water, air quality improvement)</li>
              <li>Biodiversity protection and habitat creation</li>
              <li>Environmental education and research opportunities</li>
              <li>Climate resilience and adaptation benefits</li>
              <li>Community engagement and stewardship</li>
            </>
          ) : (
            <>
              <li>Logging and timber industry employment</li>
              <li>Transportation and processing activities</li>
              <li>Land development and conversion opportunities</li>
              <li>Economic trade-offs with environmental costs</li>
              <li>Short-term vs. long-term economic impacts</li>
              <li>Alternative land use revenue potential</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};
