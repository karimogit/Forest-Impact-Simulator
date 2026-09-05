import React from 'react';
import { LandscapeIcon } from '../ui/Icons';

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
  const isPlanting = simulationMode === 'planting';

  const Metric = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="text-sm font-semibold text-ink-900 tnum">{value}</span>
    </div>
  );

  return (
    <div className="space-y-4" role="tabpanel" id="landuse-panel" aria-labelledby="landuse-tab">
      <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
        <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <LandscapeIcon size={16} className="text-accent" />
          {isPlanting ? 'Land use improvements' : 'Land use impact assessment'}
        </h5>
        <div className="divide-y divide-sand-200">
          {selectedRegion && (
            <Metric
              label={isPlanting ? 'Erosion reduction' : 'Erosion risk increase'}
              value={isPlanting
                ? `${landUseImpact.erosionReduction.toFixed(0)}%`
                : `${(100 - landUseImpact.erosionReduction).toFixed(0)}%`}
            />
          )}
          <Metric
            label={isPlanting ? 'Soil quality improvement' : 'Soil quality degradation'}
            value={isPlanting
              ? `${landUseImpact.soilImprovement.toFixed(0)}%`
              : `${(100 - landUseImpact.soilImprovement).toFixed(0)}%`}
          />
          {selectedRegion && (
            <Metric
              label={isPlanting ? 'Habitat creation' : 'Habitat loss'}
              value={isPlanting
                ? `${landUseImpact.habitatCreation.toFixed(0)}%`
                : `${(100 - landUseImpact.habitatCreation).toFixed(0)}%`}
            />
          )}
          <Metric
            label={isPlanting ? 'Water quality improvement' : 'Water quality degradation'}
            value={isPlanting
              ? `${landUseImpact.waterQuality.toFixed(0)}%`
              : `${(100 - landUseImpact.waterQuality).toFixed(0)}%`}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-sand-200 bg-white p-4">
        <h5 className="mb-3 text-sm font-semibold text-ink-900">
          {isPlanting ? 'Land use benefits' : 'Land use impacts'}
        </h5>
        <ul className="space-y-2 text-sm text-ink-600">
          {isPlanting ? (
            <>
              <li>Soil erosion prevention and stabilization</li>
              <li>Improved soil fertility and structure</li>
              <li>Wildlife habitat creation and connectivity</li>
              <li>Water filtration and quality improvement</li>
              <li>Microclimate regulation and temperature moderation</li>
              <li>Land restoration and ecosystem recovery</li>
            </>
          ) : (
            <>
              <li>Increased soil erosion and instability</li>
              <li>Reduced soil fertility and structure degradation</li>
              <li>Wildlife habitat loss and fragmentation</li>
              <li>Reduced water filtration and quality decline</li>
              <li>Microclimate disruption and temperature changes</li>
              <li>Land degradation and ecosystem disruption</li>
            </>
          )}
        </ul>
      </div>

      <p className="text-xs italic text-ink-400">
        {isPlanting
          ? 'Land use improvements increase over time as the forest develops and matures.'
          : 'Land use impacts represent the environmental costs of forest removal and land conversion.'}
      </p>
    </div>
  );
};
