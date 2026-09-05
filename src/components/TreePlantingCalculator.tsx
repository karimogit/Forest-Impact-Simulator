"use client";

import React, { useState, useEffect } from 'react';
import { TreeType } from '@/types/treeTypes';
import {
  RegionBounds,
  TreePlantingConfig,
  calculateTreePlanting,
  formatArea,
  formatNumber,
  TREE_SPACING_CONFIGS,
  getRecommendedSpacing,
  calculatePlantingTimeline
} from '@/utils/treePlanting';
import { ExportData } from '@/utils/exportUtils';
import { formatLatitude, formatLongitude } from '@/utils/geo';
import { SegmentedControl, DataRow, Callout, Badge } from './ui/primitives';
import { CalendarIcon, RulerIcon, ThermometerIcon, DropletIcon } from './ui/Icons';

// Types for soil and climate data
interface SoilData {
  carbon: number | null;
  ph: number | null;
  isEstimated?: boolean;
}

interface ClimateData {
  temperature: number | null;
  precipitation: number | null;
  isEstimated?: boolean;
  historicalData?: {
    temperatures: number[];
    precipitations: number[];
  };
}

// CollapsibleSection component and interface removed as they're unused

// Helper function for climate trend calculation
const calculateLinearTrend = (years: number[], values: number[]): number => {
  if (years.length !== values.length || years.length < 2) return 0;
  
  const n = years.length;
  const sumX = years.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = years.reduce((sum, year, i) => sum + year * values[i], 0);
  const sumXX = years.reduce((sum, year) => sum + year * year, 0);
  
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
};

interface TreePlantingCalculatorProps {
  selectedRegion: RegionBounds | null;
  selectedTreeType: TreeType | null;
  selectedTrees?: TreeType[];
  treePercentages?: { [key: string]: number };
  onDataReady?: (data: Partial<ExportData>) => void;
  simulationMode?: 'planting' | 'clear-cutting';
  years?: number;
  onYearsChange?: (years: number) => void;
  onCalculationModeChange?: (mode: 'perTree' | 'perArea') => void;
  onTreeAgeChange?: (age: number) => void;
  soil?: SoilData | null;
  climate?: ClimateData | null;
}

const TreePlantingCalculator: React.FC<TreePlantingCalculatorProps> = ({
  selectedRegion,
  selectedTreeType,
  selectedTrees,
  treePercentages,
  onDataReady,
  simulationMode = 'planting',
  years = 50,
  onYearsChange,
  onCalculationModeChange,
  onTreeAgeChange,
  soil,
  climate
}) => {
  const [customSpacing, setCustomSpacing] = useState<number | undefined>();
  const [calculationMode, setCalculationMode] = useState<'perTree' | 'perArea'>('perArea');
  const [averageTreeAge, setAverageTreeAge] = useState<number>(20); // Default to 20 years for mature forests

  // Notify parent when calculation mode changes
  useEffect(() => {
    if (onCalculationModeChange) {
      onCalculationModeChange(calculationMode);
    }
  }, [calculationMode, onCalculationModeChange]);

  // Notify parent when tree age changes
  useEffect(() => {
    if (onTreeAgeChange) {
      onTreeAgeChange(averageTreeAge);
    }
  }, [averageTreeAge, onTreeAgeChange]);

  // Determine which tree to use for planting calculations
  const treeForPlanting = selectedTreeType || (selectedTrees && selectedTrees.length > 0 ? selectedTrees[0] : null);
  
  // Calculate planting configuration with useMemo to recalculate when customSpacing changes
  const plantingConfig = React.useMemo(() => {
    let config: TreePlantingConfig | undefined;
    
    if (selectedRegion && treeForPlanting) {
      if (selectedTrees && selectedTrees.length > 1 && treePercentages) {
        // For multiple trees, calculate weighted average spacing
        let totalWeight = 0;
        let weightedSpacing = 0;
        
        selectedTrees.forEach(tree => {
          const percentage = treePercentages[tree.id] || 0;
          const spacingKey = getRecommendedSpacing(tree.name);
          const spacing = TREE_SPACING_CONFIGS[spacingKey].spacing;
          
          totalWeight += percentage;
          weightedSpacing += spacing * (percentage / 100);
        });
        
        // Use weighted average spacing, but ensure it's within reasonable bounds
        let avgSpacing = totalWeight > 0 ? weightedSpacing : TREE_SPACING_CONFIGS.standard.spacing;
        
        // Ensure spacing is within reasonable bounds (2.5m to 6.0m)
        avgSpacing = Math.max(2.5, Math.min(6.0, avgSpacing));
        
        // If percentages don't add up to 100%, adjust to use standard spacing
        if (Math.abs(totalWeight - 100) > 5) {
          avgSpacing = TREE_SPACING_CONFIGS.standard.spacing;
        }
        
        config = calculateTreePlanting(
          selectedRegion,
          'mixed', // Use 'mixed' to trigger custom spacing
          customSpacing ?? avgSpacing
        );
      } else {
        // Single tree or no percentages - use normal calculation
        config = calculateTreePlanting(
          selectedRegion,
          treeForPlanting.name,
          customSpacing
        );
      }

    }
    
    return config;
  }, [selectedRegion, treeForPlanting, selectedTrees, treePercentages, customSpacing]);

  // Call onDataReady callback when data is available
  const plantingTimeline = React.useMemo(
    () => plantingConfig ? calculatePlantingTimeline(plantingConfig.totalTrees) : null,
    [plantingConfig]
  );

  React.useEffect(() => {
    if (onDataReady && selectedRegion && plantingConfig && plantingTimeline) {
      onDataReady({
        plantingData: {
          area: plantingConfig.area,
          totalTrees: plantingConfig.totalTrees,
          spacing: plantingConfig.spacing,
          density: plantingConfig.density,
          timeline: {
            yearsToComplete: plantingTimeline.yearsToComplete,
            treesPerSeason: plantingTimeline.treesPerSeason
          }
        }
      });
    }
  }, [onDataReady, selectedRegion, plantingConfig, plantingTimeline, customSpacing]);

  // Early return checks - must be after all hooks
  if (!selectedRegion || (!selectedTreeType && (!selectedTrees || selectedTrees.length === 0))) {
    return null;
  }
  
  if (!treeForPlanting) {
    return null;
  }

  if (!plantingConfig) {
    return null;
  }



  const ageLabel =
    averageTreeAge < 10 ? 'Young' :
    averageTreeAge < 60 ? 'Mature' : 'Ancient';

  return (
    <div className="space-y-5">
      {/* Calculation mode */}
      <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label className="text-sm font-semibold text-ink-900">Calculation mode</label>
            <p className="mt-0.5 text-xs text-ink-500">
              {calculationMode === 'perTree' ? 'Impact per individual tree' : 'Impact for the entire selected area'}
            </p>
          </div>
          <SegmentedControl
            ariaLabel="Calculation mode"
            value={calculationMode}
            onChange={setCalculationMode}
            options={[
              { value: 'perTree', label: 'Per tree' },
              { value: 'perArea', label: 'Per area' },
            ]}
          />
        </div>
      </div>

      {/* Simulation duration */}
      {onYearsChange && (
        <div className="rounded-2xl border border-sand-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label htmlFor="years" className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <CalendarIcon size={16} className="text-accent" />
              Simulation duration
            </label>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-strong tnum">
              {years} year{years !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 text-center text-xs font-medium text-ink-400 tnum">1</span>
            <input
              id="years"
              type="range"
              min={1}
              max={100}
              value={years}
              onChange={e => onYearsChange(Number(e.target.value))}
              onWheel={e => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -1 : 1;
                const newValue = Math.max(1, Math.min(100, years + delta));
                onYearsChange(newValue);
              }}
              className="range flex-1"
              style={{
                background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((years - 1) / 99) * 100}%, var(--sand-200) ${((years - 1) / 99) * 100}%, var(--sand-200) 100%)`
              }}
            />
            <span className="w-8 text-center text-xs font-medium text-ink-400 tnum">100</span>
          </div>
        </div>
      )}

      {/* Project summary */}
      <div className="rounded-2xl border border-sand-200 bg-white p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">
          {simulationMode === 'planting' ? 'Planting configuration' : 'Removal configuration'}
        </h4>
        <dl className="divide-y divide-sand-200">
          <DataRow label="Area size" value={formatArea(plantingConfig.area)} emphasize />
          {selectedRegion && (
            <DataRow
              label="Coordinates"
              value={
                <span className="block text-right text-xs leading-relaxed tnum">
                  {formatLatitude(selectedRegion.south)} – {formatLatitude(selectedRegion.north)}
                  <br />
                  {formatLongitude(selectedRegion.west)} – {formatLongitude(selectedRegion.east)}
                </span>
              }
            />
          )}
          <DataRow
            label="Spacing"
            value={`${plantingConfig.spacing} m`}
            hint="Tree spacing is optimized for healthy growth, allowing adequate sunlight, water, and root space."
          />
          <DataRow
            label="Density"
            value={`${formatNumber(plantingConfig.density)} trees/ha`}
            hint="Trees per hectare = 10,000 m² ÷ (spacing in meters)²."
          />
          <DataRow label="Total trees" value={formatNumber(plantingConfig.totalTrees)} emphasize />
          {plantingTimeline && (
            <>
              <DataRow label="Project scale" value={plantingTimeline.projectScale} />
              <DataRow
                label="Planting timeline"
                value={`${plantingTimeline.yearsToComplete} yr${plantingTimeline.yearsToComplete === 1 ? '' : 's'} · ${formatNumber(plantingTimeline.treesPerSeason)} trees/season`}
              />
            </>
          )}
        </dl>

        {selectedTrees && selectedTrees.length > 1 && (
          <Callout tone="accent" className="mt-4">
            <strong>Multi-species spacing:</strong> Spacing is calculated as a weighted average based on your species selection and percentages.
          </Callout>
        )}
      </div>

      {/* Additional settings */}
      <div className="space-y-4">
        {calculationMode === 'perArea' && (
          <div className="rounded-2xl border border-sand-200 bg-white p-4">
            <label
              htmlFor="custom-spacing"
              className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900"
              title="Adjust spacing for specific site conditions, access requirements, or management goals."
            >
              <RulerIcon size={16} className="text-accent" />
              Custom spacing (meters)
            </label>
            <div className="flex gap-2">
              <input
                id="custom-spacing"
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={customSpacing || ''}
                onChange={(e) => setCustomSpacing(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Auto"
                className="plain h-10 flex-1 rounded-xl border border-sand-300 bg-white px-3 text-sm font-medium text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
              />
              <button
                type="button"
                onClick={() => setCustomSpacing(undefined)}
                className="rounded-xl border border-sand-300 bg-sand-50 px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-sand-100"
              >
                Auto
              </button>
            </div>
          </div>
        )}

        {simulationMode === 'clear-cutting' && (
          <div className="rounded-2xl border border-sand-200 bg-white p-4">
            <label
              htmlFor="tree-age"
              className="mb-2 block text-sm font-semibold text-ink-900"
              title="Enter the average age of trees in this forest area. This affects carbon emission calculations."
            >
              Average tree age (years)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="tree-age"
                type="number"
                min="1"
                max="200"
                step="1"
                value={averageTreeAge || ''}
                onChange={(e) => setAverageTreeAge(e.target.value ? parseInt(e.target.value) : 20)}
                className="plain h-10 flex-1 rounded-xl border border-sand-300 bg-white px-3 text-sm font-medium text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
              />
              <Badge tone={averageTreeAge >= 60 ? 'warning' : 'neutral'}>{ageLabel}</Badge>
            </div>
          </div>
        )}

        {(soil || climate) && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">Environmental data</h4>

            {soil && (
              <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <h5 className="text-sm font-semibold text-ink-900">Soil</h5>
                  {soil.isEstimated && <Badge tone="warning">Estimated</Badge>}
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">Carbon content</dt>
                    <dd className="font-semibold text-ink-900 tnum">
                      {soil?.carbon != null ? `${soil.carbon.toFixed(1)} g/kg` : 'Not available'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-500">pH level</dt>
                    <dd className="font-semibold text-ink-900 tnum">
                      {soil?.ph != null ? soil.ph.toFixed(1) : 'Not available'}
                    </dd>
                  </div>
                  {soil?.carbon && (
                    <div className="border-t border-sand-200 pt-2 text-xs text-ink-600">
                      <strong>Carbon bonus:</strong> +{(soil.carbon * 0.1).toFixed(1)} kg CO₂/year per tree
                    </div>
                  )}
                  {soil.isEstimated && (
                    <p className="border-t border-sand-200 pt-2 text-xs text-ink-500">
                      Soil data unavailable for this location. Using climate-zone estimates.
                    </p>
                  )}
                </dl>
              </div>
            )}

            {climate && (
              <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <h5 className="text-sm font-semibold text-ink-900">Climate</h5>
                  {climate.isEstimated && <Badge tone="warning">Estimated</Badge>}
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="flex items-center gap-1.5 text-ink-500"><ThermometerIcon size={14} /> Temperature</dt>
                    <dd className="font-semibold text-ink-900 tnum">
                      {climate?.temperature != null ? `${climate.temperature.toFixed(1)}°C` : 'Estimated from latitude'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="flex items-center gap-1.5 text-ink-500"><DropletIcon size={14} /> Annual precipitation</dt>
                    <dd className="font-semibold text-ink-900 tnum">
                      {climate?.precipitation != null ? `${climate.precipitation.toFixed(1)} mm` : 'Estimated from latitude'}
                    </dd>
                  </div>
                  {climate?.historicalData && climate.historicalData.temperatures.length > 0 && (
                    <div className="border-t border-sand-200 pt-2 text-xs text-ink-600">
                      <strong>Climate trend:</strong>{' '}
                      {calculateLinearTrend(
                        Array.from({ length: climate.historicalData.temperatures.length }, (_, i) => i),
                        climate.historicalData.temperatures
                      ).toFixed(3)}°C/year
                    </div>
                  )}
                  {climate.isEstimated && (
                    <p className="border-t border-sand-200 pt-2 text-xs text-ink-500">
                      Climate data unavailable for this location. Using climate-zone estimates.
                    </p>
                  )}
                </dl>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TreePlantingCalculator; 