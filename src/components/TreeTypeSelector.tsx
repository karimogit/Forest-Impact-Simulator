"use client";

import React, { useState } from 'react';
import { TreeType, TREE_TYPES, getTreeTypesByClimate } from '@/types/treeTypes';
import { getTreeCategoryColor } from '@/utils/treeColors';

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



  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 min-h-[450px]">
      
      {/* Search and Filter */}
      <div className="mb-3 space-y-2">
        <input
          type="text"
          placeholder="Search trees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          aria-label="Search tree species"
          role="searchbox"
        />
        
        <div className="flex gap-1 overflow-x-auto whitespace-nowrap pb-1" role="group" aria-label="Filter trees by category">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
                selectedCategory === category
                  ? getTreeCategoryColor(category as 'deciduous' | 'coniferous' | 'tropical' | 'mediterranean' | 'boreal' | 'arid' | 'subtropical' | 'all', 'bg')
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-pressed={selectedCategory === category}
              aria-label={`Filter by ${category} trees`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Recommended species text - shown when region is selected */}
      {recommendedSpecies.length > 0 && (
        <div className="mb-3 p-2 bg-primary/10 border border-primary/30 rounded">
          <p className="text-xs text-primary">
            <span className="font-medium">
              {simulationMode === 'planting' 
                ? 'Recommended for this region:' 
                : 'Forest types present in this region:'
              }
            </span> {recommendedSpecies.map(tree => tree.name).join(', ')}
          </p>
        </div>
      )}

      {/* Selected Trees Summary */}
      {selectedTrees.length > 0 && (
        <div className="mb-3 p-2 bg-gray-100 border border-gray-200 rounded">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{selectedTrees.length}</span> tree type{selectedTrees.length !== 1 ? 's' : ''} selected
            </p>
            <button
              onClick={clearAll}
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedTrees.map(tree => (
              <div
                key={tree.id}
                className="flex items-center gap-1 bg-white rounded px-2 py-1 text-xs border"
              >
                <span>🌳</span>
                <span className="text-gray-700">{tree.name}</span>
                <button
                  onClick={() => handleTreeToggle(tree)}
                  className="text-red-500 hover:text-red-700 ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Percentage Distribution */}
      {selectedTrees.length > 1 && (
        <div className="mb-3 p-3 bg-gray-100 border border-gray-200 rounded">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Tree Distribution</h4>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const equalPercentage = Math.round(100 / selectedTrees.length);
                  const newPercentages: { [key: string]: number } = {};
                  selectedTrees.forEach(tree => {
                    newPercentages[tree.id] = equalPercentage;
                  });
                  onTreePercentagesChange(newPercentages);
                }}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Equal Split
              </button>
              <button
                onClick={() => {
                  // Clear all percentages and remove all trees from selection
                  onTreePercentagesChange({});
                  onTreeSelectionChange([]);
                }}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {selectedTrees.map(tree => (
              <div key={tree.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 w-16 truncate">{tree.name}</span>
                <div className="flex items-center gap-1 flex-1">
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
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    aria-label={`Percentage for ${tree.name}`}
                  />
                  <span className="text-xs text-gray-700">%</span>
                </div>
                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-200 ${getTreeCategoryColor(tree.category, 'bg')}`}
                    style={{ width: `${treePercentages[tree.id] || 0}%` }}
                  />
                </div>
              </div>
            ))}
            
            <div className="flex items-center justify-between pt-2 border-t border-gray-300">
              <span className="text-xs text-gray-700">Total:</span>
              <span className={`text-xs font-medium ${
                Object.values(treePercentages).reduce((sum, p) => sum + (p || 0), 0) === 100 
                  ? 'text-primary' 
                  : 'text-red-400'
              }`}>
                {Object.values(treePercentages).reduce((sum, p) => sum + (p || 0), 0)}%
              </span>
            </div>
            
            {Object.values(treePercentages).reduce((sum, p) => sum + (p || 0), 0) !== 100 && (
                          <p className="text-xs text-red-400">
              Total should equal 100% for accurate calculations
            </p>
            )}
          </div>
        </div>
      )}

      {/* Tree Grid */}
      <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
        {filteredTrees.map(tree => {
          const isSelected = selectedTrees.some(t => t.id === tree.id);
          const isRecommended = recommendedSpecies.some(rec => rec.id === tree.id);
          return (
            <div
              key={tree.id}
              onClick={() => handleTreeToggle(tree)}
              className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? `${getTreeCategoryColor(tree.category, 'bg-light')}`
                  : 'border-gray-200 hover:border-primary/50'
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
              {/* Tree Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 mr-2">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {isRecommended && <span className="text-primary mr-1">★</span>}
                      {tree.name} <span className="font-normal text-gray-500">- {tree.scientificName}</span>
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className={`w-5 h-5 text-white rounded-full flex items-center justify-center text-xs font-bold ${getTreeCategoryColor(tree.category, 'bg')}`}>
                        ✓
                      </div>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${getTreeCategoryColor(tree.category, 'bg')}`}>
                      {tree.category.charAt(0).toUpperCase() + tree.category.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center bg-white border border-gray-300 rounded p-2">
                    <div className="text-xs font-medium">Carbon: {tree.carbonSequestration} kg</div>
                  </div>
                  <div className="text-center bg-white border border-gray-300 rounded p-2">
                    <div className="text-xs font-medium capitalize">Growth: {tree.growthRate}</div>
                  </div>
                  <div className="text-center bg-white border border-gray-300 rounded p-2">
                    <div className="text-xs font-medium">Bio: {tree.biodiversityValue}</div>
                  </div>
                </div>


              </div>
            </div>
          );
        })}
      </div>

      {filteredTrees.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">No trees found matching your criteria.</p>
          <p className="text-xs mt-1">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
};

export default TreeTypeSelector; 