import React from 'react';
import { TreeType } from '@/types/treeTypes';
import { calculateAnnualCarbonWithGrowth, calculateClearCuttingCarbon } from '@/utils/treeCalculations';
import { CollapsibleSection } from './CollapsibleSection';

interface EnvironmentTabProps {
  simulationMode: 'planting' | 'clear-cutting';
  calculationMode: 'perTree' | 'perArea';
  years: number;
  averageTreeAge: number;
  totalTrees: number;
  impact: {
    carbonSequestration: number;
    biodiversityImpact: number;
    forestResilience: number;
    waterRetention: number;
    airQualityImprovement: number;
  };
  totalCarbon: number;
  averageBiodiversity: number;
  averageResilience: number;
  climate: {
    temperature: number | null;
    precipitation: number | null;
  } | null;
  expandedSections: { [key: string]: boolean };
  onToggleSection: (key: string) => void;
  formatTotalCarbon: (carbon: number) => string;
  getTotalCarbonUnit: () => string;
}

export const EnvironmentTab: React.FC<EnvironmentTabProps> = ({
  simulationMode,
  calculationMode,
  years,
  averageTreeAge,
  totalTrees,
  impact,
  totalCarbon,
  averageBiodiversity,
  averageResilience,
  climate,
  expandedSections,
  onToggleSection,
  formatTotalCarbon,
  getTotalCarbonUnit
}) => {
  const carbonCalc = calculateClearCuttingCarbon(impact.carbonSequestration, averageTreeAge, years);
  
  return (
    <div className="space-y-3" role="tabpanel" id="environment-panel" aria-labelledby="environment-tab">
      <div className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CollapsibleSection
            title={simulationMode === 'planting' ? "Annual Carbon Sequestration" : "Immediate Carbon Release"}
            value={calculationMode === 'perTree' 
              ? simulationMode === 'planting'
                ? `+${calculateAnnualCarbonWithGrowth(impact.carbonSequestration, years).toFixed(1)} kg CO₂/yr`
                : `${carbonCalc.immediate.toFixed(1)} kg CO₂`
              : simulationMode === 'planting'
                ? `+${(calculateAnnualCarbonWithGrowth(impact.carbonSequestration, years) / 1000).toFixed(1)} metric ton CO₂/yr`
                : `${formatTotalCarbon(carbonCalc.immediate * totalTrees)} metric tons CO₂`
            }
            description={calculationMode === 'perTree' 
              ? simulationMode === 'planting' 
                ? "Current year's carbon sequestration per tree based on growth stage. Trees start with low sequestration and increase as they mature over 20+ years."
                : `Carbon released immediately when cutting a ${averageTreeAge}-year-old tree. This represents the tree's current annual carbon sequestration rate.`
              : simulationMode === 'planting'
                ? `Current year's carbon sequestration for all ${totalTrees.toLocaleString()} trees in the selected area, based on tree growth stage. This is the yearly rate, not cumulative.`
                : `Carbon released immediately when cutting all ${totalTrees.toLocaleString()} trees at age ${averageTreeAge} years. This represents the current annual sequestration rate.`
            }
            isExpanded={expandedSections['annual-carbon'] || false}
            onToggle={() => onToggleSection('annual-carbon')}
          />
          
          <CollapsibleSection
            title={simulationMode === 'planting' ? "Total Carbon" : "Total Carbon Emissions"}
            value={simulationMode === 'planting' 
              ? `+${formatTotalCarbon(totalCarbon)} ${getTotalCarbonUnit().replace('metric tons', 't').replace('kg CO₂', 'kg CO₂')}`
              : calculationMode === 'perTree'
                ? `${formatTotalCarbon(carbonCalc.total)} kg CO₂`
                : `${formatTotalCarbon(carbonCalc.total)} metric tons CO₂`
            }
            description={calculationMode === 'perTree' 
              ? simulationMode === 'planting'
                ? (climate?.temperature !== null && climate?.temperature !== undefined && 
                   climate?.precipitation !== null && climate?.precipitation !== undefined 
                   ? "Total carbon sequestered per tree over the entire simulation period, accounting for tree growth and climate predictions"
                   : "Total carbon sequestered per tree over the entire simulation period, accounting for tree growth (climate predictions excluded due to unavailable data)")
                : `Total carbon emissions per tree: immediate release (${carbonCalc.immediate.toFixed(1)} kg) + lost future sequestration (${carbonCalc.lostFuture.toFixed(1)} kg) over ${years} years`
              : simulationMode === 'planting'
                ? `Total carbon sequestered by all ${totalTrees.toLocaleString()} trees over the entire simulation period, accounting for tree growth and climate predictions`
                : `Total carbon emissions for all ${totalTrees.toLocaleString()} trees: immediate release + lost future sequestration over ${years} years when cut at age ${averageTreeAge}`
            }
            isExpanded={expandedSections['total-carbon'] || false}
            onToggle={() => onToggleSection('total-carbon')}
          />
          
          <CollapsibleSection
            title="Biodiversity Impact"
            value={`${averageBiodiversity.toFixed(1)}/5`}
            description="Measures ecosystem diversity and habitat quality. Higher values indicate better biodiversity support and wildlife habitat creation."
            isExpanded={expandedSections['biodiversity'] || false}
            onToggle={() => onToggleSection('biodiversity')}
          />
          
          <CollapsibleSection
            title="Forest Resilience"
            value={`${averageResilience.toFixed(1)}/5`}
            description="Forest's ability to withstand climate change, pests, and disturbances. Higher values indicate more resilient ecosystems."
            isExpanded={expandedSections['resilience'] || false}
            onToggle={() => onToggleSection('resilience')}
          />
          
          <CollapsibleSection
            title="Water Retention"
            value={`${impact.waterRetention.toFixed(0)}%`}
            description="Percentage of rainfall retained in soil and groundwater. Improves over time as tree roots develop and soil structure improves."
            isExpanded={expandedSections['water-retention'] || false}
            onToggle={() => onToggleSection('water-retention')}
          />
          
          <CollapsibleSection
            title={simulationMode === 'planting' ? "Air Quality Improvement" : "Air Quality Impact"}
            value={`${impact.airQualityImprovement.toFixed(0)}%`}
            description={simulationMode === 'planting' 
              ? "Reduction in air pollution through particle filtration and oxygen production. Improves as trees mature and canopy develops."
              : "Degradation in air quality due to loss of trees. Negative values indicate air quality deterioration from removing forest cover."
            }
            isExpanded={expandedSections['air-quality'] || false}
            onToggle={() => onToggleSection('air-quality')}
          />
        </div>
      </div>
    </div>
  );
};
