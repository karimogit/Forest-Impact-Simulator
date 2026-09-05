"use client";

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { TreeType, getTreeTypeById } from '@/types/treeTypes';
import { ExportData } from '@/utils/exportUtils';
import { getShareParameterFromUrl, decodeUrlToState } from '@/utils/shareableLink';
import { logger } from '@/utils/logger';
import { equalSplitPercentages, hasCoordinates } from '@/utils/geo';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import FaqSection from '@/components/FaqSection';
import { Panel, StepHeader, Eyebrow, Callout, LoadingBlock, EmptyState } from '@/components/ui/primitives';
import { SproutIcon, AxeIcon, RefreshIcon, CheckIcon, MapPinIcon, TreeIcon, ChartIcon } from '@/components/ui/Icons';

// Lazy load components for better performance
const LocationMap = lazy(() => import('@/components/LocationMap'));
const ForestImpactCalculator = lazy(() => import('@/components/ForestImpactCalculator'));
const TreeTypeSelector = lazy(() => import('@/components/TreeTypeSelector'));
const TreePlantingCalculator = lazy(() => import('@/components/TreePlantingCalculator'));
const ExportResults = lazy(() => import('@/components/ExportResults'));

type SimulationMode = 'planting' | 'clear-cutting';

const ModeSwitcher = ({ mode, onChange }: { mode: SimulationMode; onChange: (mode: SimulationMode) => void }) => {
  const options: { value: SimulationMode; label: string; hint: string; icon: React.ReactNode }[] = [
    { value: 'planting', label: 'Planting', hint: 'Benefits of new forest', icon: <SproutIcon size={18} /> },
    { value: 'clear-cutting', label: 'Clear-cutting', hint: 'Cost of removing forest', icon: <AxeIcon size={18} /> },
  ];
  return (
    <div role="group" aria-label="Simulation mode" className="inline-flex rounded-2xl border border-sand-200 bg-white p-1.5 shadow-card">
      {options.map(opt => {
        const active = opt.value === mode;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            aria-label={`Switch to ${opt.label.toLowerCase()} mode`}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-all sm:px-5 ${
              active ? 'bg-accent text-white shadow-sm' : 'text-ink-500 hover:bg-sand-100 hover:text-ink-900'
            }`}
          >
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-white/15' : 'bg-sand-100'}`}>
              {opt.icon}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className={`hidden text-[11px] sm:block ${active ? 'text-white/75' : 'text-ink-400'}`}>{opt.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

const ProgressStep = ({
  index,
  label,
  status,
  icon,
}: {
  index: number;
  label: string;
  status: 'done' | 'active' | 'todo';
  icon: React.ReactNode;
}) => (
  <li className="flex items-center gap-2.5">
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
        status === 'done'
          ? 'bg-accent text-white'
          : status === 'active'
            ? 'bg-white text-accent-strong ring-2 ring-accent'
            : 'bg-sand-100 text-ink-400 ring-1 ring-sand-200'
      }`}
      aria-hidden="true"
    >
      {status === 'done' ? <CheckIcon size={14} strokeWidth={2.5} /> : index}
    </span>
    <span className={`flex items-center gap-1.5 text-sm ${status === 'todo' ? 'text-ink-400' : 'font-medium text-ink-900'}`}>
      <span className="hidden sm:inline text-ink-400">{icon}</span>
      {label}
    </span>
  </li>
);

export default function Home() {
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('planting');
  const [selectedLatitude, setSelectedLatitude] = useState<number | null>(null);
  const [selectedLongitude, setSelectedLongitude] = useState<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [years, setYears] = useState<number>(50);
  const [calculationMode, setCalculationMode] = useState<'perTree' | 'perArea'>('perArea');
  const [averageTreeAge, setAverageTreeAge] = useState<number>(20);
  const [selectedTrees, setSelectedTrees] = useState<TreeType[]>([]);
  const [treePercentages, setTreePercentages] = useState<{ [key: string]: number }>({});
  const [plantingData, setPlantingData] = useState<{
    area: number;
    totalTrees: number;
    spacing: number;
    density: number;
  } | null>(null);

  // Soil and climate data state
  const [soilData, setSoilData] = useState<{ carbon: number | null; ph: number | null } | null>(null);
  const [climateData, setClimateData] = useState<{ temperature: number | null; precipitation: number | null; historicalData?: { temperatures: number[]; precipitations: number[] } } | null>(null);

  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [shareNotification, setShareNotification] = useState<string | null>(null);

  // Load state from URL on mount
  useEffect(() => {
    const shareParam = getShareParameterFromUrl();
    if (shareParam) {
      const state = decodeUrlToState(shareParam);
      if (state) {
        logger.log('Loading shared analysis:', state);
        setSimulationMode(state.mode);
        setYears(state.years);
        setCalculationMode(state.calculationMode);
        if (state.averageTreeAge) setAverageTreeAge(state.averageTreeAge);
        if (hasCoordinates(state.latitude, state.longitude)) {
          setSelectedLatitude(state.latitude!);
          setSelectedLongitude(state.longitude!);
        }
        if (state.region) {
          setSelectedRegion(state.region);
        }
        // Load selected trees
        if (state.treeIds.length > 0) {
          const resolved = state.treeIds
            .map(id => getTreeTypeById(id))
            .filter((tree): tree is TreeType => tree != null);
          const uniqueTrees = resolved.filter(
            (tree, index) => resolved.findIndex(candidate => candidate.id === tree.id) === index
          );
          const remappedPercentages: { [key: string]: number } = {};
          state.treeIds.forEach(id => {
            const tree = getTreeTypeById(id);
            if (!tree) return;
            remappedPercentages[tree.id] = (remappedPercentages[tree.id] || 0) + (state.treePercentages?.[id] || 0);
          });
          setSelectedTrees(uniqueTrees);
          setTreePercentages(remappedPercentages);
        }
      }
    }
  }, []);

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLatitude(lat);
    setSelectedLongitude(lng);
    // Clear any existing region selection when point is selected
    setSelectedRegion(null);
  };

  const handleSearchLocation = (lat: number, lng: number, name: string) => {
    setSelectedLatitude(lat);
    setSelectedLongitude(lng);
    // Clear any existing region selection when location is searched
    setSelectedRegion(null);
    logger.log(`Searched for: ${name} at ${lat}, ${lng}`);
  };

  const handleRegionSelect = (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => {
    setSelectedRegion(bounds);
    // Clear any existing point selection when region is selected
    setSelectedLatitude(null);
    setSelectedLongitude(null);
    // Clear planting data as it needs to be recalculated
    setPlantingData(null);
  };

  const handleTreeSelectionChange = (trees: TreeType[]) => {
    setSelectedTrees(trees);
    setTreePercentages(prev => {
      const next: { [key: string]: number } = {};
      trees.forEach(tree => {
        if (prev[tree.id] != null) {
          next[tree.id] = prev[tree.id];
        }
      });

      const allUnset = trees.length > 0 && trees.every(tree => !next[tree.id]);
      if (allUnset) {
        return equalSplitPercentages(trees.map(tree => tree.id));
      }

      trees.forEach(tree => {
        if (next[tree.id] == null) {
          next[tree.id] = 0;
        }
      });
      return next;
    });
    // Clear planting data as it needs to be recalculated
    setPlantingData(null);
  };

  const handleTreePercentagesChange = (percentages: { [key: string]: number }) => {
    setTreePercentages(percentages);
    // Clear planting data as it needs to be recalculated
    setPlantingData(null);
  };

  const handleImpactDataReady = (data: Partial<ExportData>) => {
    try {
      setExportData(prev => prev ? { ...prev, ...data } : data as ExportData);
    } catch (error) {
      logger.warn('Error updating impact data:', error);
    }
  };

  const handlePlantingDataReady = (data: Partial<ExportData>) => {
    try {
      setExportData(prev => prev ? { ...prev, ...data } : data as ExportData);
      // Store planting data for ForestImpactCalculator
      if (data.plantingData) {
        setPlantingData(data.plantingData);
      }
    } catch (error) {
      logger.warn('Error updating planting data:', error);
    }
  };

  const handleSoilClimateDataReady = (soil: { carbon: number | null; ph: number | null } | null, climate: { temperature: number | null; precipitation: number | null; historicalData?: { temperatures: number[]; precipitations: number[] } } | null) => {
    setSoilData(soil);
    setClimateData(climate);
  };

  const handleClearSelection = () => {
    setSelectedLatitude(null);
    setSelectedLongitude(null);
    setSelectedRegion(null);
    setPlantingData(null);
  };

  const handleReset = () => {
    if (window.confirm('Reset all selections and start over? This will clear your current analysis.')) {
      setSelectedLatitude(null);
      setSelectedLongitude(null);
      setSelectedRegion(null);
      setYears(50);
      setCalculationMode('perArea');
      setAverageTreeAge(20);
      setSelectedTrees([]);
      setTreePercentages({});
      setPlantingData(null);
      setSoilData(null);
      setClimateData(null);
      setExportData(null);
      // Don't reset simulationMode to preserve user's choice
      // Clear URL parameter
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  };

  const hasLocation = !!selectedRegion || hasCoordinates(selectedLatitude, selectedLongitude);
  const hasTrees = selectedTrees.length > 0;
  const isReady = hasLocation && hasTrees;
  const hasAnyState = hasLocation || hasTrees;
  const isPlanting = simulationMode === 'planting';

  return (
    <div data-mode={simulationMode} className="page-backdrop">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 md:pt-14 lg:px-8">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center" aria-labelledby="main-heading">
          <Eyebrow>Live soil &amp; climate data · 80+ species · 1–100 year horizon</Eyebrow>
          <h1 id="main-heading" className="font-display mt-3 text-4xl leading-[1.05] text-ink-900 sm:text-5xl md:text-6xl">
            Simulate the impact of{' '}
            <span className="text-accent-strong">{isPlanting ? 'planting' : 'clearing'}</span> a forest
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-500 sm:text-lg">
            Draw a region anywhere in the world, choose the species, and see how carbon, biodiversity, water,
            jobs, and land change over time — powered by real environmental data and transparent formulas.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ModeSwitcher mode={simulationMode} onChange={setSimulationMode} />
            {hasAnyState && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-sand-300 bg-white px-4 text-sm font-medium text-ink-700 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                title="Reset all selections"
                aria-label="Reset all selections"
              >
                <RefreshIcon size={16} />
                Reset
              </button>
            )}
          </div>
        </section>

        {/* Progress */}
        <nav aria-label="Analysis progress" className="mt-10 flex justify-center">
          <ol className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-full border border-sand-200 bg-white/80 px-5 py-2.5 shadow-sm backdrop-blur">
            <ProgressStep index={1} label="Location" status={hasLocation ? 'done' : 'active'} icon={<MapPinIcon size={14} />} />
            <span className="hidden h-px w-6 bg-sand-300 sm:block" aria-hidden="true" />
            <ProgressStep index={2} label="Species" status={hasTrees ? 'done' : hasLocation ? 'active' : 'todo'} icon={<TreeIcon size={14} />} />
            <span className="hidden h-px w-6 bg-sand-300 sm:block" aria-hidden="true" />
            <ProgressStep index={3} label="Results" status={isReady ? 'active' : 'todo'} icon={<ChartIcon size={14} />} />
          </ol>
        </nav>

        {/* Share Notification Toast */}
        {shareNotification && (
          <div
            role="status"
            className="fixed bottom-6 left-1/2 z-[1200] flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink-900 px-5 py-3 text-sm font-medium text-white shadow-float animate-fade-in"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-forest-500">
              <CheckIcon size={14} strokeWidth={2.5} />
            </span>
            {shareNotification}
          </div>
        )}

        {/* Steps 1 & 2 */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel className="p-5 sm:p-6 lg:p-7 animate-rise-in" aria-labelledby="step-location">
            <StepHeader
              step={1}
              id="step-location"
              title="Select a location"
              description={
                <ul className="mt-1 space-y-1">
                  <li><span className="font-medium text-ink-700">Desktop:</span> hold <kbd className="rounded border border-sand-300 bg-sand-50 px-1.5 py-0.5 font-mono text-[11px] text-ink-700">Ctrl</kbd> and drag on the map to draw a region.</li>
                  <li><span className="font-medium text-ink-700">Mobile:</span> tap <em>Draw</em>, then tap the map to place a square and drag to resize.</li>
                </ul>
              }
            />
            <div className="mt-5">
              <ErrorBoundary fallback={
                <Callout tone="warning">The map failed to load. Refresh the page or search for a location instead.</Callout>
              }>
                <Suspense fallback={<LoadingBlock label="Loading map…" className="h-[440px]" />}>
                  <LocationMap
                    onLocationSelect={handleLocationSelect}
                    onRegionSelect={handleRegionSelect}
                    onSearchLocation={handleSearchLocation}
                    onClearSelection={handleClearSelection}
                    initialRegion={selectedRegion}
                    initialLatitude={selectedLatitude}
                    initialLongitude={selectedLongitude}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6 lg:p-7 animate-rise-in" aria-labelledby="step-species" style={{ animationDelay: '60ms' }}>
            <StepHeader
              step={2}
              id="step-species"
              title={isPlanting ? 'Choose tree species' : 'Identify the forest composition'}
              description={
                isPlanting
                  ? 'Pick one or more species to plant and set how the mix is distributed.'
                  : 'Select the species being removed and their share of the forest.'
              }
            />
            <div className="mt-5">
              <ErrorBoundary fallback={
                <Callout tone="warning">Tree selection failed to load. Refresh the page to try again.</Callout>
              }>
                <Suspense fallback={<LoadingBlock label="Loading species…" className="h-64" />}>
                  <TreeTypeSelector
                    selectedTrees={selectedTrees}
                    onTreeSelectionChange={handleTreeSelectionChange}
                    treePercentages={treePercentages}
                    onTreePercentagesChange={handleTreePercentagesChange}
                    latitude={selectedLatitude ?? undefined}
                    selectedRegion={selectedRegion}
                    simulationMode={simulationMode}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          </Panel>
        </div>

        {/* Step 3: configuration and results */}
        <Panel className="mt-6 p-5 sm:p-6 lg:p-7 animate-rise-in" aria-labelledby="step-results" style={{ animationDelay: '120ms' }}>
          <StepHeader
            step={3}
            id="step-results"
            title={isPlanting ? 'Configure the project and review the impact' : 'Configure the removal and review the impact'}
            description={
              isPlanting
                ? 'Adjust the time horizon and spacing, then explore environmental, economic, social, and land-use results.'
                : 'Set the time horizon and forest age, then explore environmental, economic, social, and land-use impacts.'
            }
          />

          {isReady ? (
            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="xl:col-span-5">
                <ErrorBoundary fallback={
                  <Callout tone="warning">Planting calculations failed. Adjust your selection and try again.</Callout>
                }>
                  <Suspense fallback={<LoadingBlock label="Preparing configuration…" className="h-64" />}>
                    <TreePlantingCalculator
                      selectedRegion={selectedRegion || (hasCoordinates(selectedLatitude, selectedLongitude) ? {
                        north: selectedLatitude! + 0.01,
                        south: selectedLatitude! - 0.01,
                        east: selectedLongitude! + 0.01,
                        west: selectedLongitude! - 0.01
                      } : null)}
                      selectedTreeType={selectedTrees.length === 1 ? selectedTrees[0] : null}
                      selectedTrees={selectedTrees}
                      treePercentages={treePercentages}
                      onDataReady={handlePlantingDataReady}
                      simulationMode={simulationMode}
                      years={years}
                      onYearsChange={setYears}
                      onCalculationModeChange={setCalculationMode}
                      onTreeAgeChange={setAverageTreeAge}
                      soil={soilData}
                      climate={climateData}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>

              <div className="xl:col-span-7">
                <ErrorBoundary fallback={
                  <Callout tone="warning">Impact analysis failed. Refresh the page or change the selected region.</Callout>
                }>
                  <Suspense fallback={<LoadingBlock label="Loading impact analysis…" className="h-64" />}>
                    <ForestImpactCalculator
                      latitude={selectedLatitude ?? (selectedRegion ? (selectedRegion.north + selectedRegion.south) / 2 : null)}
                      longitude={selectedLongitude ?? (selectedRegion ? (selectedRegion.east + selectedRegion.west) / 2 : null)}
                      years={years}
                      selectedTreeType={selectedTrees.length === 1 ? selectedTrees[0] : null}
                      selectedTrees={selectedTrees.length > 1 ? selectedTrees : undefined}
                      treePercentages={treePercentages}
                      selectedRegion={selectedRegion}
                      plantingData={plantingData}
                      onYearsChange={setYears}
                      onDataReady={handleImpactDataReady}
                      simulationMode={simulationMode}
                      calculationMode={calculationMode}
                      averageTreeAge={averageTreeAge}
                      onSoilClimateDataReady={handleSoilClimateDataReady}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <EmptyState
              className="mt-6"
              icon={<ChartIcon size={20} />}
              title={
                !hasLocation && !hasTrees
                  ? 'Select a location and species to begin'
                  : !hasLocation
                    ? 'Select a location on the map to continue'
                    : 'Select at least one tree species to continue'
              }
              description={
                isPlanting
                  ? 'Planting configuration and the full environmental impact analysis appear here once both steps are complete.'
                  : 'Removal configuration and the full environmental impact analysis appear here once both steps are complete.'
              }
            />
          )}
        </Panel>

        {/* Export and share */}
        <div className="mt-6 animate-rise-in" style={{ animationDelay: '180ms' }}>
          <Suspense fallback={<LoadingBlock label="Loading export options…" className="h-32" />}>
            <ExportResults
              exportData={exportData || {
                metadata: {
                  timestamp: new Date().toISOString(),
                  simulatorVersion: "1.0.0",
                  location: {
                    latitude: selectedLatitude,
                    longitude: selectedLongitude,
                    region: selectedRegion
                  },
                  simulation: {
                    years,
                    selectedTrees,
                    treePercentages
                  }
                },
                environmentalData: {},
                impactResults: {
                  carbonSequestration: 0,
                  biodiversityImpact: 0,
                  forestResilience: 0,
                  waterRetention: 0,
                  airQualityImprovement: 0,
                  totalCarbon: 0,
                  averageBiodiversity: 0,
                  averageResilience: 0
                }
              }}
              disabled={!selectedTrees.length || (!hasCoordinates(selectedLatitude, selectedLongitude) && !selectedRegion)}
              shareableState={(hasCoordinates(selectedLatitude, selectedLongitude) || selectedRegion) && selectedTrees.length > 0 ? {
                mode: simulationMode,
                latitude: selectedLatitude ?? undefined,
                longitude: selectedLongitude ?? undefined,
                region: selectedRegion || undefined,
                years,
                calculationMode,
                averageTreeAge: simulationMode === 'clear-cutting' ? averageTreeAge : undefined,
                treeIds: selectedTrees.map(t => t.id),
                treePercentages
              } : undefined}
              onShareSuccess={(message) => {
                setShareNotification(message);
                setTimeout(() => setShareNotification(null), 3000);
              }}
            />
          </Suspense>
        </div>

        {/* FAQ */}
        <div className="mt-24">
          <FaqSection />
        </div>
      </div>
    </div>
  );
}
