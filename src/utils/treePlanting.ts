/**
 * Tree planting calculations and utilities
 */

export interface TreePlantingConfig {
  spacing: number; // meters between trees
  density: number; // trees per hectare
  area: number; // hectares
  totalTrees: number;
  carbonSequestration: number; // kg CO2 per year for the entire plantation
}

export interface RegionBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Tree spacing configurations for different tree types
export const TREE_SPACING_CONFIGS = {
  // Dense planting for fast-growing species
  dense: {
    spacing: 2.5, // 2.5m spacing
    density: 1600, // 1600 trees/ha
    description: "Dense planting (2.5m spacing, 6.25m² per tree)"
  },
  // Standard commercial forestry
  standard: {
    spacing: 3.0, // 3m spacing
    density: 1111, // 1111 trees/ha
    description: "Standard spacing (3m spacing, 9m² per tree)"
  },
  // Wide spacing for large trees
  wide: {
    spacing: 4.0, // 4m spacing
    density: 625, // 625 trees/ha
    description: "Wide spacing (4m spacing, 16m² per tree)"
  },
  // Very wide for giant trees
  veryWide: {
    spacing: 6.0, // 6m spacing
    density: 278, // 278 trees/ha
    description: "Very wide spacing (6m spacing, 36m² per tree)"
  }
};

// Calculate area in hectares from region bounds
export const calculateRegionArea = (bounds: RegionBounds): number => {
  const latDiff = Math.abs(bounds.north - bounds.south);
  // Handle antimeridian crossing (west > east, e.g. 170°E to 170°W)
  const rawLngDiff = bounds.east - bounds.west;
  const lngDiff = rawLngDiff < 0 ? rawLngDiff + 360 : rawLngDiff;
  
  // Convert to meters (approximate)
  const latMeters = latDiff * 111000; // 1 degree latitude ≈ 111km
  const lngMeters = lngDiff * 111000 * Math.cos((bounds.north + bounds.south) * Math.PI / 360);
  
  const areaSquareMeters = latMeters * lngMeters;
  const areaHectares = areaSquareMeters / 10000; // Convert to hectares
  
  return Math.max(0, areaHectares);
};

// Get recommended spacing based on tree type
export const getRecommendedSpacing = (treeType: string): keyof typeof TREE_SPACING_CONFIGS => {
  const treeTypeLower = treeType.toLowerCase();
  
  // Fast-growing species (dense planting for quick canopy closure)
  if (treeTypeLower.includes('eucalyptus') || treeTypeLower.includes('willow') || 
      treeTypeLower.includes('poplar') || treeTypeLower.includes('birch') ||
      treeTypeLower.includes('bamboo') || treeTypeLower.includes('papaya') ||
      treeTypeLower.includes('banana') || treeTypeLower.includes('tulip_poplar') ||
      treeTypeLower.includes('sycamore')) {
    return 'dense';
  }
  
  // Large/giant trees (need more space for root systems and canopy)
  if (treeTypeLower.includes('sequoia') || treeTypeLower.includes('redwood') || 
      treeTypeLower.includes('cedar') || treeTypeLower.includes('baobab') ||
      treeTypeLower.includes('douglas fir') || treeTypeLower.includes('monkey puzzle')) {
    return 'veryWide';
  }
  
  // Medium-large trees (standard forestry spacing)
  if (treeTypeLower.includes('oak') || treeTypeLower.includes('maple') || 
      treeTypeLower.includes('pine') || treeTypeLower.includes('spruce') ||
      treeTypeLower.includes('fir') || treeTypeLower.includes('mahogany') ||
      treeTypeLower.includes('teak') || treeTypeLower.includes('beech') ||
      treeTypeLower.includes('ash') || treeTypeLower.includes('hickory') ||
      treeTypeLower.includes('black walnut') || treeTypeLower.includes('white oak') ||
      treeTypeLower.includes('sugar maple') || treeTypeLower.includes('linden')) {
    return 'wide';
  }
  
  // Small trees and shrubs (can be planted closer together)
  if (treeTypeLower.includes('juniper') || treeTypeLower.includes('rowan') ||
      treeTypeLower.includes('olive') || treeTypeLower.includes('fig') ||
      treeTypeLower.includes('pomegranate') || treeTypeLower.includes('almond') ||
      treeTypeLower.includes('carob') || treeTypeLower.includes('cherry') ||
      treeTypeLower.includes('avocado') || treeTypeLower.includes('mango') ||
      treeTypeLower.includes('cashew') || treeTypeLower.includes('marula') ||
      treeTypeLower.includes('shea') || treeTypeLower.includes('sandalwood') ||
      treeTypeLower.includes('neem') || treeTypeLower.includes('camphor')) {
    return 'dense';
  }
  
  // Default to standard for unknown types
  return 'standard';
};

// Calculate tree planting configuration
export const calculateTreePlanting = (
  bounds: RegionBounds,
  treeType: string,
  customSpacing?: number
): TreePlantingConfig => {
  const area = calculateRegionArea(bounds);
  
  let spacing: number;
  let density: number;
  
  if (customSpacing) {
    spacing = customSpacing;
    density = 10000 / (spacing * spacing); // trees per hectare
  } else {
    const spacingKey = getRecommendedSpacing(treeType);
    const config = TREE_SPACING_CONFIGS[spacingKey];
    spacing = config.spacing;
    density = config.density;
  }
  
  const totalTrees = Math.floor(area * density);
  
  return {
    spacing,
    density,
    area,
    totalTrees,
    carbonSequestration: 0 // Will be calculated based on tree type
  };
};

// Calculate carbon sequestration for the entire plantation
export const calculatePlantationCarbonSequestration = (
  plantingConfig: TreePlantingConfig,
  carbonPerTree: number
): number => {
  return plantingConfig.totalTrees * carbonPerTree;
};

// Format area for display
export const formatArea = (areaHectares: number): string => {
  if (areaHectares < 1) {
    return `${(areaHectares * 10000).toFixed(0)} m²`;
  } else if (areaHectares < 100) {
    return `${areaHectares.toFixed(2)} hectares`;
  } else {
    return `${(areaHectares / 100).toFixed(2)} km²`;
  }
};

// Format number with commas
export const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

// Get planting recommendations based on region size
export const getPlantingRecommendations = (areaHectares: number): string[] => {
  const recommendations: string[] = [];
  
  if (areaHectares < 0.1) {
    recommendations.push("Small area - consider container planting or urban forestry");
  } else if (areaHectares < 1) {
    recommendations.push("Medium area - suitable for community gardens or small woodlots");
  } else if (areaHectares < 10) {
    recommendations.push("Large area - suitable for commercial forestry or restoration");
  } else {
    recommendations.push("Very large area - consider mixed-species planting for biodiversity");
    recommendations.push("Plan for fire breaks and access roads");
  }
  
  if (areaHectares > 5) {
    recommendations.push("Consider phased planting over multiple years");
  }
  
  return recommendations;
};

// Calculate planting timeline with improved realism
export const calculatePlantingTimeline = (totalTrees: number): {
  treesPerYear: number;
  yearsToComplete: number;
  treesPerSeason: number;
  projectScale: string;
  recommendedApproach: string;
} => {
  // Determine project scale
  let projectScale: string;
  let treesPerPersonPerDay: number;
  let plantingDaysPerYear: number;
  let people: number;
  let recommendedApproach: string;

  if (totalTrees < 1000) {
    // Small project - community/backyard scale
    projectScale = "Small-scale (Community/Backyard)";
    treesPerPersonPerDay = 50; // Manual planting
    plantingDaysPerYear = 30; // Flexible timing
    people = 2; // Small team
    recommendedApproach = "Manual planting with volunteers or small crew";
  } else if (totalTrees < 10000) {
    // Medium project - local restoration
    projectScale = "Medium-scale (Local Restoration)";
    treesPerPersonPerDay = 200; // Semi-mechanized
    plantingDaysPerYear = 60; // 2 months
    people = 5; // Standard crew
    recommendedApproach = "Semi-mechanized planting with professional crew";
  } else if (totalTrees < 100000) {
    // Large project - commercial forestry
    projectScale = "Large-scale (Commercial Forestry)";
    treesPerPersonPerDay = 500; // Professional rates
    plantingDaysPerYear = 90; // 3 months
    people = 10; // Larger crew
    recommendedApproach = "Professional forestry crew with mechanized assistance";
  } else if (totalTrees < 1000000) {
    // Very large project - regional restoration
    projectScale = "Very Large-scale (Regional Restoration)";
    treesPerPersonPerDay = 800; // High-efficiency equipment
    plantingDaysPerYear = 120; // 4 months
    people = 25; // Multiple crews
    recommendedApproach = "Multiple crews with specialized planting equipment";
  } else {
    // Massive project - national/international scale
    projectScale = "Massive-scale (National/International)";
    treesPerPersonPerDay = 1000; // Advanced mechanization
    plantingDaysPerYear = 150; // 5 months
    people = 50; // Large-scale operations
    recommendedApproach = "Industrial-scale operations with advanced mechanization and multiple teams";
  }

  const treesPerDay = treesPerPersonPerDay * people;
  const treesPerYear = treesPerDay * plantingDaysPerYear;
  
  // Ensure realistic project duration - minimum 1 year, but for very small projects, 
  // use a more realistic approach based on actual planting time
  let yearsToComplete: number;
  
  if (totalTrees < 100) {
    // For very small projects, calculate based on actual planting time
    const treesPerDay = Math.min(treesPerPersonPerDay * people, 200); // Cap at 200 trees/day for small projects
    const daysToComplete = Math.ceil(totalTrees / treesPerDay);
    yearsToComplete = Math.max(1, Math.ceil(daysToComplete / 30)); // Assume 30-day planting window
  } else if (totalTrees < 10000) {
    // For medium projects, use more conservative rates
    const treesPerDay = Math.min(treesPerPersonPerDay * people, 1000); // Cap at 1000 trees/day for medium projects
    const daysToComplete = Math.ceil(totalTrees / treesPerDay);
    yearsToComplete = Math.max(1, Math.ceil(daysToComplete / 60)); // Assume 60-day planting window
  } else {
    // For larger projects, use more realistic rates
    const treesPerDay = Math.min(treesPerPersonPerDay * people, 2000); // Cap at 2000 trees/day for large projects
    const daysToComplete = Math.ceil(totalTrees / treesPerDay);
    yearsToComplete = Math.max(1, Math.ceil(daysToComplete / 90)); // Assume 90-day planting window
  }
  
  const treesPerSeason = Math.ceil(totalTrees / yearsToComplete);

  return {
    treesPerYear,
    yearsToComplete,
    treesPerSeason,
    projectScale,
    recommendedApproach
  };
}; 