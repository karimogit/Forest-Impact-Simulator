"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { TreeType } from '@/types/treeTypes';
import { validateLatitude, validateLongitude, apiRateLimiter } from '@/utils/security';
import { ExportData } from '@/utils/exportUtils';
import { calculateRegionArea } from '@/utils/treePlanting';
import { getCachedData, setCachedData, generateLocationKey } from '@/utils/apiCache';

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

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  value: string;
  description: string;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  value, 
  description, 
  isExpanded, 
  onToggle, 
  className = "" 
}) => {
  return (
    <div className={`bg-white rounded shadow p-4 ${className}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded transition-colors"
        aria-expanded={isExpanded}
        aria-label={`${title}: ${value}`}
      >
        <div className="flex-1">
          <div className="text-xs text-gray-900 font-bold mb-1">{title}</div>
          <div className="text-primary font-bold text-sm">{value}</div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100" role="region" aria-label={`Details for ${title}`}>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
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
  
  console.log(`Using estimated climate data for latitude ${lat}:`, { temperature, precipitation });
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
  
  console.log(`Using estimated soil data for latitude ${lat}:`, { carbon, ph });
  return { carbon, ph, isEstimated: true };
};

const fetchSoilData = async (lat: number, lon: number, retries = 2): Promise<SoilData> => {
  try {
    // Validate coordinates
    if (!validateLatitude(lat) || !validateLongitude(lon)) {
      console.warn('Invalid coordinates for soil data:', { lat, lon });
      return estimateSoilData(lat);
    }
    
    // Rate limiting - be more lenient
    if (!apiRateLimiter.isAllowed('soil')) {
      console.warn('[SOIL API] Rate limit - using estimates');
      return estimateSoilData(lat);
    }
    
    const attemptNum = 3 - retries;
    console.log(`[SOIL API] Fetching soil data for: ${lat.toFixed(4)}, ${lon.toFixed(4)} (attempt ${attemptNum} of 3)`);
    
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
        console.log(`[SOIL API] No data available for this location (${res.status}). Using estimates.`);
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
      console.log('[SOIL API] API returned null values. Using climate-based estimates.');
      return estimateSoilData(lat);
    }
    
    // Allow partial data - use estimates for missing values
    const result: SoilData = {
      carbon: carbon ?? estimateSoilData(lat).carbon,
      ph: ph ?? estimateSoilData(lat).ph,
      isEstimated: carbon === null || ph === null
    };
    
    console.log('[SOIL API] Success:', { carbon: result.carbon, ph: result.ph, partial: result.isEstimated });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Don't retry for certain errors
    if (errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
      console.warn(`[SOIL API] Request timed out (attempt ${3 - retries})`);
    } else {
      console.warn(`[SOIL API] Error: ${errorMessage}`);
    }
    
    // Retry logic with exponential backoff
    if (retries > 0) {
      const waitTime = (3 - retries) * 2000; // Progressive backoff: 2s, 4s
      console.log(`[SOIL API] Retrying in ${waitTime/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchSoilData(lat, lon, retries - 1);
    }
    
    console.log('[SOIL API] All attempts exhausted. Using climate-based estimates.');
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
      console.warn('Invalid coordinates for climate data:', { lat, lon });
      return estimateClimateData(lat);
    }
    
    // Rate limiting - be more lenient
    if (!apiRateLimiter.isAllowed('climate')) {
      console.warn('[CLIMATE API] Rate limit - using estimates');
      return estimateClimateData(lat);
    }
    
    const attemptNum = 3 - retries;
    console.log(`[CLIMATE API] Fetching for: ${lat.toFixed(4)}, ${lon.toFixed(4)} (attempt ${attemptNum} of 3)`);
    
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
      console.log('[CLIMATE API] No temperature data. Using estimates.');
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
      console.log('[CLIMATE API] Historical data unavailable, continuing with current data only');
    }
    
    console.log('[CLIMATE API] Success:', { 
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
    
    console.log('[CLIMATE API] All attempts exhausted. Using climate-based estimates.');
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

const calculateAnnualCarbonWithGrowth = (matureRate: number, year: number): number => {
  // Growth curve: slow start, rapid growth, then plateau
  let growthFactor = 0;
  if (year === 1) growthFactor = 0.05;
  else if (year === 2) growthFactor = 0.15;
  else if (year === 3) growthFactor = 0.30;
  else if (year === 4) growthFactor = 0.50;
  else if (year === 5) growthFactor = 0.70;
  else if (year === 6) growthFactor = 0.85;
  else growthFactor = 0.95;
  
  return matureRate * growthFactor;
};

// Helper function to get growth factor based on tree age
const getGrowthFactor = (age: number): number => {
  if (age <= 1) return 0.05;
  else if (age <= 2) return 0.15;
  else if (age <= 3) return 0.30;
  else if (age <= 4) return 0.50;
  else if (age <= 5) return 0.70;
  else if (age <= 6) return 0.85;
  else if (age <= 20) return 0.95; // Mature trees
  else if (age <= 50) return 0.90; // Older mature trees
  else return 0.85; // Very old trees
};

// New function for clear-cutting carbon calculations
const calculateClearCuttingCarbon = (matureRate: number, treeAge: number, simulationYears: number): { immediate: number, lostFuture: number, total: number } => {
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
  
  // Convert carbon to CO2 (carbon * 3.67)
  const immediateRelease = trunkCarbonKg * 3.67;
  
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
      const baseSocialScore = 3.5; // Base social benefit score (1-5)
      const treeDiversityBonus = selectedTrees && selectedTrees.length > 1 ? Math.min(selectedTrees.length * 0.2, 1) : 0;
      const timeBonus = Math.min(years * 0.02, 1); // Benefits increase over time
      const areaBonus = selectedRegion ? Math.min(calculateRegionArea(selectedRegion) * 0.1, 1) : 0;
      
      return Math.min(baseSocialScore + treeDiversityBonus + timeBonus + areaBonus, 5);
    } else {
      // Clear-cutting mode: negative social impacts
      const baseSocialScore = 2.0; // Lower base score due to negative impacts
      const treeDiversityPenalty = selectedTrees && selectedTrees.length > 1 ? Math.min(selectedTrees.length * 0.1, 0.5) : 0;
      const timePenalty = Math.min(years * 0.01, 0.5); // Negative impacts increase over time
      const areaPenalty = selectedRegion ? Math.min(calculateRegionArea(selectedRegion) * 0.05, 0.5) : 0;
      
      return Math.max(baseSocialScore - treeDiversityPenalty - timePenalty - areaPenalty, 1);
    }
  }, [selectedTrees, years, selectedRegion, simulationMode]);



  const landUseImpact = useMemo(() => {
    // Use planting data area if available, otherwise calculate from selected region
    const area = plantingData?.area || (selectedRegion ? calculateRegionArea(selectedRegion) : 0);
    
    if (simulationMode === 'planting') {
      // Planting mode: positive land use improvements
      const erosionReduction = Math.min(area * 0.5, 95); // Erosion reduction percentage
      const soilImprovement = Math.min(years * 1.5, 80); // Soil quality improvement
      const habitatCreation = Math.min(area * 2, 90); // Habitat creation percentage
      const waterQuality = Math.min(years * 1.2, 85); // Water quality improvement
      
      return {
        erosionReduction,
        soilImprovement,
        habitatCreation,
        waterQuality
      };
    } else {
      // Clear-cutting mode: negative land use impacts
      const erosionIncrease = Math.min(area * 0.8, 95); // Erosion increase percentage
      const soilDegradation = Math.min(years * 2.0, 80); // Soil quality degradation
      const habitatLoss = Math.min(area * 3, 90); // Habitat loss percentage
      const waterQualityDecline = Math.min(years * 1.8, 85); // Water quality decline
      
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
        console.log('Using cached environmental data from localStorage');
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
      
      console.log('Fetching environmental data for:', latitude, longitude);
      
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
            console.log('Soil data failed:', soilResult.reason);
            setSoil(soilData);
          }
          
          if (climateResult.status === 'fulfilled') {
            climateData = climateResult.value;
            setClimate(climateData);
          } else {
            console.log('Climate data fetch failed:', climateResult.reason);
            setClimate(climateData);
            setError('Weather API temporarily unavailable - using regional climate estimates based on latitude');
          }
          
          // Cache the results in localStorage (1 hour TTL)
          setCachedData(cacheKey, { soil: soilData, climate: climateData }, 60 * 60 * 1000);
          
          // Notify parent component about soil and climate data
          if (onSoilClimateDataReady) {
            onSoilClimateDataReady(soilData, climateData);
          }
          
          console.log('Environmental data cached in localStorage for:', cacheKey);
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
    if (soil?.carbon) carbonBase += soil.carbon / 10;
    if (climate?.precipitation) resilienceBase += climate.precipitation / 1000;
    
    // Apply calculation mode multiplier
    const multiplier = calculationMode === 'perArea' ? totalTrees : 1;
    const carbonSequestration = carbonBase * multiplier;
    
    // Biodiversity and resilience change based on simulation mode
    let biodiversityTimeBonus, resilienceTimeBonus, forestSizeBonus;
    
    if (simulationMode === 'planting') {
      // Planting mode: improve over time and scale with forest size
      biodiversityTimeBonus = Math.min(1, years * 0.05); // +0.05 per year, max +1
      resilienceTimeBonus = Math.min(1, years * 0.03); // +0.03 per year, max +1
      forestSizeBonus = calculationMode === 'perArea' ? Math.min(1, Math.log10(totalTrees) * 0.2) : 0;
    } else {
      // Clear-cutting mode: degrade over time and scale with forest size (more trees = more damage)
      biodiversityTimeBonus = Math.max(-1, -years * 0.05); // -0.05 per year, max -1
      resilienceTimeBonus = Math.max(-1, -years * 0.03); // -0.03 per year, max -1
      forestSizeBonus = calculationMode === 'perArea' ? Math.min(1, Math.log10(totalTrees) * 0.2) : 0; // More trees = more damage
    }
    
    const biodiversityImpact = Math.min(5, Math.max(0, biodiversityBase + biodiversityTimeBonus + forestSizeBonus));
    const forestResilience = Math.min(5, Math.max(0, resilienceBase + resilienceTimeBonus + forestSizeBonus));

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
      waterTimeBonus = years * 0.3; // Improves by ~0.3% per year
      waterSizeBonus = calculationMode === 'perArea' ? Math.min(10, Math.log10(totalTrees) * 2) : 0; // More trees = better water retention
    } else {
      // Clear-cutting mode: degrade over time and scale with forest size (more trees = more damage)
      waterTimeBonus = -years * 0.5; // Degrades by ~0.5% per year
      waterSizeBonus = calculationMode === 'perArea' ? Math.min(15, Math.log10(totalTrees) * 3) : 0; // More trees = more damage
    }
    
    const waterRetention = Math.min(95, Math.max(0, waterBase + waterTimeBonus + waterSizeBonus));

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
      const airTimeBonus = years * 0.7; // Improves by ~0.7% per year
      const airSizeBonus = calculationMode === 'perArea' ? Math.min(15, Math.log10(totalTrees) * 3) : 0; // More trees = better air quality
      airQualityImprovement = Math.min(95, Math.max(0, airQualityBase + airTimeBonus + airSizeBonus));
    } else {
      // Clear-cutting mode: immediately negative impact, gets worse over time
      const immediateImpact = calculationMode === 'perArea' ? Math.min(30, Math.log10(totalTrees) * 5) : 10; // Immediate negative impact based on forest size
      const timeDegradation = years * 1.0; // Gets worse by ~1.0% per year
      airQualityImprovement = Math.max(-80, -(immediateImpact + timeDegradation)); // Start negative, can go down to -80%
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
      
      let growthFactor = 0;
      if (year === 1) growthFactor = 0.05;
      else if (year === 2) growthFactor = 0.15;
      else if (year === 3) growthFactor = 0.30;
      else if (year === 4) growthFactor = 0.50;
      else if (year === 5) growthFactor = 0.70;
      else if (year === 6) growthFactor = 0.85;
      else growthFactor = 0.95;
      
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
      let growthFactor = 0;
      if (year === 1) growthFactor = 0.10;
      else if (year === 2) growthFactor = 0.25;
      else if (year === 3) growthFactor = 0.45;
      else if (year === 4) growthFactor = 0.65;
      else if (year === 5) growthFactor = 0.80;
      else if (year === 6) growthFactor = 0.90;
      else growthFactor = 0.95;
      
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
    
    // Car emissions comparison (average car emits ~4.6 metric tons CO2/year)
    const carEmissions = 4600; // kg CO2/year
    const carYears = totalCarbon / carEmissions;
    if (carYears >= 0.1) {
      comparisons.push(`${carYears.toFixed(1)} year${carYears !== 1 ? 's' : ''} of average car emissions`);
    }
    
    // Flight comparison (one round-trip flight NY-London emits ~986 kg CO2)
    const flightEmissions = 986; // kg CO2 per round trip
    const flights = totalCarbon / flightEmissions;
    if (flights >= 0.1) {
      comparisons.push(`${flights.toFixed(1)} round-trip flight${flights !== 1 ? 's' : ''} (NY-London)`);
    }
    
    // Household electricity comparison (average US household emits ~7.5 metric tons CO2/year)
    const householdEmissions = 7500; // kg CO2/year
    const householdYears = totalCarbon / householdEmissions;
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
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-md">


      <div className="mb-4">
        <h4 className="font-semibold mb-2">Impact Analysis</h4>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-3 overflow-x-auto" role="tablist" aria-label="Impact analysis categories">
          <button
            onClick={() => setActiveEnvTab('environment')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeEnvTab === 'environment'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            role="tab"
            aria-selected={activeEnvTab === 'environment'}
            aria-controls="environment-panel"
          >
            Environment
          </button>
          <button
            onClick={() => setActiveEnvTab('economic')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeEnvTab === 'economic'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            role="tab"
            aria-selected={activeEnvTab === 'economic'}
            aria-controls="economic-panel"
          >
            Economic
          </button>
          <button
            onClick={() => setActiveEnvTab('social')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeEnvTab === 'social'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            role="tab"
            aria-selected={activeEnvTab === 'social'}
            aria-controls="social-panel"
          >
            Social
          </button>
          <button
            onClick={() => setActiveEnvTab('landuse')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeEnvTab === 'landuse'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            <div className="space-y-3" role="tabpanel" id="environment-panel" aria-labelledby="environment-tab">

              {/* Environmental Impact Analysis */}
              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CollapsibleSection
                    title={simulationMode === 'planting' ? "Annual Carbon Sequestration" : "Immediate Carbon Release"}
                    value={calculationMode === 'perTree' 
                      ? simulationMode === 'planting'
                        ? `+${calculateAnnualCarbonWithGrowth(impact.carbonSequestration, years).toFixed(1)} kg CO₂/yr`
                        : `${calculateClearCuttingCarbon(impact.carbonSequestration, averageTreeAge, years).immediate.toFixed(1)} kg CO₂`
                      : simulationMode === 'planting'
                        ? `+${(calculateAnnualCarbonWithGrowth(impact.carbonSequestration, years) / 1000).toFixed(1)} metric ton CO₂/yr`
                        : `${formatTotalCarbon(calculateClearCuttingCarbon(impact.carbonSequestration, averageTreeAge, years).immediate * totalTrees)} metric tons CO₂`
                    }
                    description={calculationMode === 'perTree' 
                      ? simulationMode === 'planting' 
                        ? "Current year's carbon sequestration per tree based on growth stage. Trees start with low sequestration and increase as they mature over 20+ years."
                        : `Carbon released immediately when cutting a ${averageTreeAge}-year-old tree. This represents the tree's current annual carbon sequestration rate.`
                      : simulationMode === 'planting'
                        ? `Current year's carbon sequestration for all ${totalTrees.toLocaleString()} trees in the selected area, based on tree growth stage. This is the yearly rate, not cumulative.`
                        : `Carbon released immediately when cutting all ${totalTrees.toLocaleString()} trees at age ${averageTreeAge} years. This represents the current annual sequestration rate.`
                    }
                    isExpanded={expandedSections['annual-carbon'] || false}
                    onToggle={() => toggleSection('annual-carbon')}
                  />
                  
                  <CollapsibleSection
                    title={simulationMode === 'planting' ? "Total Carbon" : "Total Carbon Emissions"}
                    value={simulationMode === 'planting' 
                      ? `+${formatTotalCarbon(totalCarbon)} ${getTotalCarbonUnit().replace('metric tons', 't').replace('kg CO₂', 'kg CO₂')}`
                      : calculationMode === 'perTree'
                        ? `${formatTotalCarbon(calculateClearCuttingCarbon(impact.carbonSequestration, averageTreeAge, years).total)} kg CO₂`
                        : `${formatTotalCarbon(calculateClearCuttingCarbon(impact.carbonSequestration, averageTreeAge, years).total)} metric tons CO₂`
                    }
                    description={calculationMode === 'perTree' 
                      ? simulationMode === 'planting'
                        ? (climate?.temperature !== null && climate?.temperature !== undefined && 
                           climate?.precipitation !== null && climate?.precipitation !== undefined 
                           ? "Total carbon sequestered per tree over the entire simulation period, accounting for tree growth and climate predictions"
                           : "Total carbon sequestered per tree over the entire simulation period, accounting for tree growth (climate predictions excluded due to unavailable data)")
                        : `Total carbon emissions per tree: immediate release (${calculateClearCuttingCarbon(impact.carbonSequestration, averageTreeAge, years).immediate.toFixed(1)} kg) + lost future sequestration (${calculateClearCuttingCarbon(impact.carbonSequestration, averageTreeAge, years).lostFuture.toFixed(1)} kg) over ${years} years`
                      : simulationMode === 'planting'
                        ? `Total carbon sequestered by all ${totalTrees.toLocaleString()} trees over the entire simulation period, accounting for tree growth and climate predictions`
                        : `Total carbon emissions for all ${totalTrees.toLocaleString()} trees: immediate release + lost future sequestration over ${years} years when cut at age ${averageTreeAge}`
                    }
                    isExpanded={expandedSections['total-carbon'] || false}
                    onToggle={() => toggleSection('total-carbon')}
                  />
                  
                  <CollapsibleSection
                    title="Biodiversity Impact"
                    value={`${averageBiodiversity.toFixed(1)}/5`}
                    description="Measures ecosystem diversity and habitat quality. Higher values indicate better biodiversity support and wildlife habitat creation."
                    isExpanded={expandedSections['biodiversity'] || false}
                    onToggle={() => toggleSection('biodiversity')}
                  />
                  
                  <CollapsibleSection
                    title="Forest Resilience"
                    value={`${averageResilience.toFixed(1)}/5`}
                    description="Forest's ability to withstand climate change, pests, and disturbances. Higher values indicate more resilient ecosystems."
                    isExpanded={expandedSections['resilience'] || false}
                    onToggle={() => toggleSection('resilience')}
                  />
                  
                  <CollapsibleSection
                    title="Water Retention"
                    value={`${impact.waterRetention.toFixed(0)}%`}
                    description="Percentage of rainfall retained in soil and groundwater. Improves over time as tree roots develop and soil structure improves."
                    isExpanded={expandedSections['water-retention'] || false}
                    onToggle={() => toggleSection('water-retention')}
                  />
                  
                  <CollapsibleSection
                    title={simulationMode === 'planting' ? "Air Quality Improvement" : "Air Quality Impact"}
                    value={`${impact.airQualityImprovement.toFixed(0)}%`}
                    description={simulationMode === 'planting' 
                      ? "Reduction in air pollution through particle filtration and oxygen production. Improves as trees mature and canopy develops."
                      : "Degradation in air quality due to loss of trees. Negative values indicate air quality deterioration from removing forest cover."
                    }
                    isExpanded={expandedSections['air-quality'] || false}
                    onToggle={() => toggleSection('air-quality')}
                  />
                </div>
              </div>

            </div>
          )}


          {activeEnvTab === 'social' && (
            <div className="space-y-3" role="tabpanel" id="social-panel" aria-labelledby="social-tab">
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <h5 className="font-semibold text-green-800 mb-2 flex items-center">
                  {simulationMode === 'planting' ? 'Community Benefits' : 'Social Impact Assessment'}
                </h5>
                <div className="space-y-2 text-xs text-primary">
                  <div className="flex justify-between">
                    <span>Social Impact Score:</span>
                    <span className="font-medium">
                      {socialImpact.toFixed(1)}/5
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{simulationMode === 'planting' ? 'Tree Diversity Bonus:' : 'Forest Diversity Factor:'}</span>
                    <span className="font-medium">
                      {selectedTrees && selectedTrees.length > 1 ? `+${Math.min(selectedTrees.length * 0.2, 1).toFixed(1)}` : '+0.0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{simulationMode === 'planting' ? 'Time Investment Bonus:' : 'Duration Impact:'}</span>
                    <span className="font-medium">
                      +{Math.min(years * 0.02, 1).toFixed(1)}
                    </span>
                  </div>
                  {selectedRegion && (
                    <div className="flex justify-between">
                      <span>{simulationMode === 'planting' ? 'Area Scale Bonus:' : 'Area Impact Factor:'}</span>
                      <span className="font-medium">
                        +{Math.min(calculateRegionArea(selectedRegion) * 0.1, 1).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <h5 className="font-semibold text-green-800 mb-2 flex items-center">
                  {simulationMode === 'planting' ? 'Social Benefits' : 'Social Considerations'}
                </h5>
                <ul className="text-xs text-primary space-y-1">
                  {simulationMode === 'planting' ? (
                    <>
                  <li>• Recreational opportunities and outdoor activities</li>
                  <li>• Educational value for environmental learning</li>
                  <li>• Community engagement and volunteer opportunities</li>
                  <li>• Mental health benefits from green spaces</li>
                  <li>• Cultural and spiritual significance</li>
                  <li>• Social cohesion and community building</li>
                    </>
                  ) : (
                    <>
                      <li>• Community concerns about forest loss</li>
                      <li>• Impact on recreational and aesthetic value</li>
                      <li>• Cultural and spiritual significance of forests</li>
                      <li>• Public health implications of deforestation</li>
                      <li>• Educational opportunities about forest conservation</li>
                      <li>• Long-term community environmental awareness</li>
                    </>
                  )}
                </ul>
              </div>
              
              <div className="text-xs text-gray-500 italic">
                {simulationMode === 'planting' 
                  ? 'Social impact increases with tree diversity, time investment, and project scale'
                  : 'Social impact assessment considers community concerns, cultural values, and long-term environmental awareness'
                }
              </div>
            </div>
          )}

          {activeEnvTab === 'economic' && (
            <div className="space-y-3" role="tabpanel" id="economic-panel" aria-labelledby="economic-tab">
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <h5 className="font-semibold text-green-800 mb-2 flex items-center">
                  {simulationMode === 'planting' ? 'Employment Impact' : 'Economic Impact'}
                </h5>
                <div className="space-y-2 text-xs text-primary">
                  <div className="flex justify-between">
                    <span className="font-semibold">
                      {simulationMode === 'planting' ? 'Jobs Created:' : 'Jobs Affected:'}
                    </span>
                    <span className="font-medium">
                      {economicImpact.jobCreation} jobs
                    </span>
                  </div>
                  <div className="text-xs text-primary mt-2">
                    {simulationMode === 'planting' 
                      ? 'Based on typical forest project staffing needs for planting, maintenance, and monitoring.'
                      : 'Based on typical forest management operations including logging, transportation, and processing activities.'
                    }
                  </div>
                </div>
              </div>
              
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <h5 className="font-semibold text-green-800 mb-2 flex items-center">
                  {simulationMode === 'planting' ? 'Conservation Benefits' : 'Economic Considerations'}
                </h5>
                <ul className="text-xs text-primary space-y-1">
                  {simulationMode === 'planting' ? (
                    <>
                  <li>• Conservation and restoration employment opportunities</li>
                  <li>• Ecosystem services (clean water, air quality improvement)</li>
                  <li>• Biodiversity protection and habitat creation</li>
                  <li>• Environmental education and research opportunities</li>
                  <li>• Climate resilience and adaptation benefits</li>
                  <li>• Community engagement and stewardship</li>
                    </>
                  ) : (
                    <>
                      <li>• Logging and timber industry employment</li>
                      <li>• Transportation and processing activities</li>
                      <li>• Land development and conversion opportunities</li>
                      <li>• Economic trade-offs with environmental costs</li>
                      <li>• Short-term vs. long-term economic impacts</li>
                      <li>• Alternative land use revenue potential</li>
                    </>
                  )}
                </ul>
              </div>
              

            </div>
          )}

          {activeEnvTab === 'landuse' && (
            <div className="space-y-3" role="tabpanel" id="landuse-panel" aria-labelledby="landuse-tab">
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <h5 className="font-semibold text-green-800 mb-2 flex items-center">
                  {simulationMode === 'planting' ? 'Land Use Improvements' : 'Land Use Impact Assessment'}
                </h5>
                <div className="space-y-2 text-xs text-primary">
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
                <ul className="text-xs text-primary space-y-1">
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
              
              <div className="text-xs text-gray-500 italic">
                {simulationMode === 'planting' 
                  ? 'Land use improvements increase over time as the forest develops and matures'
                  : 'Land use impacts represent the environmental costs of forest removal and land conversion'
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedTrees && selectedTrees.length > 0 && (
        <div className="mb-4 flex flex-col bg-white rounded shadow p-4 max-w-3xl w-full">
          <span className="text-xs font-bold text-gray-700 mb-2">
            Selected Trees: {selectedTrees.length} species
            {calculationMode === 'perArea' && selectedRegion && (
              <span className="text-primary ml-2">• {totalTrees.toLocaleString()} total trees in area</span>
            )}
          </span>
          <ul className="space-y-2 text-xs text-gray-700">
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
          <p className="text-xs text-gray-600 mt-3">
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
        <div className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
          <h4 className="font-semibold text-primary mb-2">Real-world Impact Comparison</h4>
          <p className="text-xs text-primary mb-2 font-bold">
            This forest would sequester the equivalent of:
          </p>
          <ul className="text-xs text-primary space-y-1">
            {comparisons.map((comparison, index) => {
              // Make numbers bold, including both the first number and "X years"
              const formattedText = comparison.replace(/(\d+\.?\d*)/g, '<strong>$1</strong>');
              return (
                <li key={index} className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span dangerouslySetInnerHTML={{ __html: formattedText }} />
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