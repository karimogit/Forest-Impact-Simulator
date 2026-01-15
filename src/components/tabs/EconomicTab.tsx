import React from 'react';

interface EconomicTabProps {
  simulationMode: 'planting' | 'clear-cutting';
  jobCreation: number;
}

export const EconomicTab: React.FC<EconomicTabProps> = ({
  simulationMode,
  jobCreation
}) => {
  return (
    <div className="space-y-3" role="tabpanel" id="economic-panel" aria-labelledby="economic-tab">
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
        <h5 className="font-semibold text-green-800 mb-2 flex items-center">
          {simulationMode === 'planting' ? 'Employment Impact' : 'Economic Impact'}
        </h5>
        <div className="space-y-2 text-xs text-primary">
          <div className="flex justify-between">
            <span className="font-semibold">
              {simulationMode === 'planting' ? 'Jobs Created:' : 'Jobs Affected:'}
            </span>
            <span className="font-medium">
              {jobCreation} jobs
            </span>
          </div>
          <div className="text-xs text-primary mt-2">
            {simulationMode === 'planting' 
              ? 'Based on typical forest project staffing needs for planting, maintenance, and monitoring.'
              : 'Based on typical forest management operations including logging, transportation, and processing activities.'
            }
          </div>
        </div>
      </div>
      
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
        <h5 className="font-semibold text-green-800 mb-2 flex items-center">
          {simulationMode === 'planting' ? 'Conservation Benefits' : 'Economic Considerations'}
        </h5>
        <ul className="text-xs text-primary space-y-1">
          {simulationMode === 'planting' ? (
            <>
              <li>• Conservation and restoration employment opportunities</li>
              <li>• Ecosystem services (clean water, air quality improvement)</li>
              <li>• Biodiversity protection and habitat creation</li>
              <li>• Environmental education and research opportunities</li>
              <li>• Climate resilience and adaptation benefits</li>
              <li>• Community engagement and stewardship</li>
            </>
          ) : (
            <>
              <li>• Logging and timber industry employment</li>
              <li>• Transportation and processing activities</li>
              <li>• Land development and conversion opportunities</li>
              <li>• Economic trade-offs with environmental costs</li>
              <li>• Short-term vs. long-term economic impacts</li>
              <li>• Alternative land use revenue potential</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};
