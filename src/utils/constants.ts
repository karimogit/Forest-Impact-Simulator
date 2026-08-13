/**
 * Application-wide constants for calculations and configurations
 */

// Growth factors for tree carbon sequestration (by year)
// Matches the documented planting growth curve in README.md
export const TREE_GROWTH_FACTORS = {
  YEAR_1: 0.05,         // Establishment
  YEAR_2: 0.15,
  YEAR_3: 0.30,
  YEAR_4: 0.50,         // Rapid growth
  YEAR_5: 0.70,
  YEAR_6_TO_10: 0.80,
  YEAR_11_TO_20: 0.90,  // Maturation
  YEAR_20_PLUS: 1.00    // Mature
} as const;

// Tree age-based growth factors for clear-cutting calculations
export const TREE_AGE_GROWTH_FACTORS = {
  AGE_1: 0.05,
  AGE_2: 0.15,
  AGE_3: 0.30,
  AGE_4: 0.50,
  AGE_5: 0.70,
  AGE_6: 0.85,
  AGE_7_TO_20: 0.95,   // Mature trees
  AGE_21_TO_50: 0.90,  // Older mature trees
  AGE_50_PLUS: 0.85    // Very old trees
} as const;

// Biodiversity and resilience growth factors
export const BIODIVERSITY_GROWTH_FACTORS = {
  YEAR_1: 0.10,
  YEAR_2: 0.25,
  YEAR_3: 0.45,
  YEAR_4: 0.65,
  YEAR_5: 0.80,
  YEAR_6: 0.90,
  YEAR_7_PLUS: 0.95
} as const;

// Climate zone thresholds (latitude-based)
export const CLIMATE_THRESHOLDS = {
  TROPICAL_LATITUDE: 23.5,     // Latitude below this is tropical
  TEMPERATE_LATITUDE: 45,      // Between tropical and this is temperate
  BOREAL_LATITUDE: 66.5,       // Above this is boreal/arctic
  SUBTROPICAL_MIN: 23.5,       // Subtropical latitude range
  SUBTROPICAL_MAX: 35
} as const;

// Carbon conversion factors
export const CARBON_CONVERSION = {
  CARBON_TO_CO2: 3.67,          // Convert carbon (C) to CO2
  SOIL_CARBON_MODIFIER: 0.1,    // kg CO2/year per g/kg of soil carbon
  KG_TO_METRIC_TONS: 1000       // Conversion factor
} as const;

// Environmental modifiers
export const ENVIRONMENTAL_MODIFIERS = {
  PRECIPITATION_TO_RESILIENCE: 0.001,  // Precipitation (mm) to resilience modifier
  TEMPERATURE_CHANGE_FACTOR: 0.02,     // Growth modifier per degree Celsius
  PRECIPITATION_CHANGE_FACTOR: 0.0001  // Growth modifier per mm precipitation
} as const;

// Water retention factors
export const WATER_RETENTION = {
  BASE_RATE: 70,                    // Base water retention percentage
  TROPICAL_BONUS: 15,               // Bonus for tropical regions (high precip)
  TEMPERATE_BONUS: 5,               // Bonus for temperate regions
  BOREAL_BASE: 70,                  // Base for boreal regions
  ANNUAL_IMPROVEMENT: 0.3,          // Percentage improvement per year
  ANNUAL_DEGRADATION: 0.5,          // Degradation per year (clear-cutting)
  HIGH_PRECIPITATION_THRESHOLD: 1500,  // mm/year
  MEDIUM_PRECIPITATION_THRESHOLD: 1000,
  LOW_PRECIPITATION_THRESHOLD: 500,
  MAX_RETENTION: 95                 // Maximum retention cap
} as const;

// Air quality factors
export const AIR_QUALITY = {
  BASE_QUALITY: 60,                 // Base air quality improvement
  TROPICAL_BONUS: 10,               // Year-round growth benefit
  TEMPERATE_BASELINE: 0,            // Moderate impact
  BOREAL_PENALTY: -10,              // Shorter growing season
  ANNUAL_IMPROVEMENT: 0.7,          // Improvement per year (planting)
  ANNUAL_DEGRADATION: 1.0,          // Degradation per year (clear-cutting)
  MAX_IMPROVEMENT: 95,              // Maximum improvement cap
  MAX_DEGRADATION: -80,             // Maximum degradation
  TEMPERATURE_HIGH_THRESHOLD: 20,   // °C
  TEMPERATURE_LOW_THRESHOLD: 10,    // °C
  TEMP_BONUS_HIGH: 5,
  TEMP_PENALTY_LOW: -5,
  PRECIP_BONUS_HIGH: 3,
  PRECIP_PENALTY_LOW: -3
} as const;

// Biodiversity and resilience caps
export const IMPACT_CAPS = {
  MAX_BIODIVERSITY: 5.0,
  MIN_BIODIVERSITY: 0.0,
  MAX_RESILIENCE: 5.0,
  MIN_RESILIENCE: 0.0,
  BIODIVERSITY_TIME_BONUS: 0.05,    // Bonus per year
  RESILIENCE_TIME_BONUS: 0.03       // Bonus per year
} as const;

// Social impact factors
export const SOCIAL_IMPACT = {
  PLANTING_BASE_SCORE: 3.5,         // Base social benefit score (1-5)
  CLEAR_CUTTING_BASE_SCORE: 2.0,    // Lower base for negative impacts
  TREE_DIVERSITY_MULTIPLIER: 0.2,   // Bonus per tree species (planting)
  TREE_DIVERSITY_PENALTY: 0.1,      // Penalty per tree species (clear-cutting)
  TIME_MULTIPLIER_PLANTING: 0.02,   // Planting time bonus
  TIME_MULTIPLIER_CLEARING: 0.01,   // Clear-cutting time penalty
  AREA_MULTIPLIER_PLANTING: 0.1,    // Area scale bonus (planting)
  AREA_MULTIPLIER_CLEARING: 0.05,   // Area scale penalty (clear-cutting)
  MAX_DIVERSITY_BONUS: 1.0,
  MAX_TIME_BONUS: 1.0,
  MAX_AREA_BONUS: 1.0,
  MAX_SCORE: 5.0,
  MIN_SCORE: 1.0
} as const;

// Land use impact factors
export const LAND_USE_IMPACT = {
  EROSION_AREA_FACTOR: 0.5,         // Planting: reduction per hectare
  EROSION_AREA_FACTOR_CLEARING: 0.8, // Clear-cutting: increase per hectare
  SOIL_TIME_FACTOR: 1.5,            // Improvement per year (planting)
  SOIL_TIME_FACTOR_CLEARING: 2.0,   // Degradation per year (clear-cutting)
  HABITAT_AREA_FACTOR: 2.0,         // Planting: creation per hectare
  HABITAT_AREA_FACTOR_CLEARING: 3.0, // Clear-cutting: loss per hectare
  WATER_TIME_FACTOR: 1.2,           // Water quality improvement per year
  WATER_TIME_FACTOR_CLEARING: 1.8,  // Water quality decline per year
  MAX_PERCENTAGE: 95,
  MAX_DEGRADATION: 80
} as const;

// API and performance constants
export const API_CONFIG = {
  RATE_LIMIT_REQUESTS: 30,          // Max requests per window
  RATE_LIMIT_WINDOW_MS: 60000,      // Time window in milliseconds
  DEFAULT_TIMEOUT_MS: 15000,        // Default API timeout
  EXTENDED_TIMEOUT_MS: 20000,       // Extended timeout for slow APIs
  CACHE_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes cache
  RETRY_ATTEMPTS: 2,                // Number of retry attempts
  RETRY_DELAY_MS: 2000              // Delay between retries
} as const;

// Real-world comparison constants
export const COMPARISON_FACTORS = {
  CAR_EMISSIONS_PER_YEAR: 4600,     // kg CO2 per year
  FLIGHT_NY_LONDON: 986,            // kg CO2 round trip
  HOUSEHOLD_ELECTRICITY_PER_YEAR: 7500  // kg CO2 per year
} as const;

// Default climate values (fallbacks when API data unavailable)
export const DEFAULT_CLIMATE = {
  TROPICAL_TEMP: 25,                // °C
  TEMPERATE_TEMP: 15,
  BOREAL_TEMP: 5,
  ARCTIC_TEMP: -5,
  DEFAULT_PRECIPITATION: 1000       // mm/year
} as const;

// Historical data configuration
export const HISTORICAL_DATA_CONFIG = {
  YEARS_OF_DATA: 5,                 // Years of historical data to fetch
  DAYS_PER_YEAR: 365,
  MIN_DAYS_FOR_VALID_YEAR: 300      // Minimum days of data for a valid year
} as const;
