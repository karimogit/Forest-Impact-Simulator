"use client";

import React, { useState } from 'react';
import { TreeType, TREE_TYPES, getTreeTypesByClimate } from '@/types/treeTypes';
import { getTreeCategoryColor, TreeCategory } from '@/utils/treeColors';
import { equalSplitPercentages } from '@/utils/geo';
import { SearchIcon, StarIcon, CheckIcon, XIcon } from './ui/Icons';

interface TreeTypeSelectorProps {
  selectedTrees: TreeType[];
  onTreeSelectionChange: (trees: TreeType[]) => void;
  treePercentages: { [key: string]: number };
  onTreePercentagesChange: (percentages: { [key: string]: number }) => void;
  climate?: string;
  latitude?: number;
  selectedRegion?: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  simulationMode?: 'planting' | 'clear-cutting';
}

const TreeTypeSelector: React.FC<TreeTypeSelectorProps> = ({ 
  selectedTrees, 
  onTreeSelectionChange, 
  treePercentages,
  onTreePercentagesChange,
  climate,
  latitude,
  selectedRegion,
  simulationMode = 'planting'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get climate zone based on latitude and longitude
  const getClimateZone = (lat: number, lng?: number): string => {
    const absLat = Math.abs(lat);
    
    // Arid zones (major desert regions)
    if (lng !== undefined) {
      // North American deserts (southwestern US/northwestern Mexico)
      if (absLat >= 25 && absLat <= 40 && lng >= -125 && lng <= -105) return 'arid';
      // Australian outback
      if (absLat >= 15 && absLat <= 35 && lng >= 110 && lng <= 155) return 'arid';
      // Middle East/North Africa
      if (absLat >= 15 && absLat <= 35 && lng >= -10 && lng <= 60) return 'arid';
      // Sahara region
      if (absLat >= 10 && absLat <= 30 && lng >= -20 && lng <= 35) return 'arid';
    }
    
    // Subtropical zones
    if (absLat >= 23.5 && absLat <= 35) {
      // Check for subtropical regions (southeastern US, southern China, etc.)
      if (lng !== undefined) {
        // Southeastern US
        if (lng >= -95 && lng <= -75) return 'subtropical';
        // Southern China/East Asia
        if (lng >= 100 && lng <= 130) return 'subtropical';
        // Eastern Australia
        if (lng >= 145 && lng <= 155) return 'subtropical';
        // Northern Argentina/Southern Brazil
        if (lng >= -65 && lng <= -45) return 'subtropical';
      }
      return 'subtropical'; // Default for this latitude band
    }
    
    // Other climate zones
    if (absLat < 23.5) return 'tropical';
    if (absLat < 45) return 'temperate';
    if (absLat < 66.5) return 'temperate';
    return 'boreal';
  };

  // Get recommended species for the selected region
  const getRecommendedSpecies = (): TreeType[] => {
    if (!selectedRegion) return [];
    
    const centerLat = (selectedRegion.north + selectedRegion.south) / 2;
    const centerLng = (selectedRegion.east + selectedRegion.west) / 2;
    const climateZone = getClimateZone(centerLat, centerLng);
    
    // Get trees suitable for this climate zone
    const suitableTrees = TREE_TYPES.filter(tree => 
      tree.climateZones.includes(climateZone)
    );
    
    // Sort by biodiversity value and return top 3
    return suitableTrees
      .sort((a, b) => b.biodiversityValue - a.biodiversityValue)
      .slice(0, 3);
  };

  const recommendedSpecies = getRecommendedSpecies();



  // Filter trees based on climate and latitude
  const getSuitableTrees = () => {
    let suitableTrees = TREE_TYPES;
    
    // Filter by climate if available
    if (climate) {
      suitableTrees = getTreeTypesByClimate(climate);
    }
    
    // Additional filtering based on latitude
    if (latitude !== undefined) {
      suitableTrees = suitableTrees.filter(tree => {
        const absLat = Math.abs(latitude);
        if (absLat < 23.5) return tree.climateZones.includes('tropical');
        if (absLat < 45) return tree.climateZones.includes('temperate') || tree.climateZones.includes('mediterranean');
        return tree.climateZones.includes('boreal') || tree.climateZones.includes('temperate');
      });
    }
    
    return suitableTrees;
  };

  const suitableTrees = getSuitableTrees();

  // Filter by search term and category
  const filteredTrees = suitableTrees.filter(tree => {
    const matchesSearch = tree.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tree.scientificName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tree.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tree.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    // Sort recommended species to the top
    const aIsRecommended = recommendedSpecies.some(rec => rec.id === a.id);
    const bIsRecommended = recommendedSpecies.some(rec => rec.id === b.id);
    
    if (aIsRecommended && !bIsRecommended) return -1;
    if (!aIsRecommended && bIsRecommended) return 1;
    
    // If both or neither are recommended, maintain original order
    return 0;
  });

  const categories = ['all', 'deciduous', 'coniferous', 'tropical', 'mediterranean', 'boreal', 'arid', 'subtropical'];

  const handleTreeToggle = (tree: TreeType) => {
    const isSelected = selectedTrees.some(t => t.id === tree.id);
    if (isSelected) {
      onTreeSelectionChange(selectedTrees.filter(t => t.id !== tree.id));
    } else {
      onTreeSelectionChange([...selectedTrees, tree]);
    }
  };

  const clearAll = () => {
    onTreeSelectionChange([]);
  };



  const percentageTotal = Object.values(treePercentages).reduce((sum, p) => sum + (p || 0), 0);
  const totalIsValid = percentageTotal === 100;

  return (
    <div className="space-y-4">
      {/* Search and filter */}
      <div className="space-y-3">
        <div className="relative">
          <label htmlFor="tree-search" className="sr-only">Search tree species</label>
          <SearchIcon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            id="tree-search"
            type="text"
            placeholder="Search by name, scientific name, or trait…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-xl border border-sand-300 bg-white pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-400 shadow-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
            aria-label="Search tree species"
            role="searchbox"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scroll-thin" role="group" aria-label="Filter trees by category">
          {categories.map(category => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  active
                    ? `${getTreeCategoryColor(category as TreeCategory, 'bg')} border-transparent shadow-sm`
                    : 'border-sand-300 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-900'
                }`}
                aria-pressed={active}
                aria-label={`Filter by ${category} trees`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommended species */}
      {recommendedSpecies.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-accent-soft px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong">
            <StarIcon size={14} className="fill-current" />
            {simulationMode === 'planting' ? 'Recommended here' : 'Present in this region'}
          </span>
          {recommendedSpecies.map(tree => {
            const isSelected = selectedTrees.some(t => t.id === tree.id);
            return (
              <button
                key={tree.id}
                type="button"
                onClick={() => handleTreeToggle(tree)}
                aria-pressed={isSelected}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'border-accent bg-accent text-white'
                    : 'border-transparent bg-white text-ink-700 hover:border-accent'
                }`}
              >
                {isSelected && <CheckIcon size={12} strokeWidth={2.5} />}
                {tree.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected species */}
      {selectedTrees.length > 0 && (
        <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink-900">
              <span className="font-semibold tnum">{selectedTrees.length}</span>{' '}
              {selectedTrees.length === 1 ? 'species selected' : 'species selected'}
            </p>
            <div className="flex items-center gap-2">
              {selectedTrees.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    onTreePercentagesChange(equalSplitPercentages(selectedTrees.map(tree => tree.id)));
                  }}
                  className="rounded-lg border border-sand-300 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-ink-300"
                >
                  Equal split
                </button>
              )}
              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-white hover:text-red-700"
              >
                Clear all
              </button>
            </div>
          </div>

          {selectedTrees.length === 1 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTrees.map(tree => (
                <span
                  key={tree.id}
                  className="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white pl-3 pr-1.5 py-1 text-xs font-medium text-ink-900"
                >
                  <span className={`h-2 w-2 rounded-full ${getTreeCategoryColor(tree.category, 'bg')}`} aria-hidden="true" />
                  {tree.name}
                  <button
                    type="button"
                    onClick={() => handleTreeToggle(tree)}
                    className="rounded-full p-0.5 text-ink-400 hover:bg-sand-100 hover:text-red-600"
                    aria-label={`Remove ${tree.name}`}
                  >
                    <XIcon size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">Distribution</h4>
                <span className={`text-xs font-semibold tnum ${totalIsValid ? 'text-accent-strong' : 'text-red-600'}`}>
                  Total {percentageTotal}%
                </span>
              </div>

              <ul className="space-y-2.5">
                {selectedTrees.map(tree => (
                  <li key={tree.id} className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${getTreeCategoryColor(tree.category, 'bg')}`} aria-hidden="true" />
                    <span className="w-28 shrink-0 truncate text-sm font-medium text-ink-900 sm:w-36" title={tree.name}>{tree.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand-200">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${getTreeCategoryColor(tree.category, 'bg')}`}
                        style={{ width: `${Math.min(100, treePercentages[tree.id] || 0)}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={treePercentages[tree.id] || ''}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const newPercentages = { ...treePercentages };
                          
                          if (inputValue === '') {
                            // Allow empty field - just remove from percentages but keep tree selected
                            delete newPercentages[tree.id];
                          } else {
                            const value = parseInt(inputValue) || 0;
                            if (value > 0) {
                              newPercentages[tree.id] = value;
                            } else {
                              // If value is 0, just remove from percentages but keep tree selected
                              delete newPercentages[tree.id];
                            }
                          }
                          
                          onTreePercentagesChange(newPercentages);
                        }}
                        className="plain h-8 w-14 rounded-lg border border-sand-300 bg-white px-2 text-right text-sm font-medium text-ink-900 tnum focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
                        aria-label={`Percentage for ${tree.name}`}
                      />
                      <span className="text-xs text-ink-400">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTreeToggle(tree)}
                      className="rounded-md p-1 text-ink-300 hover:bg-white hover:text-red-600"
                      aria-label={`Remove ${tree.name}`}
                    >
                      <XIcon size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              {!totalIsValid && (
                <p className="text-xs font-medium text-red-600">
                  Total should equal 100% for accurate calculations.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Species list */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">
            {filteredTrees.length} {filteredTrees.length === 1 ? 'species' : 'species'}
          </span>
          <span className="text-xs text-ink-400">Carbon in kg CO₂ / year per mature tree</span>
        </div>
        <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1 scroll-thin" aria-label="Available tree species">
          {filteredTrees.map(tree => {
            const isSelected = selectedTrees.some(t => t.id === tree.id);
            const isRecommended = recommendedSpecies.some(rec => rec.id === tree.id);
            return (
              <li key={tree.id}>
                <div
                  onClick={() => handleTreeToggle(tree)}
                  className={`group flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-accent bg-accent-soft/60 shadow-sm'
                      : 'border-sand-200 bg-white hover:border-ink-300 hover:shadow-card'
                  }`}
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`${tree.name} - ${tree.scientificName}. Carbon sequestration: ${tree.carbonSequestration} kg CO₂/year`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTreeToggle(tree);
                    }
                  }}
                >
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      isSelected ? 'border-accent bg-accent text-white' : 'border-sand-300 bg-white group-hover:border-ink-300'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && <CheckIcon size={13} strokeWidth={3} />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h4 className="text-sm font-semibold text-ink-900">{tree.name}</h4>
                      <span className="text-xs italic text-ink-400">{tree.scientificName}</span>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-strong">
                          <StarIcon size={11} className="fill-current" />
                          {simulationMode === 'planting' ? 'Recommended' : 'Present'}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
                      <span className={`rounded-full px-2 py-0.5 font-medium capitalize ${getTreeCategoryColor(tree.category, 'badge')}`}>
                        {tree.category}
                      </span>
                      <span>
                        <span className="font-semibold text-ink-900 tnum">{tree.carbonSequestration}</span> kg CO₂/yr
                      </span>
                      <span className="capitalize">
                        Growth <span className="font-semibold text-ink-900">{tree.growthRate}</span>
                      </span>
                      <span>
                        Biodiversity <span className="font-semibold text-ink-900 tnum">{tree.biodiversityValue}</span>/5
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {filteredTrees.length === 0 && (
          <div className="rounded-2xl border border-dashed border-sand-300 bg-sand-50 py-8 text-center">
            <p className="text-sm font-semibold text-ink-900">No trees match your search.</p>
            <p className="mt-1 text-xs text-ink-500">Try a different keyword or category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TreeTypeSelector; 