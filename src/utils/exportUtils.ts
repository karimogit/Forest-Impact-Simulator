/**
 * Export utilities for Forest Impact Simulator
 */

import { TreeType } from '@/types/treeTypes';

export interface ExportData {
  metadata: {
    timestamp: string;
    simulatorVersion: string;
    location: {
      latitude: number | null;
      longitude: number | null;
      region?: {
        north: number;
        south: number;
        east: number;
        west: number;
      } | null;
    };
    simulation: {
      years: number;
      selectedTrees: TreeType[];
      treePercentages: { [key: string]: number };
    };
  };
  environmentalData: {
    soil?: {
      carbon?: number | null;
      ph?: number | null;
      texture?: string;
    } | null;
    climate?: {
      temperature?: number | null;
      precipitation?: number | null;
      historicalData?: {
        temperatures: number[];
        precipitations: number[];
        years: number[];
      };
    } | null;
  };
  impactResults: {
    carbonSequestration: number;
    biodiversityImpact: number;
    forestResilience: number;
    waterRetention: number;
    airQualityImprovement: number;
    totalCarbon: number;
    averageBiodiversity: number;
    averageResilience: number;
  };
  plantingData?: {
    area: number;
    totalTrees: number;
    spacing: number;
    density: number;
    timeline?: {
      yearsToComplete: number;
      treesPerSeason: number;
    };
  } | null;
}

export const generateGeoJSON = (data: ExportData): string => {
  const features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: number[] | number[][][];
    };
    properties: Record<string, string | number | null>;
  }> = [];
  
  // Add point feature for the selected location (0° lat/lon are valid)
  if (
    data.metadata.location.latitude != null &&
    data.metadata.location.longitude != null &&
    Number.isFinite(data.metadata.location.latitude) &&
    Number.isFinite(data.metadata.location.longitude)
  ) {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [data.metadata.location.longitude, data.metadata.location.latitude]
      },
      properties: {
        name: "Forest Impact Analysis Point",
        carbonSequestration: data.impactResults.carbonSequestration,
        totalCarbon: data.impactResults.totalCarbon,
        biodiversityImpact: data.impactResults.biodiversityImpact,
        forestResilience: data.impactResults.forestResilience,
        waterRetention: data.impactResults.waterRetention,
        airQualityImprovement: data.impactResults.airQualityImprovement,
        simulationYears: data.metadata.simulation.years,
        selectedTreeCount: data.metadata.simulation.selectedTrees.length,
        treeSpecies: data.metadata.simulation.selectedTrees.map(t => t.name).join(", "),
        soilCarbon: data.environmentalData.soil?.carbon || null,
        temperature: data.environmentalData.climate?.temperature || null,
        precipitation: data.environmentalData.climate?.precipitation || null
      }
    });
  }
  
  // Add polygon feature for the selected region
  if (data.metadata.location.region) {
    const { north, south, east, west } = data.metadata.location.region;
    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south]
        ]]
      },
      properties: {
        name: "Forest Planting Region",
        area: data.plantingData?.area || null,
        totalTrees: data.plantingData?.totalTrees || null,
        spacing: data.plantingData?.spacing || null,
        density: data.plantingData?.density || null,
        yearsToComplete: data.plantingData?.timeline?.yearsToComplete || null,
        treesPerSeason: data.plantingData?.timeline?.treesPerSeason || null
      }
    });
  }
  
  const geojson = {
    type: "FeatureCollection",
    features: features,
    properties: {
      title: "Forest Impact Simulator Export",
      description: `Forest impact analysis for ${data.metadata.simulation.years} years`,
      timestamp: data.metadata.timestamp,
      simulatorVersion: data.metadata.simulatorVersion
    }
  };
  
  return JSON.stringify(geojson, null, 2);
};

export const generateJSON = (data: ExportData): string => {
  return JSON.stringify(data, null, 2);
};

export const generateCSV = (data: ExportData): string => {
  // Create a single row with all data for R/Python compatibility
  const row: string[] = [];
  
  // Metadata
  row.push(data.metadata.timestamp);
  row.push(data.metadata.simulatorVersion);
  row.push(data.metadata.simulation.years.toString());
  
  // Location data
  row.push(data.metadata.location.latitude?.toString() || "");
  row.push(data.metadata.location.longitude?.toString() || "");
  row.push(data.metadata.location.region?.north?.toString() || "");
  row.push(data.metadata.location.region?.south?.toString() || "");
  row.push(data.metadata.location.region?.east?.toString() || "");
  row.push(data.metadata.location.region?.west?.toString() || "");
  
  // Environmental data
  row.push(data.environmentalData.soil?.carbon?.toString() || "");
  row.push(data.environmentalData.soil?.ph?.toString() || "");
  row.push(data.environmentalData.soil?.texture || "");
  row.push(data.environmentalData.climate?.temperature?.toString() || "");
  row.push(data.environmentalData.climate?.precipitation?.toString() || "");
  
  // Impact results
  row.push(data.impactResults.carbonSequestration.toFixed(1));
  row.push(data.impactResults.totalCarbon.toFixed(1));
  row.push(data.impactResults.biodiversityImpact.toFixed(1));
  row.push(data.impactResults.forestResilience.toFixed(1));
  row.push(data.impactResults.waterRetention.toFixed(0));
  row.push(data.impactResults.airQualityImprovement.toFixed(0));
  row.push(data.impactResults.averageBiodiversity.toFixed(1));
  row.push(data.impactResults.averageResilience.toFixed(1));
  
  // Planting data (if available)
  row.push(data.plantingData?.area?.toFixed(2) || "");
  row.push(data.plantingData?.totalTrees?.toString() || "");
  row.push(data.plantingData?.spacing?.toString() || "");
  row.push(data.plantingData?.density?.toFixed(0) || "");
  row.push(data.plantingData?.timeline?.yearsToComplete?.toString() || "");
  row.push(data.plantingData?.timeline?.treesPerSeason?.toString() || "");
  
  // Tree data (concatenated for multiple trees)
  const treeNames = data.metadata.simulation.selectedTrees.map(t => t.name).join(";");
  const treeScientificNames = data.metadata.simulation.selectedTrees.map(t => t.scientificName).join(";");
  const treeCarbonRates = data.metadata.simulation.selectedTrees.map(t => t.carbonSequestration.toString()).join(";");
  const treePercentages = data.metadata.simulation.selectedTrees.map(t => 
    (data.metadata.simulation.treePercentages[t.id] || 0).toString()
  ).join(";");
  
  row.push(treeNames);
  row.push(treeScientificNames);
  row.push(treeCarbonRates);
  row.push(treePercentages);
  
  // Create header row
  const headers = [
    "timestamp", "simulator_version", "simulation_years",
    "latitude", "longitude", "region_north", "region_south", "region_east", "region_west",
    "soil_carbon_g_kg", "soil_ph", "soil_texture", "temperature_c", "precipitation_mm",
    "annual_carbon_sequestration_kg_co2_year", "total_carbon_kg_co2", "biodiversity_impact", 
    "forest_resilience", "water_retention_percent", "air_quality_improvement_percent",
    "average_biodiversity", "average_resilience",
    "area_hectares", "total_trees", "spacing_meters", "density_trees_hectare",
    "years_to_complete", "trees_per_season",
    "tree_names", "tree_scientific_names", "tree_carbon_rates_kg_co2_year", "tree_percentages"
  ];
  
  // Escape values that contain commas or quotes
  const escapeValue = (value: string): string => {
    if (value.includes(',') || value.includes(';') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  
  const escapedRow = row.map(escapeValue);
  
  return [headers.join(','), escapedRow.join(',')].join('\n');
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const formatTimestamp = (): string => {
  return new Date().toISOString().replace(/[:.]/g, '-');
}; 