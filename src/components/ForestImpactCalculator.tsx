"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { TreeType } from '@/types/treeTypes';
import { validateLatitude, validateLongitude, apiRateLimiter } from '@/utils/security';
import { ExportData } from '@/utils/exportUtils';
import { calculateRegionArea } from '@/utils/treePlanting';
import { getCachedData, setCachedData, generateLocationKey } from '@/utils/apiCache';
import {
  TREE_GROWTH_FACTORS,
  TREE_AGE_GROWTH_FACTORS,
  BIODIVERSITY_GROWTH_FACTORS,
  COMPARISON_FACTORS,
  SOCIAL_IMPACT,
  LAND_USE_IMPACT,
  IMPACT_CAPS,
  WATER_RETENTION,
  AIR_QUALITY,
  ENVIRONMENTAL_MODIFIERS,
  CARBON_CONVERSION
} from '@/utils/constants';
import { calculateAnnualCarbonWithGrowth, calculateClearCuttingCarbon } from '@/utils/treeCalculations';
import { EnvironmentTab } from './tabs/EnvironmentTab';
import { SocialTab } from './tabs/SocialTab';
import { EconomicTab } from './tabs/EconomicTab';
import { LandUseTab } from './tabs/LandUseTab';
import { logger } from '@/utils/logger';

// Simple fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout: number = 15000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};


interface ForestImpactCalculatorProps {
  latitude: number | null;
  longitude: number | null;
  years: number;
  selectedTreeType?: TreeType | null;
  selectedTrees?: TreeType[];
  treePercentages?: { [key: string]: number };
  selectedRegion?: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  plantingData?: {
    area: number;
    totalTrees: number;
    spacing: number;
    density: number;
  } | null;
  onYearsChange: (years: number) => void;
  onDataReady?: (data: Partial<ExportData>) => void;
  simulationMode?: 'planting' | 'clear-cutting';
  calculationMode?: 'perTree' | 'perArea';
  averageTreeAge?: number;
  onSoilClimateDataReady?: (soil: SoilData | null, climate: ClimateData | null) => void;
}

interface ImpactMetrics {
  carbonSequestration: number;
  biodiversityImpact: number;
  forestResilience: number;
  waterRetention: number;
  airQualityImprovement: number;
}

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
    years: number[];
  };
}

interface ClimatePrediction {
  temperature: number;
  precipitation: number;
  growthModifier: number;
}

// Helper function to estimate climate data based on latitude when API fails
const estimateClimateData = (lat: number): ClimateData => {
  const absLat = Math.abs(lat);
  
  let temperature: number;
  let precipitation: number;
  
  if (absLat >= 0 && absLat < 23.5) {
    // Tropical zone
    temperature = 25;
    precipitation = 2000; // mm/year
  } else if (absLat >= 23.5 && absLat < 35) {
    // Subtropical zone
    temperature = 20;
    precipitation = 1000;
  } else if (absLat >= 35 && absLat < 55) {
    // Temperate zone
    temperature = 12;
    precipitation = 800;
  } else if (absLat >= 55 && absLat < 66.5) {
    // Boreal zone
    temperature = 3;
    precipitation = 500;
  } else {
    // Arctic/Antarctic zone
    temperature = -5;
    precipitation = 300;
  }
  
  logger.log(`Using estimated climate data for latitude ${lat}:`, { temperature, precipitation });
  return { temperature, precipitation, isEstimated: true };
};

// Helper function to estimate soil data based on climate zone when API returns null
const estimateSoilData = (lat: number): SoilData => {
  const absLat = Math.abs(lat);
  
  // Estimate based on latitude/climate zone
  let carbon: number;
  let ph: number;
  
  if (absLat >= 0 && absLat < 23.5) {
    // Tropical zone
    carbon = 15; // Lower soil carbon due to rapid decomposition
    ph = 6.0; // Slightly acidic
  } else if (absLat >= 23.5 && absLat < 40) {
    // Subtropical zone
    carbon = 18; // Moderate soil carbon
    ph = 6.5; // Slightly acidic to neutral
  } else if (absLat >= 40 && absLat < 60) {
    // Temperate zone
    carbon = 25; // Higher soil carbon
    ph = 6.5; // Neutral
  } else {
    // Boreal/Arctic zone
    carbon = 30; // High soil carbon due to slow decomposition
    ph = 5.5; // Acidic
  }
  
  logger.log(`Using estimated soil data for latitude ${lat}:`, { carbon, ph });
  return { carbon, ph, isEstimated: true };
};

const fetchSoilData = async (lat: number, lon: number, retries = 2): Promise<SoilData> => {
  try {
    // Validate coordinates
    if (!validateLatitude(lat) || !validateLongitude(lon)) {
      logger.warn('Invalid coordinates for soil data:', { lat, lon });
      return estimateSoilData(lat);
    }
    
    // Rate limiting - be more lenient
    if (!apiRateLimiter.isAllowed('soil')) {
      logger.warn('[SOIL API] Rate limit - using estimates');
      return estimateSoilData(lat);
    }
    
    const attemptNum = 3 - retries;
    logger.log(`[SOIL API] Fetching soil data for: ${lat.toFixed(4)}, ${lon.toFixed(4)} (attempt ${attemptNum} of 3)`);
    
    // Use progressively longer timeouts on retries
    const timeout = 15000 + (attemptNum * 10000); // 15s, 25s, 35s
    
    // Use the ISRIC SoilGrids API endpoint
    const res = await fetchWithTimeout(
      `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=soc&property=phh2o&depth=0-5cm&value=mean`,
      {
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      },
      timeout
    );
    
    if (!res.ok) {
      // For 404 or 400, the location might not have data - use estimates without retrying
      if (res.status === 404 || res.status === 400) {
        logger.log(`[SOIL API] No data available for this location (${res.status}). Using estimates.`);
        return estimateSoilData(lat);
      }
      throw new Error(`Soil API error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Extract organic carbon and pH from the response
    let carbon = null;
    let ph = null;
    
    if (data.properties && data.properties.layers) {
      for (const layer of data.properties.layers) {
        if (layer.name === 'soc' && layer.depths && layer.depths[0]) {
          // Convert from dg/kg to g/kg (divide by 10)
          const rawValue = layer.depths[0].values?.mean;
          carbon = rawValue != null ? rawValue / 10 : null;
        }
        if (layer.name === 'phh2o' && layer.depths && layer.depths[0]) {
          // Convert from pHx10 to actual pH (divide by 10)
          const rawValue = layer.depths[0].values?.mean;
          ph = rawValue != null ? rawValue / 10 : null;
        }
      }
    }
    
    // If API returns null values (no data available for this location), use estimates
    if (carbon === null && ph === null) {
      logger.log('[SOIL API] API returned null values. Using climate-based estimates.');
      return estimateSoilData(lat);
    }
    
    // Allow partial data - use estimates for missing values
    const result: SoilData = {
      carbon: carbon ?? estimateSoilData(lat).carbon,
      ph: ph ?? estimateSoilData(lat).ph,
      isEstimated: carbon === null || ph === null
    };
    
    logger.log('[SOIL API] Success:', { carbon: result.carbon, ph: result.ph, partial: result.isEstimated });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Don't retry for certain errors
    if (errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
      logger.warn(`[SOIL API] Request timed out (attempt ${3 - retries})`);
    } else {
      logger.warn(`[SOIL API] Error: ${errorMessage}`);
    }
    
    // Retry logic with exponential backoff
    if (retries > 0) {
      const waitTime = (3 - retries) * 2000; // Progressive backoff: 2s, 4s
      logger.log(`[SOIL API] Retrying in ${waitTime/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchSoilData(lat, lon, retries - 1);
    }
    
    logger.log('[SOIL API] All attempts exhausted. Using climate-based estimates.');
    return estimateSoilData(lat);
  }
};

const processDailyToYearly = (temperatures: (number | null)[], precipitations: (number | null)[]) => {
  const yearlyTemps: number[] = [];
  const yearlyPrecip: number[] = [];
  const years: number[] = [];
  
  // Group data by year (assuming 365 days per year)
  const daysPerYear = 365;
  const numYears = Math.floor(temperatures.length / daysPerYear);
  
  for (let year = 0; year < numYears; year++) {
    const startIndex = year * daysPerYear;
    const endIndex = startIndex + daysPerYear;
    
    // Get daily values for this year
    const yearTemps = temperatures.slice(startIndex, endIndex).filter(t => t !== null && t !== undefined) as number[];
    const yearPrecip = precipitations.slice(startIndex, endIndex).filter(p => p !== null && p !== undefined) as number[];
    
    // Calculate yearly averages if we have enough data
    if (yearTemps.length > 300 && yearPrecip.length > 300) { // At least 300 days of data
      const avgTemp = yearTemps.reduce((sum, temp) => sum + temp, 0) / yearTemps.length;
      const totalPrecip = yearPrecip.reduce((sum, precip) => sum + precip, 0);
      
      yearlyTemps.push(avgTemp);
      yearlyPrecip.push(totalPrecip);
      years.push(year + 1);
    }
  }
  
  return { temperatures: yearlyTemps, precipitations: yearlyPrecip, years };
};

const fetchClimateData = async (lat: number, lon: number, retries = 2): Promise<ClimateData> => {
  try {
    // Validate coordinates
    if (!validateLatitude(lat) || !validateLongitude(lon)) {
      logger.warn('Invalid coordinates for climate data:', { lat, lon });
      return estimateClimateData(lat);
    }
    
    // Rate limiting - be more lenient
    if (!apiRateLimiter.isAllowed('climate')) {
      logger.warn('[CLIMATE API] Rate limit - using estimates');
      return estimateClimateData(lat);
    }
    
    const attemptNum = 3 - retries;
    logger.log(`[CLIMATE API] Fetching for: ${lat.toFixed(4)}, ${lon.toFixed(4)} (attempt ${attemptNum} of 3)`);
    
    // Use progressively longer timeouts on retries
    const timeout = 10000 + (attemptNum * 5000); // 10s, 15s, 20s
    
    // Fetch current weather data
    const weatherRes = await fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation&timezone=auto`,
      {},
      timeout
    );
    
    if (!weatherRes.ok) {
      throw new Error(`Weather API error: ${weatherRes.status} ${weatherRes.statusText}`);
    }
    
    const weatherData = await weatherRes.json();
    
    const currentTemp = weatherData.current?.temperature_2m;
    const currentPrecip = weatherData.current?.precipitation;
    
    // If current data is missing, use estimates
    if (currentTemp == null) {
      logger.log('[CLIMATE API] No temperature data. Using estimates.');
      return estimateClimateData(lat);
    }
    
    // Try to fetch historical data (non-blocking - we continue even if this fails)
    let historicalData = undefined;
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 3); // Reduced to 3 years for faster response
      
      const historicalRes = await fetchWithTimeout(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&daily=temperature_2m_mean,precipitation_sum&timezone=auto`,
        {},
        timeout
      );
      
      if (historicalRes.ok) {
        const historicalWeatherData = await historicalRes.json();
        
        if (historicalWeatherData.daily) {
          const temperatures = historicalWeatherData.daily.temperature_2m_mean || [];
          const precipitations = historicalWeatherData.daily.precipitation_sum || [];
          
          // Process daily data into yearly averages
          const yearlyData = processDailyToYearly(temperatures, precipitations);
          
          if (yearlyData.temperatures.length > 0) {
            historicalData = {
              temperatures: yearlyData.temperatures,
              precipitations: yearlyData.precipitations,
              years: yearlyData.years
            };
          }
        }
      }
    } catch (histError) {
      // Historical data fetch failed - continue without it
      logger.log('[CLIMATE API] Historical data unavailable, continuing with current data only');
    }
    
    logger.log('[CLIMATE API] Success:', { 
      temperature: currentTemp, 
      precipitation: currentPrecip ?? 0,
      hasHistorical: !!historicalData 
    });
    
    return {
      temperature: currentTemp,
      precipitation: currentPrecip ?? 0, // Default to 0 if no precipitation data
      historicalData,
      isEstimated: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
      console.warn(`[CLIMATE API] Request timed out (attempt ${3 - retries})`);
    } else {
      console.warn(`[CLIMATE API] Error: ${errorMessage}`);
    }
    
    // Retry logic with shorter backoff for climate API (usually more reliable)
    if (retries > 0) {
      const waitTime = (3 - retries) * 1500; // Progressive backoff: 1.5s, 3s
      console.log(`[CLIMATE API] Retrying in ${waitTime/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchClimateData(lat, lon, retries - 1);
    }
    
    logger.log('[CLIMATE API] All attempts exhausted. Using climate-based estimates.');
    return estimateClimateData(lat);
  }
};

const predictFutureClimate = (
  currentTemp: number | null,
  currentPrecip: number | null,
  historicalData: { temperatures: number[]; precipitations: number[]; years: number[] } | undefined,
  year: number,
  latitude: number
): ClimatePrediction => {
  // Default values based on latitude if no data available
  let predictedTemp = currentTemp || (Math.abs(latitude) < 30 ? 25 : Math.abs(latitude) < 60 ? 15 : Math.abs(latitude) < 70 ? 5 : -5);
  let predictedPrecip = currentPrecip || 1000;
  
  // If we have historical data, calculate trends
  if (historicalData && historicalData.temperatures.length > 5) {
    const tempTrend = calculateLinearTrend(historicalData.years, historicalData.temperatures);
    predictedTemp = predictedTemp + (tempTrend * year);
    
    const precipTrend = calculateLinearTrend(historicalData.years, historicalData.precipitations);
    predictedPrecip = Math.max(0, predictedPrecip + (precipTrend * year));
  }
  
  // Calculate growth modifier based on predicted conditions
  const growthModifier = calculateGrowthModifier(predictedTemp, predictedPrecip, currentTemp || predictedTemp, currentPrecip || predictedPrecip);
  
  return {
    temperature: predictedTemp,
    precipitation: predictedPrecip,
    growthModifier
  };
};

const calculateLinearTrend = (years: number[], values: number[]): number => {
  if (years.length !== values.length || years.length < 2) return 0;
  
  const n = years.length;
  const sumX = years.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = years.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumXX = years.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
};

const calculateGrowthModifier = (
  predictedTemp: number,
  predictedPrecip: number,
  currentTemp: number,
  currentPrecip: number
): number => {
  // Temperature change impact (trees generally grow better with moderate warming)
  const tempChange = predictedTemp - currentTemp;
  const tempModifier = 1 + (tempChange * 0.02); // 2% change per degree
  
  // Precipitation change impact
  const precipChange = predictedPrecip - currentPrecip;
  const precipModifier = 1 + (precipChange * 0.0001); // 0.01% change per mm
  
  return Math.max(0.5, Math.min(1.5, tempModifier * precipModifier)); // Clamp between 0.5 and 1.5
};


const ForestImpactCalculator: React.FC<ForestImpactCalculatorProps> = ({ latitude, longitude, years, selectedTreeType, selectedTrees, treePercentages, selectedRegion, plantingData, onDataReady, simulationMode = 'planting', calculationMode = 'perArea', averageTreeAge = 20, onSoilClimateDataReady }) => {

  const [soil, setSoil] = useState<SoilData | null>(null);
  const [climate, setClimate] = useState<ClimateData | null>(null);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [activeEnvTab, setActiveEnvTab] = useState<'environment' | 'economic' | 'social' | 'landuse'>('environment');

  // Use planting data if available, otherwise calculate fallback
  const totalTrees = plantingData?.totalTrees || (selectedRegion ? calculateRegionArea(selectedRegion) * 1111 : 1);

  // Calculate social, economic, and land use impacts with useMemo
  const socialImpact = useMemo(() => {
    if (simulationMode === 'planting') {
      // Planting mode: positive social benefits
      const baseSocialScore = SOCIAL_IMPACT.PLANTING_BASE_SCORE;
      const treeDiversityBonus = selectedTrees && selectedTrees.length > 1 
        ? Math.min(selectedTrees.length * SOCIAL_IMPACT.TREE_DIVERSITY_MULTIPLIER, SOCIAL_IMPACT.MAX_DIVERSITY_BONUS) 
        : 0;
      const timeBonus = Math.min(years * SOCIAL_IMPACT.TIME_MULTIPLIER_PLANTING, SOCIAL_IMPACT.MAX_TIME_BONUS);
      const areaBonus = selectedRegion 
        ? Math.min(calculateRegionArea(selectedRegion) * SOCIAL_IMPACT.AREA_MULTIPLIER_PLANTING, SOCIAL_IMPACT.MAX_AREA_BONUS) 
        : 0;
      
      return Math.min(baseSocialScore + treeDiversityBonus + timeBonus + areaBonus, SOCIAL_IMPACT.MAX_SCORE);
    } else {
      // Clear-cutting mode: negative social impacts
      const baseSocialScore = SOCIAL_IMPACT.CLEAR_CUTTING_BASE_SCORE;
      const treeDiversityPenalty = selectedTrees && selectedTrees.length > 1 
        ? Math.min(selectedTrees.length * SOCIAL_IMPACT.TREE_DIVERSITY_PENALTY, 0.5) 
        : 0;
      const timePenalty = Math.min(years * SOCIAL_IMPACT.TIME_MULTIPLIER_CLEARING, 0.5);
      const areaPenalty = selectedRegion 
        ? Math.min(calculateRegionArea(selectedRegion) * SOCIAL_IMPACT.AREA_MULTIPLIER_CLEARING, 0.5) 
        : 0;
      
      return Math.max(baseSocialScore - treeDiversityPenalty - timePenalty - areaPenalty, SOCIAL_IMPACT.MIN_SCORE);
    }
  }, [selectedTrees, years, selectedRegion, simulationMode]);



  const landUseImpact = useMemo(() => {
    // Use planting data area if available, otherwise calculate from selected region
    const area = plantingData?.area || (selectedRegion ? calculateRegionArea(selectedRegion) : 0);
    
    if (simulationMode === 'planting') {
      // Planting mode: positive land use improvements
      const erosionReduction = Math.min(area * LAND_USE_IMPACT.EROSION_AREA_FACTOR, LAND_USE_IMPACT.MAX_PERCENTAGE);
      const soilImprovement = Math.min(years * LAND_USE_IMPACT.SOIL_TIME_FACTOR, LAND_USE_IMPACT.MAX_DEGRADATION);
      const habitatCreation = Math.min(area * LAND_USE_IMPACT.HABITAT_AREA_FACTOR, 90);
      const waterQuality = Math.min(years * LAND_USE_IMPACT.WATER_TIME_FACTOR, 85);
      
      return {
        erosionReduction,
        soilImprovement,
        habitatCreation,
        waterQuality
      };
    } else {
      // Clear-cutting mode: negative land use impacts
      const erosionIncrease = Math.min(area * LAND_USE_IMPACT.EROSION_AREA_FACTOR_CLEARING, LAND_USE_IMPACT.MAX_PERCENTAGE);
      const soilDegradation = Math.min(years * LAND_USE_IMPACT.SOIL_TIME_FACTOR_CLEARING, LAND_USE_IMPACT.MAX_DEGRADATION);
      const habitatLoss = Math.min(area * LAND_USE_IMPACT.HABITAT_AREA_FACTOR_CLEARING, 90);
      const waterQualityDecline = Math.min(years * LAND_USE_IMPACT.WATER_TIME_FACTOR_CLEARING, 85);
      
      return {
        erosionReduction: erosionIncrease, // Using same property name for display
        soilImprovement: soilDegradation, // Using same property name for display
        habitatCreation: habitatLoss, // Using same property name for display
        waterQuality: waterQualityDecline // Using same property name for display
      };
    }
  }, [selectedRegion, years, plantingData, simulationMode]);

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Fetch soil and climate data for the selected location with caching
  useEffect(() => {
    if (latitude && longitude) {
      // Validate inputs
      if (!validateLatitude(latitude) || !validateLongitude(longitude)) {
        setError('Invalid coordinates provided.');
        return;
      }
      
      // Check persistent cache first (localStorage)
      const cacheKey = `env-${generateLocationKey(latitude, longitude)}`;
      const cachedData = getCachedData<{ soil: SoilData; climate: ClimateData }>(cacheKey);
      
      if (cachedData) {
        logger.log('Using cached environmental data from localStorage');
        setSoil(cachedData.soil);
        setClimate(cachedData.climate);
        setLoading(false);
        setError(null);
        
        // Notify parent component about cached soil and climate data
        if (onSoilClimateDataReady) {
          onSoilClimateDataReady(cachedData.soil, cachedData.climate);
        }
        return;
      }
      
      setLoading(true);
      setError(null);
      
      logger.log('Fetching environmental data for:', latitude, longitude);
      
      Promise.allSettled([
        fetchSoilData(latitude, longitude),
        fetchClimateData(latitude, longitude)
      ])
        .then((results) => {
          const [soilResult, climateResult] = results;
          
          let soilData: SoilData = { carbon: null, ph: null };
          let climateData: ClimateData = { temperature: null, precipitation: null };
          
          if (soilResult.status === 'fulfilled') {
            soilData = soilResult.value;
            setSoil(soilData);
          } else {
            logger.log('Soil data failed:', soilResult.reason);
            setSoil(soilData);
          }
          
          if (climateResult.status === 'fulfilled') {
            climateData = climateResult.value;
            setClimate(climateData);
          } else {
            logger.log('Climate data fetch failed:', climateResult.reason);
            setClimate(climateData);
            setError('Weather API temporarily unavailable - using regional climate estimates based on latitude');
          }
          
          // Cache the results in localStorage (1 hour TTL)
          setCachedData(cacheKey, { soil: soilData, climate: climateData }, 60 * 60 * 1000);
          
          // Notify parent component about soil and climate data
          if (onSoilClimateDataReady) {
            onSoilClimateDataReady(soilData, climateData);
          }
          
          logger.log('Environmental data cached in localStorage for:', cacheKey);
        })
        .catch((error) => {
          console.error('Unexpected error fetching environmental data:', error);
          setError('Failed to load environmental data. Please try again.');
        })
        .finally(() => setLoading(false));
    } else {
      setSoil(null);
      setClimate(null);
      
      // Notify parent component that no data is available
      if (onSoilClimateDataReady) {
        onSoilClimateDataReady(null, null);
    }
    }
  }, [latitude, longitude, onSoilClimateDataReady]);

  const calculateImpact = useCallback((
    lat: number,
    lng: number,
    soil?: SoilData,
    climate?: ClimateData,
    treeType?: TreeType,
    treeTypes?: TreeType[]
  ): ImpactMetrics => {
    // Handle multiple trees with percentage distribution
    let carbonBase = 0;
    let biodiversityBase = 0;
    let resilienceBase = 0;
    
    if (treeTypes && treeTypes.length > 0) {
      if (treePercentages && Object.values(treePercentages).reduce((sum, p) => sum + (p || 0), 0) === 100) {
        // Use percentage distribution
        treeTypes.forEach(tree => {
          const percentage = treePercentages[tree.id] || 0;
          const weight = percentage / 100;
          carbonBase += tree.carbonSequestration * weight;
          biodiversityBase += tree.biodiversityValue * weight;
          resilienceBase += tree.resilienceScore * weight;
        });
      } else {
        // Fallback to equal distribution
        const carbonSum = treeTypes.reduce((sum, tree) => sum + tree.carbonSequestration, 0);
        const biodiversitySum = treeTypes.reduce((sum, tree) => sum + tree.biodiversityValue, 0);
        const resilienceSum = treeTypes.reduce((sum, tree) => sum + tree.resilienceScore, 0);
        
        carbonBase = carbonSum / treeTypes.length;
        biodiversityBase = biodiversitySum / treeTypes.length;
        resilienceBase = resilienceSum / treeTypes.length;
      }
    } else if (treeType) {
      // Single tree type
      carbonBase = treeType.carbonSequestration;
      biodiversityBase = treeType.biodiversityValue;
      resilienceBase = treeType.resilienceScore;
    } else {
      // No trees selected - return zero values
      carbonBase = 0;
      biodiversityBase = 0;
      resilienceBase = 0;
    }
    
    // Apply environmental modifiers
    if (soil?.carbon) carbonBase += soil.carbon * CARBON_CONVERSION.SOIL_CARBON_MODIFIER;
    if (climate?.precipitation) resilienceBase += climate.precipitation * ENVIRONMENTAL_MODIFIERS.PRECIPITATION_TO_RESILIENCE;
    
    // Apply calculation mode multiplier
    const multiplier = calculationMode === 'perArea' ? totalTrees : 1;
    const carbonSequestration = carbonBase * multiplier;
    
    // Biodiversity and resilience change based on simulation mode
    let biodiversityTimeBonus, resilienceTimeBonus, forestSizeBonus;
    
    if (simulationMode === 'planting') {
      // Planting mode: improve over time and scale with forest size
      biodiversityTimeBonus = Math.min(1, years * IMPACT_CAPS.BIODIVERSITY_TIME_BONUS);
      resilienceTimeBonus = Math.min(1, years * IMPACT_CAPS.RESILIENCE_TIME_BONUS);
      forestSizeBonus = calculationMode === 'perArea' ? Math.min(1, Math.log10(totalTrees) * 0.2) : 0;
    } else {
      // Clear-cutting mode: degrade over time and scale with forest size (more trees = more damage)
      biodiversityTimeBonus = Math.max(-1, -years * IMPACT_CAPS.BIODIVERSITY_TIME_BONUS);
      resilienceTimeBonus = Math.max(-1, -years * IMPACT_CAPS.RESILIENCE_TIME_BONUS);
      forestSizeBonus = calculationMode === 'perArea' ? Math.min(1, Math.log10(totalTrees) * 0.2) : 0; // More trees = more damage
    }
    
    const biodiversityImpact = Math.min(IMPACT_CAPS.MAX_BIODIVERSITY, Math.max(IMPACT_CAPS.MIN_BIODIVERSITY, biodiversityBase + biodiversityTimeBonus + forestSizeBonus));
    const forestResilience = Math.min(IMPACT_CAPS.MAX_RESILIENCE, Math.max(IMPACT_CAPS.MIN_RESILIENCE, resilienceBase + resilienceTimeBonus + forestSizeBonus));

    // Water retention calculation
    let waterBase = 70; // Default base
    
    // Only apply geographic assumptions if we don't have actual climate data
    if (climate?.precipitation === null || climate?.precipitation === undefined) {
      // Use geographic fallbacks when no precipitation data available
      waterBase = Math.abs(lat) < 30 ? 85 : Math.abs(lat) < 60 ? 75 : 70;
    } else {
      // Use actual precipitation data to calculate water retention
      // Higher precipitation means better water retention potential
      const precipBonus = climate.precipitation > 1500 ? 15 : climate.precipitation > 1000 ? 10 : climate.precipitation > 500 ? 5 : 0;
      waterBase = Math.max(60, Math.min(90, 70 + precipBonus));
    }
    
    // Water retention changes based on simulation mode
    let waterTimeBonus, waterSizeBonus;
    
    if (simulationMode === 'planting') {
      // Planting mode: improve over time and scale with forest size
      waterTimeBonus = years * WATER_RETENTION.ANNUAL_IMPROVEMENT;
      waterSizeBonus = calculationMode === 'perArea' ? Math.min(10, Math.log10(totalTrees) * 2) : 0; // More trees = better water retention
    } else {
      // Clear-cutting mode: degrade over time and scale with forest size (more trees = more damage)
      waterTimeBonus = -years * WATER_RETENTION.ANNUAL_DEGRADATION;
      waterSizeBonus = calculationMode === 'perArea' ? Math.min(15, Math.log10(totalTrees) * 3) : 0; // More trees = more damage
    }
    
    const waterRetention = Math.min(WATER_RETENTION.MAX_RETENTION, Math.max(0, waterBase + waterTimeBonus + waterSizeBonus));

    // Air quality improves over time as trees mature and grow larger
    // Base air quality improvement varies by climate zone (more impact in polluted areas)
    let airQualityBase = 60; // Default temperate zone
    
    // Only apply geographic assumptions if we don't have actual climate data
    if (climate?.temperature === null || climate?.temperature === undefined || 
        climate?.precipitation === null || climate?.precipitation === undefined) {
      // Use geographic fallbacks when no climate data available
      if (Math.abs(lat) < 30) {
        airQualityBase = 70; // Tropical - higher impact due to year-round growth and dense vegetation
      } else if (Math.abs(lat) < 60) {
        airQualityBase = 60; // Temperate - moderate impact
      } else {
        airQualityBase = 50; // Boreal/Arctic - lower impact due to shorter growing seasons
      }
    } else {
      // Use actual climate data to adjust air quality impact
      // Higher temperatures and precipitation generally mean better air quality improvement potential
      const tempBonus = climate.temperature > 20 ? 5 : climate.temperature > 10 ? 0 : -5;
      const precipBonus = climate.precipitation > 1000 ? 3 : climate.precipitation > 500 ? 0 : -3;
      airQualityBase = Math.max(40, Math.min(80, 60 + tempBonus + precipBonus));
    }
    
    // Air quality changes based on simulation mode
    let airQualityImprovement;
    
    if (simulationMode === 'planting') {
      // Planting mode: improve over time and scale with forest size
      const airTimeBonus = years * AIR_QUALITY.ANNUAL_IMPROVEMENT;
      const airSizeBonus = calculationMode === 'perArea' ? Math.min(15, Math.log10(totalTrees) * 3) : 0; // More trees = better air quality
      airQualityImprovement = Math.min(AIR_QUALITY.MAX_IMPROVEMENT, Math.max(0, airQualityBase + airTimeBonus + airSizeBonus));
    } else {
      // Clear-cutting mode: immediately negative impact, gets worse over time
      const immediateImpact = calculationMode === 'perArea' ? Math.min(30, Math.log10(totalTrees) * 5) : 10; // Immediate negative impact based on forest size
      const timeDegradation = years * AIR_QUALITY.ANNUAL_DEGRADATION;
      airQualityImprovement = Math.max(AIR_QUALITY.MAX_DEGRADATION, -(immediateImpact + timeDegradation)); // Start negative, can go down to -80%
    }

    return {
      carbonSequestration: Math.max(0, carbonSequestration),
      biodiversityImpact: Math.max(0, biodiversityImpact),
      forestResilience: Math.max(0, forestResilience),
      waterRetention: Math.max(0, waterRetention),
      airQualityImprovement: Math.max(0, airQualityImprovement)
    };
  }, [treePercentages, calculationMode, totalTrees, years, simulationMode]);

  // Calculate impact and all derived values BEFORE early returns to ensure consistent hook order
  const impact = useMemo(() => calculateImpact(
    latitude || 0,
    longitude || 0,
    soil || undefined,
    climate || undefined,
    selectedTreeType || undefined,
    selectedTrees || undefined
  ), [latitude, longitude, soil, climate, selectedTreeType, selectedTrees, calculateImpact]);
  
  // Calculate cumulative carbon with realistic growth model and climate predictions
  const calculateCumulativeCarbon = useCallback((annualRate: number, years: number): number => {
    let total = 0;
    
    // Only apply climate predictions if we have actual climate data
    const hasClimateData = climate?.temperature !== null && climate?.temperature !== undefined && 
                          climate?.precipitation !== null && climate?.precipitation !== undefined;
    
    for (let year = 1; year <= years; year++) {
      // Growth curve: slow start, rapid growth, then plateau
      // Year 1: 5% of mature rate
      // Year 2: 15% of mature rate  
      // Year 3: 30% of mature rate
      // Year 4: 50% of mature rate
      // Year 5: 70% of mature rate
      // Year 6: 85% of mature rate
      // Year 7+: 95% of mature rate (approaching full maturity)
      
      let growthFactor: number;
      if (year === 1) growthFactor = TREE_GROWTH_FACTORS.YEAR_1;
      else if (year === 2) growthFactor = TREE_GROWTH_FACTORS.YEAR_2;
      else if (year === 3) growthFactor = TREE_GROWTH_FACTORS.YEAR_3;
      else if (year === 4) growthFactor = TREE_GROWTH_FACTORS.YEAR_4;
      else if (year === 5) growthFactor = TREE_GROWTH_FACTORS.YEAR_5;
      else if (year === 6) growthFactor = TREE_GROWTH_FACTORS.YEAR_6;
      else growthFactor = TREE_GROWTH_FACTORS.YEAR_7_PLUS;
      
      let combinedGrowthFactor = growthFactor;
      
      // Only apply climate prediction if we have actual climate data
      if (hasClimateData) {
        const climatePrediction = predictFutureClimate(
          climate.temperature!,
          climate.precipitation!,
          climate?.historicalData,
          year,
          latitude || 0
        );
        
        // Combine tree growth factor with climate modifier
        combinedGrowthFactor = growthFactor * climatePrediction.growthModifier;
      }
      
      total += annualRate * combinedGrowthFactor;
    }
    return total;
  }, [climate, latitude]);
  
  const totalCarbon = useMemo(() => calculateCumulativeCarbon(impact.carbonSequestration, years), [impact.carbonSequestration, years, calculateCumulativeCarbon]);
  
  // Calculate job creation based on project scale and simulation mode
  const economicImpact = useMemo(() => {
    // Get area in hectares for more realistic job calculation
    const areaHectares = plantingData?.area || (selectedRegion ? calculateRegionArea(selectedRegion) : 0);
    
    let jobCreation;
    
    if (simulationMode === 'planting') {
      // Planting operations: fewer workers, more long-term
      // More granular thresholds for small projects
      if (areaHectares < 0.1) {
        jobCreation = 2; // Very small (backyard/community): 2 people minimum (planting team)
      } else if (areaHectares < 0.5) {
        jobCreation = 2; // Small (large backyard): 2-3 people (planting, support)
      } else if (areaHectares < 1) {
        jobCreation = 3; // Small project: 3 people (planting, supervision)
      } else if (areaHectares < 5) {
        jobCreation = 4; // Medium-small: 4 people (planting, maintenance)
      } else if (areaHectares < 20) {
        jobCreation = 6; // Medium projects: 6 people (planting, maintenance, monitoring)
      } else if (areaHectares < 50) {
        jobCreation = 10; // Larger projects: 10 people (full team)
      } else if (areaHectares < 100) {
        jobCreation = 15; // Large projects: 15 people (multiple crews)
      } else {
        jobCreation = Math.floor(areaHectares / 10); // Very large projects: 1 job per 10 hectares
      }
    } else {
      // Clear-cutting operations: more workers, intensive short-term operations
      if (areaHectares < 0.1) {
        jobCreation = 3; // Very small operations: 3 people (logger, helper, supervisor)
      } else if (areaHectares < 0.5) {
        jobCreation = 4; // Small operations: 4 people (crew, equipment)
      } else if (areaHectares < 1) {
        jobCreation = 5; // Small operations: 5 people (logging crew, equipment)
      } else if (areaHectares < 5) {
        jobCreation = 8; // Medium-small: 8 people (crew, equipment, transport)
      } else if (areaHectares < 20) {
        jobCreation = 15; // Medium operations: 15 people (logging crew, heavy machinery, transport, processing)
      } else if (areaHectares < 50) {
        jobCreation = 30; // Larger operations: 30 people (full logging team, multiple crews, processing)
      } else if (areaHectares < 100) {
        jobCreation = 50; // Large operations: 50 people (multiple crews, processing, transport, management)
      } else {
        jobCreation = Math.floor(areaHectares / 2); // Very large operations: 1 job per 2 hectares (intensive)
      }
    }
    
    return {
      jobCreation
    };
  }, [plantingData, selectedRegion, simulationMode]);
  
  // Format total carbon based on calculation mode
  const formatTotalCarbon = (carbon: number) => {
    if (calculationMode === 'perTree') {
      return carbon.toFixed(1);
    } else {
      // For entire area, show in metric tons for better readability
      const tons = carbon / 1000;
      return tons > 1000 ? `${(tons / 1000).toFixed(1)}k` : tons.toFixed(1);
    }
  };
  
  const getTotalCarbonUnit = () => {
    if (calculationMode === 'perTree') {
      return 'kg CO₂';
    } else {
      const tons = totalCarbon / 1000;
      return tons > 1000 ? 'metric tons CO₂' : 'metric tons CO₂';
    }
  };
  
  // Calculate cumulative biodiversity and resilience with growth model and climate predictions
  const calculateCumulativeImpact = (annualRate: number, years: number): number => {
    let total = 0;
    
    // Only apply climate predictions if we have actual climate data
    const hasClimateData = climate?.temperature !== null && climate?.temperature !== undefined && 
                          climate?.precipitation !== null && climate?.precipitation !== undefined;
    
    for (let year = 1; year <= years; year++) {
      // Similar growth curve for biodiversity and resilience
      let growthFactor: number;
      if (year === 1) growthFactor = BIODIVERSITY_GROWTH_FACTORS.YEAR_1;
      else if (year === 2) growthFactor = BIODIVERSITY_GROWTH_FACTORS.YEAR_2;
      else if (year === 3) growthFactor = BIODIVERSITY_GROWTH_FACTORS.YEAR_3;
      else if (year === 4) growthFactor = BIODIVERSITY_GROWTH_FACTORS.YEAR_4;
      else if (year === 5) growthFactor = BIODIVERSITY_GROWTH_FACTORS.YEAR_5;
      else if (year === 6) growthFactor = BIODIVERSITY_GROWTH_FACTORS.YEAR_6;
      else growthFactor = BIODIVERSITY_GROWTH_FACTORS.YEAR_7_PLUS;
      
      let combinedGrowthFactor = growthFactor;
      
      // Only apply climate prediction if we have actual climate data
      if (hasClimateData) {
        const climatePrediction = predictFutureClimate(
          climate.temperature!,
          climate.precipitation!,
          climate?.historicalData,
          year,
          latitude || 0
        );
        
        // Combine tree growth factor with climate modifier
        combinedGrowthFactor = growthFactor * climatePrediction.growthModifier;
      }
      
      total += annualRate * combinedGrowthFactor;
    }
    return total / years; // Return average over the period
  };
  
  const averageBiodiversity = calculateCumulativeImpact(impact.biodiversityImpact, years);
  const averageResilience = calculateCumulativeImpact(impact.forestResilience, years);

  // Calculate meaningful comparisons
  const getComparisons = (totalCarbon: number) => {
    const comparisons = [];
    
    // Car emissions comparison
    const carYears = totalCarbon / COMPARISON_FACTORS.CAR_EMISSIONS_PER_YEAR;
    if (carYears >= 0.1) {
      comparisons.push(`${carYears.toFixed(1)} year${carYears !== 1 ? 's' : ''} of average car emissions`);
    }
    
    // Flight comparison
    const flights = totalCarbon / COMPARISON_FACTORS.FLIGHT_NY_LONDON;
    if (flights >= 0.1) {
      comparisons.push(`${flights.toFixed(1)} round-trip flight${flights !== 1 ? 's' : ''} (NY-London)`);
    }
    
    // Household electricity comparison
    const householdYears = totalCarbon / COMPARISON_FACTORS.HOUSEHOLD_ELECTRICITY_PER_YEAR;
    if (householdYears >= 0.1) {
      comparisons.push(`${householdYears.toFixed(1)} year${householdYears !== 1 ? 's' : ''} of average household electricity`);
    }
    
    // Add area-specific comparisons for entire area mode
    if (calculationMode === 'perArea' && selectedRegion) {
      const area = calculateRegionArea(selectedRegion);
      if (area > 0) {
        // Carbon sequestration per hectare
        const carbonPerHectare = (totalCarbon / 1000) / area;
        comparisons.push(`${carbonPerHectare.toFixed(1)} metric tons CO₂ per hectare over ${years} years`);
      }
    }
    
    return comparisons;
  };

  const comparisons = getComparisons(totalCarbon);

  // Call onDataReady when data is ready - wrapped in useEffect to avoid render-time state updates
  useEffect(() => {
    if (onDataReady && latitude && longitude && !loading && !error) {
      onDataReady({
        metadata: {
          timestamp: new Date().toISOString(),
          simulatorVersion: "1.0.0",
          location: {
            latitude,
            longitude,
            region: selectedRegion
          },
          simulation: {
            years,
            selectedTrees: selectedTrees || (selectedTreeType ? [selectedTreeType] : []),
            treePercentages: treePercentages || {}
          }
        },
        environmentalData: {
          soil,
          climate
        },
        impactResults: {
          carbonSequestration: impact.carbonSequestration,
          biodiversityImpact: impact.biodiversityImpact,
          forestResilience: impact.forestResilience,
          waterRetention: impact.waterRetention,
          airQualityImprovement: impact.airQualityImprovement,
          totalCarbon,
          averageBiodiversity,
          averageResilience
        }
      });
    }
  }, [onDataReady, latitude, longitude, loading, error, selectedRegion, years, selectedTrees, selectedTreeType, treePercentages, soil, climate, impact, totalCarbon, averageBiodiversity, averageResilience]);

  // Early return checks - must be after all hooks and calculations
  if (!latitude || !longitude) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600">Select a location on the map to see the potential impact of planting a forest there.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">Loading environmental data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-white border-2 border-gray-200 rounded-xl shadow-lg">


      <div className="mb-6">
        <h4 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Impact Analysis</h4>
        
        {/* Tab Navigation */}
        <div className="flex border-b-2 border-gray-200 mb-4 overflow-x-auto" role="tablist" aria-label="Impact analysis categories">
          <button
            onClick={() => setActiveEnvTab('environment')}
            className={`px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeEnvTab === 'environment'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
            role="tab"
            aria-selected={activeEnvTab === 'environment'}
            aria-controls="environment-panel"
          >
            Environment
          </button>
          <button
            onClick={() => setActiveEnvTab('economic')}
            className={`px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeEnvTab === 'economic'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
            role="tab"
            aria-selected={activeEnvTab === 'economic'}
            aria-controls="economic-panel"
          >
            Economic
          </button>
          <button
            onClick={() => setActiveEnvTab('social')}
            className={`px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeEnvTab === 'social'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
            role="tab"
            aria-selected={activeEnvTab === 'social'}
            aria-controls="social-panel"
          >
            Social
          </button>
          <button
            onClick={() => setActiveEnvTab('landuse')}
            className={`px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeEnvTab === 'landuse'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
            role="tab"
            aria-selected={activeEnvTab === 'landuse'}
            aria-controls="landuse-panel"
          >
            Land Use
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[100px]">
          {activeEnvTab === 'environment' && (
            <EnvironmentTab
              simulationMode={simulationMode}
              calculationMode={calculationMode}
              years={years}
              averageTreeAge={averageTreeAge}
              totalTrees={totalTrees}
              impact={impact}
              totalCarbon={totalCarbon}
              averageBiodiversity={averageBiodiversity}
              averageResilience={averageResilience}
              climate={climate}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
              formatTotalCarbon={formatTotalCarbon}
              getTotalCarbonUnit={getTotalCarbonUnit}
            />
          )}

          {activeEnvTab === 'social' && (
            <SocialTab
              simulationMode={simulationMode}
              years={years}
              selectedTrees={selectedTrees}
              selectedRegion={selectedRegion}
              socialImpact={socialImpact}
            />
          )}

          {activeEnvTab === 'economic' && (
            <EconomicTab
              simulationMode={simulationMode}
              jobCreation={economicImpact.jobCreation}
            />
          )}

          {activeEnvTab === 'landuse' && (
            <LandUseTab
              simulationMode={simulationMode}
              selectedRegion={selectedRegion}
              landUseImpact={landUseImpact}
            />
          )}
        </div>
      </div>

      {selectedTrees && selectedTrees.length > 0 && (
        <div className="mb-6 flex flex-col bg-white rounded-xl shadow-md p-5 md:p-6 max-w-3xl w-full border border-gray-200">
          <span className="text-base md:text-lg font-bold text-gray-900 mb-3">
            Selected Trees: {selectedTrees.length} species
            {calculationMode === 'perArea' && selectedRegion && (
              <span className="text-primary ml-2">• {totalTrees.toLocaleString()} total trees in area</span>
            )}
          </span>
          <ul className="space-y-3 text-sm md:text-base text-gray-700">
            {selectedTrees.map((tree) => {
              const percentage = treePercentages?.[tree.id] || 0;
              return (
                <li key={tree.id} className="flex flex-col sm:flex-row sm:items-center sm:gap-2 break-words">
                  <span className="font-medium">{tree.name} <span className="font-normal text-gray-500">- {tree.scientificName}</span></span>
                  <span className="text-gray-600">({tree.carbonSequestration} kg CO₂/year)</span>
                  {selectedTrees.length > 1 && percentage > 0 && (
                    <span className="text-primary font-medium">({percentage}%)</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-sm md:text-base text-gray-600 mt-4">
            {selectedTrees.length === 0 
              ? <><span className="font-semibold">No trees selected</span></>
              : selectedTrees.length > 1 && treePercentages && Object.values(treePercentages).reduce((sum, p) => sum + (p || 0), 0) === 100 
                ? <><span className="font-semibold">Weighted avg:</span> {calculationMode === 'perTree' ? `${impact.carbonSequestration.toFixed(1)} kg CO₂/year` : `${(impact.carbonSequestration / totalTrees).toFixed(1)} kg CO₂/year per tree`}</>
                : <><span className="font-semibold">Average:</span> {calculationMode === 'perTree' ? `${(selectedTrees.reduce((sum, tree) => sum + tree.carbonSequestration, 0) / selectedTrees.length).toFixed(1)} kg CO₂/year per tree` : `${(selectedTrees.reduce((sum, tree) => sum + tree.carbonSequestration, 0) / selectedTrees.length).toFixed(1)} kg CO₂/year per tree`}</>
            }
          </p>
        </div>
      )}

      {/* Horizontal separator line */}
      <div className="my-6 border-t border-gray-200"></div>



      {/* Impact boxes moved to Environment tab */}

      {comparisons.length > 0 && (
        <div className="mb-6 p-5 md:p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
          <h4 className="text-lg md:text-xl font-bold text-primary mb-3">Real-world Impact Comparison</h4>
          <p className="text-base md:text-lg text-primary mb-3 font-semibold">
            This forest would sequester the equivalent of:
          </p>
          <ul className="text-sm md:text-base text-primary space-y-2">
            {comparisons.map((comparison, index) => {
              // Split comparison text and make numbers bold using React components (safe)
              const parts = comparison.split(/(\d+\.?\d*)/g);
              return (
                <li key={index} className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>
                    {parts.map((part, partIndex) => {
                      // Check if part is a number (matches the regex pattern)
                      if (/^\d+\.?\d*$/.test(part)) {
                        return <strong key={partIndex}>{part}</strong>;
                      }
                      return <span key={partIndex}>{part}</span>;
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}


    </div>
  );
};

export default ForestImpactCalculator; 