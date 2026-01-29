import React from 'react';

interface LandUseTabProps {
  simulationMode: 'planting' | 'clear-cutting';
  selectedRegion: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null | undefined;
  landUseImpact: {
    erosionReduction: number;
    soilImprovement: number;
    habitatCreation: number;
    waterQuality: number;
  };
}

export const LandUseTab: React.FC<LandUseTabProps> = ({
  simulationMode,
  selectedRegion,
  landUseImpact
}) => {
  return (
    <div className="space-y-3" role="tabpanel" id="landuse-panel" aria-labelledby="landuse-tab">
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
        <h5 className="font-semibold text-green-800 mb-2 flex items-center">
          {simulationMode === 'planting' ? 'Land Use Improvements' : 'Land Use Impact Assessment'}
        </h5>
        <div className="space-y-3 text-sm md:text-base text-primary">
          {selectedRegion && (
            <div className="flex justify-between">
              <span>{simulationMode === 'planting' ? 'Erosion Reduction:' : 'Erosion Risk Increase:'}</span>
              <span className="font-medium">
                {simulationMode === 'planting' 
                  ? `${landUseImpact.erosionReduction.toFixed(0)}%`
                  : `${(100 - landUseImpact.erosionReduction).toFixed(0)}%`
                }
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{simulationMode === 'planting' ? 'Soil Quality Improvement:' : 'Soil Quality Degradation:'}</span>
            <span className="font-medium">
              {simulationMode === 'planting' 
                ? `${landUseImpact.soilImprovement.toFixed(0)}%`
                : `${(100 - landUseImpact.soilImprovement).toFixed(0)}%`
              }
            </span>
          </div>
          {selectedRegion && (
            <div className="flex justify-between">
              <span>{simulationMode === 'planting' ? 'Habitat Creation:' : 'Habitat Loss:'}</span>
              <span className="font-medium">
                {simulationMode === 'planting' 
                  ? `${landUseImpact.habitatCreation.toFixed(0)}%`
                  : `${(100 - landUseImpact.habitatCreation).toFixed(0)}%`
                }
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{simulationMode === 'planting' ? 'Water Quality Improvement:' : 'Water Quality Degradation:'}</span>
            <span className="font-medium">
              {simulationMode === 'planting' 
                ? `${landUseImpact.waterQuality.toFixed(0)}%`
                : `${(100 - landUseImpact.waterQuality).toFixed(0)}%`
              }
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
        <h5 className="font-semibold text-green-800 mb-2 flex items-center">
          {simulationMode === 'planting' ? 'Land Use Benefits' : 'Land Use Impacts'}
        </h5>
        <ul className="text-sm md:text-base text-primary space-y-2">
          {simulationMode === 'planting' ? (
            <>
              <li>• Soil erosion prevention and stabilization</li>
              <li>• Improved soil fertility and structure</li>
              <li>• Wildlife habitat creation and connectivity</li>
              <li>• Water filtration and quality improvement</li>
              <li>• Microclimate regulation and temperature moderation</li>
              <li>• Land restoration and ecosystem recovery</li>
            </>
          ) : (
            <>
              <li>• Increased soil erosion and instability</li>
              <li>• Reduced soil fertility and structure degradation</li>
              <li>• Wildlife habitat loss and fragmentation</li>
              <li>• Reduced water filtration and quality decline</li>
              <li>• Microclimate disruption and temperature changes</li>
              <li>• Land degradation and ecosystem disruption</li>
            </>
          )}
        </ul>
      </div>
      
      <div className="text-sm md:text-base text-gray-600 italic">
        {simulationMode === 'planting' 
          ? 'Land use improvements increase over time as the forest develops and matures'
          : 'Land use impacts represent the environmental costs of forest removal and land conversion'
        }
      </div>
    </div>
  );
};
