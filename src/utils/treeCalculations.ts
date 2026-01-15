/**
 * Tree calculation utilities
 * Extracted from ForestImpactCalculator for reusability
 */

import {
  TREE_GROWTH_FACTORS,
  TREE_AGE_GROWTH_FACTORS,
  CARBON_CONVERSION
} from '@/utils/constants';

/**
 * Calculate annual carbon sequestration with growth factor
 */
export const calculateAnnualCarbonWithGrowth = (matureRate: number, year: number): number => {
  // Growth curve: slow start, rapid growth, then plateau
  let growthFactor: number;
  if (year === 1) growthFactor = TREE_GROWTH_FACTORS.YEAR_1;
  else if (year === 2) growthFactor = TREE_GROWTH_FACTORS.YEAR_2;
  else if (year === 3) growthFactor = TREE_GROWTH_FACTORS.YEAR_3;
  else if (year === 4) growthFactor = TREE_GROWTH_FACTORS.YEAR_4;
  else if (year === 5) growthFactor = TREE_GROWTH_FACTORS.YEAR_5;
  else if (year === 6) growthFactor = TREE_GROWTH_FACTORS.YEAR_6;
  else growthFactor = TREE_GROWTH_FACTORS.YEAR_7_PLUS;
  
  return matureRate * growthFactor;
};

/**
 * Get growth factor based on tree age
 */
export const getGrowthFactor = (age: number): number => {
  if (age <= 1) return TREE_AGE_GROWTH_FACTORS.AGE_1;
  else if (age <= 2) return TREE_AGE_GROWTH_FACTORS.AGE_2;
  else if (age <= 3) return TREE_AGE_GROWTH_FACTORS.AGE_3;
  else if (age <= 4) return TREE_AGE_GROWTH_FACTORS.AGE_4;
  else if (age <= 5) return TREE_AGE_GROWTH_FACTORS.AGE_5;
  else if (age <= 6) return TREE_AGE_GROWTH_FACTORS.AGE_6;
  else if (age <= 20) return TREE_AGE_GROWTH_FACTORS.AGE_7_TO_20; // Mature trees
  else if (age <= 50) return TREE_AGE_GROWTH_FACTORS.AGE_21_TO_50; // Older mature trees
  else return TREE_AGE_GROWTH_FACTORS.AGE_50_PLUS; // Very old trees
};

/**
 * Calculate clear-cutting carbon emissions
 */
export const calculateClearCuttingCarbon = (
  matureRate: number,
  treeAge: number,
  simulationYears: number
): { immediate: number; lostFuture: number; total: number } => {
  // Calculate realistic carbon stored in tree trunk based on age
  // Research shows mature oak stores ~20-50 kg carbon (73-183 kg CO2)
  // Use a realistic growth curve for trunk carbon storage
  let trunkCarbonKg = 0;
  if (treeAge <= 5) {
    trunkCarbonKg = treeAge * 2; // Young trees: ~2 kg carbon per year
  } else if (treeAge <= 20) {
    trunkCarbonKg = 10 + (treeAge - 5) * 1.5; // Growing trees: slower accumulation
  } else if (treeAge <= 50) {
    trunkCarbonKg = 32.5 + (treeAge - 20) * 0.5; // Mature trees: minimal growth
  } else {
    trunkCarbonKg = 47.5; // Very old trees: capped at ~48 kg carbon
  }
  
  // Convert carbon to CO2
  const immediateRelease = trunkCarbonKg * CARBON_CONVERSION.CARBON_TO_CO2;
  
  // Calculate lost future sequestration over simulation period
  let lostFutureSequestration = 0;
  for (let year = 1; year <= simulationYears; year++) {
    const futureAge = treeAge + year;
    const annualSequestration = matureRate * getGrowthFactor(futureAge);
    lostFutureSequestration += annualSequestration;
  }
  
  const total = immediateRelease + lostFutureSequestration;
  
  return {
    immediate: immediateRelease,
    lostFuture: lostFutureSequestration,
    total: total
  };
};
