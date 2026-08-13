/**
 * Tree calculation utilities
 * Extracted from ForestImpactCalculator for reusability
 */

import {
  TREE_GROWTH_FACTORS,
  TREE_AGE_GROWTH_FACTORS
} from '@/utils/constants';

/**
 * Planting-mode growth factor for a given simulation year.
 * Year 1-3 establishment, 4-10 rapid growth, 11-20 maturation, 20+ mature.
 */
export const getPlantingGrowthFactor = (year: number): number => {
  if (year <= 1) return TREE_GROWTH_FACTORS.YEAR_1;
  if (year === 2) return TREE_GROWTH_FACTORS.YEAR_2;
  if (year === 3) return TREE_GROWTH_FACTORS.YEAR_3;
  if (year === 4) return TREE_GROWTH_FACTORS.YEAR_4;
  if (year === 5) return TREE_GROWTH_FACTORS.YEAR_5;
  if (year <= 10) return TREE_GROWTH_FACTORS.YEAR_6_TO_10;
  if (year <= 20) return TREE_GROWTH_FACTORS.YEAR_11_TO_20;
  return TREE_GROWTH_FACTORS.YEAR_20_PLUS;
};

/**
 * Calculate annual carbon sequestration with growth factor
 */
export const calculateAnnualCarbonWithGrowth = (matureRate: number, year: number): number => {
  return matureRate * getPlantingGrowthFactor(year);
};

/**
 * Get growth factor based on existing tree age (clear-cutting)
 */
export const getGrowthFactor = (age: number): number => {
  if (age <= 1) return TREE_AGE_GROWTH_FACTORS.AGE_1;
  if (age <= 2) return TREE_AGE_GROWTH_FACTORS.AGE_2;
  if (age <= 3) return TREE_AGE_GROWTH_FACTORS.AGE_3;
  if (age <= 4) return TREE_AGE_GROWTH_FACTORS.AGE_4;
  if (age <= 5) return TREE_AGE_GROWTH_FACTORS.AGE_5;
  if (age <= 6) return TREE_AGE_GROWTH_FACTORS.AGE_6;
  if (age <= 20) return TREE_AGE_GROWTH_FACTORS.AGE_7_TO_20;
  if (age <= 50) return TREE_AGE_GROWTH_FACTORS.AGE_21_TO_50;
  return TREE_AGE_GROWTH_FACTORS.AGE_50_PLUS;
};

/**
 * Calculate clear-cutting carbon emissions.
 * Immediate release is the carbon stored over the tree's lifetime
 * (sum of annual sequestration from year 1 to treeAge).
 */
export const calculateClearCuttingCarbon = (
  matureRate: number,
  treeAge: number,
  simulationYears: number
): { immediate: number; lostFuture: number; total: number } => {
  let immediateRelease = 0;
  for (let year = 1; year <= treeAge; year++) {
    immediateRelease += matureRate * getGrowthFactor(year);
  }

  let lostFutureSequestration = 0;
  for (let year = 1; year <= simulationYears; year++) {
    lostFutureSequestration += matureRate * getGrowthFactor(treeAge + year);
  }

  return {
    immediate: immediateRelease,
    lostFuture: lostFutureSequestration,
    total: immediateRelease + lostFutureSequestration
  };
};
