"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useMap } from 'react-leaflet';
import type * as L from 'leaflet';
import LocationSearch from './LocationSearch';
import { calculateRegionArea, formatArea } from '@/utils/treePlanting';
import { getLocationHistory, addToLocationHistory, removeFromLocationHistory, formatLocationName, getRelativeTime, type LocationHistoryItem } from '@/utils/locationHistory';
import { logger } from '@/utils/logger';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Rectangle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Rectangle),
  { ssr: false }
);

// Types for OSM data
interface OSMElement {
  type: 'way' | 'relation' | 'node';
  id: number;
  bounds?: {
    minlat: number;
    minlon: number;
    maxlat: number;
    maxlon: number;
  };
  geometry?: Array<{ lat: number; lon: number }>;
  members?: Array<{
    type: string;
    ref: number;
    role: string;
    geometry?: Array<{ lat: number; lon: number }>;
  }>;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OSMElement[];
}

// Create a client-only wrapper component
const ClientOnlyMap = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    // Import Leaflet CSS only on client side
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('leaflet/dist/leaflet.css');
    }
  }, []);
  
  if (!isClient) {
    return <div className="h-96 bg-gray-100 flex items-center justify-center">Loading map...</div>;
  }
  
  return <>{children}</>;
};

// Scale control component
const ScaleControl = () => {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');
    
    // Add scale control
    const scaleControl = L.control.scale({
      position: 'bottomleft',
      metric: true,
      imperial: true,
      maxWidth: 150
    });
    
    scaleControl.addTo(map);
    
    return () => {
      scaleControl.remove();
    };
  }, [map]);
  
  return null;
};

// Fetch forests and protected areas from OpenStreetMap via Overpass API
const fetchOSMData = async (bounds: L.LatLngBounds): Promise<{ forests: OSMElement[]; protectedAreas: OSMElement[] }> => {
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const north = bounds.getNorth();
  const east = bounds.getEast();
  
  // Limit query to reasonable area (prevent huge queries)
  const latDiff = north - south;
  const lngDiff = east - west;
  if (latDiff > 1 || lngDiff > 1) {
    logger.log('Area too large for OSM query, skipping');
    return { forests: [], protectedAreas: [] };
  }
  
  const bbox = `${south},${west},${north},${east}`;
  
  // Query for forests and protected areas
  const query = `
    [out:json][timeout:15];
    (
      way["natural"="wood"](${bbox});
      way["landuse"="forest"](${bbox});
      relation["natural"="wood"](${bbox});
      relation["landuse"="forest"](${bbox});
      relation["leisure"="nature_reserve"](${bbox});
      relation["boundary"="protected_area"](${bbox});
      way["leisure"="nature_reserve"](${bbox});
      way["boundary"="protected_area"](${bbox});
    );
    out geom;
  `;
  
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'text/plain',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }
    
    const data: OverpassResponse = await response.json();
    
    // Separate forests from protected areas
    const forests: OSMElement[] = [];
    const protectedAreas: OSMElement[] = [];
    
    for (const element of data.elements) {
      const tags = element.tags || {};
      if (tags.natural === 'wood' || tags.landuse === 'forest') {
        forests.push(element);
      }
      if (tags.leisure === 'nature_reserve' || tags.boundary === 'protected_area') {
        protectedAreas.push(element);
      }
    }
    
    logger.log(`Found ${forests.length} forests, ${protectedAreas.length} protected areas`);
    return { forests, protectedAreas };
  } catch (error) {
    logger.error('Error fetching OSM data:', error);
    return { forests: [], protectedAreas: [] };
  }
};

// Component to display OSM forest and protected area overlays
const OSMOverlays = ({ showForests, showProtectedAreas }: { showForests: boolean; showProtectedAreas: boolean }) => {
  const map = useMap();
  const forestLayerRef = useRef<L.LayerGroup | null>(null);
  const protectedLayerRef = useRef<L.LayerGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastBoundsRef = useRef<string>('');
  const paneCreatedRef = useRef(false);
  
  // Create custom pane for overlays with higher z-index
  useEffect(() => {
    if (!map) return;
    
    // Create or get custom panes for forest/protected area overlays above tiles
    // Always ensure z-index is set correctly, even if pane already exists
    let forestPane = map.getPane('forestOverlayPane');
    if (!forestPane) {
      forestPane = map.createPane('forestOverlayPane');
      logger.log('[OSM Overlays] Created forestOverlayPane');
    }
    // Ensure proper CSS for the pane - z-index above tiles (200) but below markers (600)
    forestPane.style.zIndex = '450';
    forestPane.style.pointerEvents = 'auto';
    
    let protectedPane = map.getPane('protectedOverlayPane');
    if (!protectedPane) {
      protectedPane = map.createPane('protectedOverlayPane');
      logger.log('[OSM Overlays] Created protectedOverlayPane');
    }
    // Slightly above forest pane
    protectedPane.style.zIndex = '455';
    protectedPane.style.pointerEvents = 'auto';
    
    paneCreatedRef.current = true;
  }, [map]);
  
  // Reset bounds cache when toggles change to force reload
  useEffect(() => {
    lastBoundsRef.current = '';
  }, [showForests, showProtectedAreas]);
  
  const loadOSMData = useCallback(async () => {
    if (!map || (!showForests && !showProtectedAreas)) return;
    
    // Ensure panes are created before loading data
    if (!paneCreatedRef.current) {
      logger.log('[OSM Overlays] Panes not ready, skipping load');
      return;
    }
    
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    
    // Only load data when zoomed in enough (zoom >= 10)
    if (zoom < 10) {
      logger.log('[OSM Overlays] Zoom level too low, need >= 10 (current:', zoom, ')');
      return;
    }
    
    // Check if bounds have changed significantly
    const boundsKey = `${bounds.getSouth().toFixed(3)},${bounds.getWest().toFixed(3)},${bounds.getNorth().toFixed(3)},${bounds.getEast().toFixed(3)},forests:${showForests},protected:${showProtectedAreas}`;
    if (boundsKey === lastBoundsRef.current) {
      return;
    }
    lastBoundsRef.current = boundsKey;
    
    logger.log('[OSM Overlays] Loading data for bounds:', boundsKey);
    setIsLoading(true);
    
    try {
      const { forests, protectedAreas } = await fetchOSMData(bounds);
      
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const L = require('leaflet');
      
      // Clear existing layers
      if (forestLayerRef.current) {
        map.removeLayer(forestLayerRef.current);
        forestLayerRef.current = null;
      }
      if (protectedLayerRef.current) {
        map.removeLayer(protectedLayerRef.current);
        protectedLayerRef.current = null;
      }
      
      // Verify panes exist before adding layers, create them if missing
      let forestPane = map.getPane('forestOverlayPane');
      let protectedPane = map.getPane('protectedOverlayPane');
      
      if (!forestPane) {
        logger.warn('[OSM Overlays] forestOverlayPane not found, creating...');
        forestPane = map.createPane('forestOverlayPane');
        forestPane.style.zIndex = '450';
        forestPane.style.pointerEvents = 'auto';
      }
      
      if (!protectedPane) {
        logger.warn('[OSM Overlays] protectedOverlayPane not found, creating...');
        protectedPane = map.createPane('protectedOverlayPane');
        protectedPane.style.zIndex = '455';
        protectedPane.style.pointerEvents = 'auto';
      }
      
      // Helper function to extract geometries from an OSM element (handles both ways and relations)
      const getGeometries = (element: OSMElement): Array<Array<[number, number]>> => {
        const geometries: Array<Array<[number, number]>> = [];
        
        // For ways: geometry is directly on the element
        if (element.geometry && element.geometry.length > 2) {
          geometries.push(element.geometry.map((p) => [p.lat, p.lon]));
        }
        
        // For relations: geometry is in members
        if (element.members) {
          for (const member of element.members) {
            if (member.geometry && member.geometry.length > 2) {
              geometries.push(member.geometry.map((p) => [p.lat, p.lon]));
            }
          }
        }
        
        return geometries;
      };

      // Create forest layer with custom pane for proper z-index
      if (showForests && forests.length > 0) {
        const forestGroup = L.layerGroup();
        
        for (const element of forests) {
          const geometries = getGeometries(element);
          for (const coords of geometries) {
            const polygon = L.polygon(coords, {
              color: '#228B22',
              fillColor: '#228B22',
              fillOpacity: 0.4,
              weight: 2,
              pane: 'forestOverlayPane', // Use custom pane with higher z-index
            });
            polygon.bindPopup(`<strong>🌲 Forest</strong><br/>OSM ID: ${element.id}`);
            forestGroup.addLayer(polygon);
          }
        }
        
        forestGroup.addTo(map);
        forestLayerRef.current = forestGroup;
        logger.log('[OSM Overlays] Added', forests.length, 'forest polygons to map');
      }
      
      // Create protected areas layer with custom pane for proper z-index
      if (showProtectedAreas && protectedAreas.length > 0) {
        const protectedGroup = L.layerGroup();
        
        for (const element of protectedAreas) {
          const geometries = getGeometries(element);
          const name = element.tags?.name || 'Protected Area';
          for (const coords of geometries) {
            const polygon = L.polygon(coords, {
              color: '#4169E1',
              fillColor: '#4169E1',
              fillOpacity: 0.35,
              weight: 3,
              dashArray: '5, 5',
              pane: 'protectedOverlayPane', // Use custom pane with higher z-index
            });
            polygon.bindPopup(`<strong>🛡️ ${name}</strong><br/>Type: ${element.tags?.boundary || element.tags?.leisure || 'Nature Reserve'}<br/>OSM ID: ${element.id}`);
            protectedGroup.addLayer(polygon);
          }
        }
        
        protectedGroup.addTo(map);
        protectedLayerRef.current = protectedGroup;
        logger.log('[OSM Overlays] Added', protectedAreas.length, 'protected area polygons to map');
      }
    } catch (error) {
      logger.error('Error loading OSM overlays:', error);
    } finally {
      setIsLoading(false);
    }
  }, [map, showForests, showProtectedAreas]);
  
  // Load data when map moves or settings change
  useEffect(() => {
    if (!map) return;
    
    loadOSMData();
    
    const handleMoveEnd = () => {
      loadOSMData();
    };
    
    map.on('moveend', handleMoveEnd);
    
    return () => {
      map.off('moveend', handleMoveEnd);
      if (forestLayerRef.current) {
        map.removeLayer(forestLayerRef.current);
      }
      if (protectedLayerRef.current) {
        map.removeLayer(protectedLayerRef.current);
      }
    };
  }, [map, loadOSMData]);
  
  // Clean up layers when toggles are turned off
  useEffect(() => {
    if (!map) return;
    
    if (!showForests && forestLayerRef.current) {
      map.removeLayer(forestLayerRef.current);
      forestLayerRef.current = null;
    }
    if (!showProtectedAreas && protectedLayerRef.current) {
      map.removeLayer(protectedLayerRef.current);
      protectedLayerRef.current = null;
    }
  }, [map, showForests, showProtectedAreas]);
  
  // Show zoom hint when overlays are enabled but zoom is too low
  const [zoomLevel, setZoomLevel] = useState<number>(0);
  
  useEffect(() => {
    if (!map) return;
    
    const updateZoom = () => {
      setZoomLevel(map.getZoom());
    };
    
    updateZoom();
    map.on('zoomend', updateZoom);
    
    return () => {
      map.off('zoomend', updateZoom);
    };
  }, [map]);
  
  const showZoomHint = (showForests || showProtectedAreas) && zoomLevel < 10;
  
  if (isLoading) {
    return (
      <div className="leaflet-top leaflet-left" style={{ top: '60px', left: '10px' }}>
        <div className="bg-white px-2 py-1 rounded shadow-md text-xs text-gray-600 flex items-center gap-1">
          <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
          Loading map data...
        </div>
      </div>
    );
  }
  
  if (showZoomHint) {
    return (
      <div className="leaflet-top leaflet-left" style={{ top: '60px', left: '10px' }}>
        <div className="bg-amber-50 border border-amber-200 px-2 py-1 rounded shadow-md text-xs text-amber-700 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
          Zoom in to see overlays (level 10+, current: {zoomLevel})
        </div>
      </div>
    );
  }
  
  return null;
};

// NASA GIBS Vegetation Layer Component
const VegetationLayer = ({ show }: { show: boolean }) => {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);
  
  useEffect(() => {
    if (!map) return;
    
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');
    
    if (show) {
      // Add NASA GIBS VIIRS NDVI layer
      // Using 8-day NDVI composite from VIIRS on NOAA-20
      const today = new Date();
      // Go back 10 days to ensure data is available
      today.setDate(today.getDate() - 10);
      const dateStr = today.toISOString().split('T')[0];
      
      const vegetationLayer = L.tileLayer(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_NDVI_8Day/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
        {
          attribution: '&copy; NASA GIBS - VIIRS NDVI',
          maxZoom: 9,
          minZoom: 1,
          opacity: 0.6,
          pane: 'overlayPane', // Use overlayPane (z-index 400) - above tiles but below forest/protected overlays
        }
      );
      
      vegetationLayer.addTo(map);
      layerRef.current = vegetationLayer;
    } else {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    }
    
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, show]);
  
  return null;
};

// Locate me control component
const LocateControl = ({ onLocate }: { onLocate?: (lat: number, lng: number) => void }) => {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setLocating(true);
    setError(null);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        map.setView([lat, lng], 13, { animate: true });
        
        if (onLocate) {
          onLocate(lat, lng);
        }
        
        setLocating(false);
      },
      (error) => {
        logger.error('Geolocation error:', error);
        setError('Unable to get your location');
        setTimeout(() => setError(null), 3000);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };
  
  return (
    <>
      <div className="leaflet-top leaflet-right" style={{ top: '10px', right: '10px' }}>
        <div className="leaflet-control leaflet-bar">
          <button
            onClick={handleLocate}
            disabled={locating}
            className="bg-white hover:bg-gray-50 w-[30px] h-[30px] flex items-center justify-center border-none cursor-pointer disabled:cursor-wait disabled:opacity-60"
            title="Locate me"
            style={{
              fontSize: '18px',
              lineHeight: '30px',
              color: '#333',
            }}
          >
            {locating ? '?' : '?'}
          </button>
        </div>
      </div>
      {error && (
        <div className="leaflet-top leaflet-right" style={{ top: '50px', right: '10px' }}>
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-xs max-w-[200px]">
            {error}
          </div>
        </div>
      )}
    </>
  );
};

// Layer switcher control component
interface LayerSwitcherProps {
  showForests: boolean;
  showProtectedAreas: boolean;
  showVegetation: boolean;
  onToggleForests: () => void;
  onToggleProtectedAreas: () => void;
  onToggleVegetation: () => void;
}

const LayerSwitcher = ({ 
  showForests, 
  showProtectedAreas, 
  showVegetation,
  onToggleForests,
  onToggleProtectedAreas,
  onToggleVegetation
}: LayerSwitcherProps) => {
  const map = useMap();
  const [activeLayer, setActiveLayer] = useState<'street' | 'satellite' | 'terrain'>('satellite');
  const [isOpen, setIsOpen] = useState(false);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  useEffect(() => {
    if (!map) return;
    
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');
    
    // Remove existing tile layer if any
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    
    // Add new tile layer based on active layer
    let tileUrl = '';
    let attribution = '';
    
    switch (activeLayer) {
      case 'street':
        tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        break;
      case 'satellite':
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        attribution = '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
        break;
      case 'terrain':
        tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        attribution = '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors';
        break;
    }
    
    const newTileLayer = L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
      pane: 'tilePane', // Explicitly use tilePane (z-index 200) to ensure overlays appear above
    });
    
    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
    
    return () => {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }
    };
  }, [map, activeLayer]);
  
  const handleLayerChange = (layer: 'street' | 'satellite' | 'terrain') => {
    setActiveLayer(layer);
  };
  
  return (
    <div className="leaflet-bottom leaflet-right" style={{ bottom: '30px', right: '10px' }}>
      <div className="leaflet-control leaflet-bar bg-white rounded shadow-md">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 border-none cursor-pointer flex items-center gap-2"
          title="Map layers & overlays"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="hidden sm:inline">Layers</span>
        </button>
        {isOpen && (
          <div className="absolute bottom-full right-0 mb-2 bg-white rounded shadow-lg border border-gray-200 min-w-[180px]">
            {/* Base Layers Section */}
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-600">Base Map</span>
            </div>
            <button
              onClick={() => handleLayerChange('street')}
              className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-none cursor-pointer flex items-center gap-2 ${activeLayer === 'street' ? 'bg-primary/10 font-semibold' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>Street</span>
            </button>
            <button
              onClick={() => handleLayerChange('satellite')}
              className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-none cursor-pointer flex items-center gap-2 ${activeLayer === 'satellite' ? 'bg-primary/10 font-semibold' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Satellite</span>
            </button>
            <button
              onClick={() => handleLayerChange('terrain')}
              className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-none cursor-pointer flex items-center gap-2 ${activeLayer === 'terrain' ? 'bg-primary/10 font-semibold' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l4 4-4 4m6-8v8m4-8l-4 4 4 4M5 17h14" />
              </svg>
              <span>Terrain</span>
            </button>
            
            {/* Overlay Layers Section */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-b border-gray-200 mt-1">
              <span className="text-xs font-semibold text-gray-600">Overlays</span>
            </div>
            <button
              onClick={onToggleForests}
              className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-none cursor-pointer flex items-center gap-2 ${showForests ? 'bg-green-50' : ''}`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${showForests ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                {showForests && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="flex items-center gap-1">
                <span style={{ color: '#228B22' }}>🌲</span> Forests
              </span>
            </button>
            <button
              onClick={onToggleProtectedAreas}
              className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-none cursor-pointer flex items-center gap-2 ${showProtectedAreas ? 'bg-blue-50' : ''}`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${showProtectedAreas ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {showProtectedAreas && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="flex items-center gap-1">
                <span style={{ color: '#4169E1' }}>🛡️</span> Protected Areas
              </span>
            </button>
            <button
              onClick={onToggleVegetation}
              className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-50 border-none cursor-pointer flex items-center gap-2 ${showVegetation ? 'bg-lime-50' : ''}`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${showVegetation ? 'bg-lime-600 border-lime-600' : 'border-gray-300'}`}>
                {showVegetation && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="flex items-center gap-1">
                <span style={{ color: '#84cc16' }}>🌿</span> Vegetation (NASA)
              </span>
            </button>
            
            {/* Legend hint */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
              <p>Zoom in (level 10+) to see forests &amp; reserves</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Map controller component for navigation
const MapController = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    try {
      // Check if map is ready by checking if it has a container
      const container = map.getContainer();
      if (container && container.style) {
        map.setView(center, zoom, { animate: true });
      } else {
        // If map isn't ready, wait a bit and try again
        const timer = setTimeout(() => {
          try {
            const container = map.getContainer();
            if (container && container.style) {
              map.setView(center, zoom, { animate: true });
            }
          } catch (error) {
            logger.warn('Map still not ready for setView:', error);
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      logger.warn('Map not ready for setView:', error);
    }
  }, [map, center, zoom]);
  
  return null;
};

// Map click handler component - Disabled for region-only selection
const MapClickHandler = () => {
  // Point clicking is disabled - only region selection is supported
  return null;
};

interface MapBounds {
  getSouth: () => number;
  getNorth: () => number;
  getWest: () => number;
  getEast: () => number;
}

interface LeafletMouseEvent {
  latlng: {
    lat: number;
    lng: number;
  };
  originalEvent: MouseEvent | TouchEvent;
}

const CustomRegionSelector = ({ onBoundsChange, onSelectingChange }: { onBoundsChange: (bounds: MapBounds) => void; onSelectingChange?: (selecting: boolean) => void }) => {
  const map = useMap();
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [currentBounds, setCurrentBounds] = useState<MapBounds | null>(null);
  const tempRectangleRef = useRef<L.Rectangle | null>(null);
  
  // Add visual feedback for dragging state and notify parent
  useEffect(() => {
    if (isSelecting) {
      document.body.style.cursor = 'crosshair';
      // Prevent text selection on mobile during dragging
      document.body.style.userSelect = 'none';
      (document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = 'none';
      (document.body.style as CSSStyleDeclaration & { mozUserSelect: string }).mozUserSelect = 'none';
      (document.body.style as CSSStyleDeclaration & { msUserSelect: string }).msUserSelect = 'none';
    } else {
      document.body.style.cursor = 'default';
      // Restore text selection
      document.body.style.userSelect = 'auto';
      (document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = 'auto';
      (document.body.style as CSSStyleDeclaration & { mozUserSelect: string }).mozUserSelect = 'auto';
      (document.body.style as CSSStyleDeclaration & { msUserSelect: string }).msUserSelect = 'auto';
    }
    
    // Notify parent component of selecting state
    onSelectingChange?.(isSelecting);
    
    return () => {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      (document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = 'auto';
      (document.body.style as CSSStyleDeclaration & { mozUserSelect: string }).mozUserSelect = 'auto';
      (document.body.style as CSSStyleDeclaration & { msUserSelect: string }).msUserSelect = 'auto';
    };
  }, [isSelecting, onSelectingChange]);

  useEffect(() => {
    if (!map) return;

    const handleMouseStart = (e: LeafletMouseEvent) => {
      // Only activate selection if CTRL key is pressed
      if (!e.originalEvent.ctrlKey) {
        return; // Allow normal map panning
      }
      
      logger.log('CTRL+Mouse start:', e.latlng);
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      setIsSelecting(true);
      setStartPoint([e.latlng.lat, e.latlng.lng]);
      map.dragging.disable();
      e.originalEvent.stopImmediatePropagation();
    };

    const handleTouchStart = (e: LeafletMouseEvent) => {
      // For mobile devices, use click-to-create-square approach
      logger.log('Touch start:', e.latlng);
      
      // Create a small initial selection square (0.01 degrees in each direction)
      const initialSize = 0.01;
      const centerLat = e.latlng.lat;
      const centerLng = e.latlng.lng;
      
      const bounds = {
        getSouth: () => centerLat - initialSize,
        getNorth: () => centerLat + initialSize,
        getWest: () => centerLng - initialSize,
        getEast: () => centerLng + initialSize,
      };
      
      logger.log('Created initial selection square');
      setIsSelecting(true);
      setStartPoint([centerLat, centerLng]);
      setCurrentBounds(bounds);
      map.dragging.disable();
      
      // Create visual rectangle immediately
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const L = require('leaflet');
      const newTempRectangle = L.rectangle([
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()]
      ], {
        color: '#166534',
        fillColor: '#166534',
        fillOpacity: 0.2,
        weight: 2
      });
      newTempRectangle.addTo(map);
      tempRectangleRef.current = newTempRectangle;
    };

    const handleMouseMove = (e: LeafletMouseEvent) => {
      if (!isSelecting || !startPoint) return;
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      
      const bounds = {
        getSouth: () => Math.min(startPoint[0], e.latlng.lat),
        getNorth: () => Math.max(startPoint[0], e.latlng.lat),
        getWest: () => Math.min(startPoint[1], e.latlng.lng),
        getEast: () => Math.max(startPoint[1], e.latlng.lng),
      };
      setCurrentBounds(bounds);
      
      // Update temporary rectangle for visual feedback
      if (tempRectangleRef.current) {
        map.removeLayer(tempRectangleRef.current);
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const L = require('leaflet');
      const newTempRectangle = L.rectangle([
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()]
      ], {
        color: '#166534',
        fillColor: '#166534',
        fillOpacity: 0.2,
        weight: 2
      });
      newTempRectangle.addTo(map);
      tempRectangleRef.current = newTempRectangle;
    };

    const handleTouchMove = (e: LeafletMouseEvent) => {
      if (!isSelecting || !startPoint) return;
      
      // Prevent default touch behavior during selection
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      
      const bounds = {
        getSouth: () => Math.min(startPoint[0], e.latlng.lat),
        getNorth: () => Math.max(startPoint[0], e.latlng.lat),
        getWest: () => Math.min(startPoint[1], e.latlng.lng),
        getEast: () => Math.max(startPoint[1], e.latlng.lng),
      };
      setCurrentBounds(bounds);
      
      // Update temporary rectangle for visual feedback
      if (tempRectangleRef.current) {
        map.removeLayer(tempRectangleRef.current);
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const L = require('leaflet');
      const newTempRectangle = L.rectangle([
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()]
      ], {
        color: '#166534',
        fillColor: '#166534',
        fillOpacity: 0.2,
        weight: 2
      });
      newTempRectangle.addTo(map);
      tempRectangleRef.current = newTempRectangle;
    };

    const handleMouseEnd = (e: LeafletMouseEvent) => {
      logger.log('Mouse end:', e.latlng, 'isSelecting:', isSelecting, 'currentBounds:', currentBounds);
      if (isSelecting && currentBounds) {
        const dragDistance = Math.sqrt(
          Math.pow(e.latlng.lat - startPoint![0], 2) + 
          Math.pow(e.latlng.lng - startPoint![1], 2)
        );
        logger.log('Drag distance:', dragDistance);
        if (dragDistance > 0.0001) {
          logger.log('Calling onBoundsChange');
          onBoundsChange(currentBounds);
        } else {
          logger.log('Drag distance too small, not selecting region');
          e.originalEvent.preventDefault();
          e.originalEvent.stopPropagation();
        }
      }
      // Remove temporary rectangle
      if (tempRectangleRef.current) {
        map.removeLayer(tempRectangleRef.current);
        tempRectangleRef.current = null;
      }
      map.dragging.enable();
      setIsSelecting(false);
      setStartPoint(null);
      setCurrentBounds(null);
    };

    const handleTouchEnd = (e: LeafletMouseEvent) => {
      logger.log('Touch end:', e.latlng, 'isSelecting:', isSelecting, 'currentBounds:', currentBounds);
      
      if (isSelecting && currentBounds) {
        // For mobile, always confirm the selection since we created it with a tap
        logger.log('Confirming mobile selection');
        onBoundsChange(currentBounds);
      }
      
      // Remove temporary rectangle
      if (tempRectangleRef.current) {
        map.removeLayer(tempRectangleRef.current);
        tempRectangleRef.current = null;
      }
      map.dragging.enable();
      setIsSelecting(false);
      setStartPoint(null);
      setCurrentBounds(null);
    };

    // Add mouse events for desktop
    map.on('mousedown', handleMouseStart);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseEnd);
    
    // Add touch events for mobile
    map.on('touchstart', handleTouchStart as unknown as L.LeafletEventHandlerFn);
    map.on('touchmove', handleTouchMove as unknown as L.LeafletEventHandlerFn);
    map.on('touchend', handleTouchEnd as unknown as L.LeafletEventHandlerFn);
    
    // Also add click event for mobile as fallback
    map.on('click', (e: LeafletMouseEvent) => {
      // Only handle clicks on mobile devices (no CTRL key)
      if (!('ctrlKey' in e.originalEvent && (e.originalEvent as MouseEvent).ctrlKey) && 'ontouchstart' in window) {
        logger.log('Mobile click detected:', e.latlng);
        handleTouchStart(e);
      }
    });

    return () => {
      map.off('mousedown', handleMouseStart);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseEnd);
      map.off('touchstart', handleTouchStart as unknown as L.LeafletEventHandlerFn);
      map.off('touchmove', handleTouchMove as unknown as L.LeafletEventHandlerFn);
      map.off('touchend', handleTouchEnd as unknown as L.LeafletEventHandlerFn);
      map.off('click');
      if (tempRectangleRef.current) {
        map.removeLayer(tempRectangleRef.current);
      }
      map.dragging.enable();
    };
  }, [map, onBoundsChange, isSelecting, startPoint, currentBounds]);

  return null;
};

interface LocationMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onRegionSelect: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onSearchLocation?: (lat: number, lng: number, name: string) => void;
  initialRegion?: { north: number; south: number; east: number; west: number } | null;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
}

const LocationMap: React.FC<LocationMapProps> = ({ 
  onLocationSelect, 
  onRegionSelect, 
  onSearchLocation,
  initialRegion,
  initialLatitude,
  initialLongitude
}) => {
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(
    initialLatitude && initialLongitude ? [initialLatitude, initialLongitude] : null
  );
  const [selectedRegion, setSelectedRegion] = useState<[number, number, number, number] | null>(
    initialRegion ? [initialRegion.north, initialRegion.west, initialRegion.south, initialRegion.east] : null
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialRegion 
      ? [(initialRegion.north + initialRegion.south) / 2, (initialRegion.east + initialRegion.west) / 2]
      : initialLatitude && initialLongitude
      ? [initialLatitude, initialLongitude]
      : [54.0, 15.0]
  );
  const [mapZoom, setMapZoom] = useState<number>(
    initialRegion || (initialLatitude && initialLongitude) ? 10 : 4
  );
  
  // Update map center/zoom when initial props change (e.g., from shared links)
  useEffect(() => {
    // Skip if no initial props or already processed in this render cycle
    if (!initialRegion && !initialLatitude && !initialLongitude) {
      return;
    }
    
    // Calculate new center and zoom based on initial props
    let newCenter: [number, number];
    let newZoom: number;
    
    if (initialRegion) {
      newCenter = [
        (initialRegion.north + initialRegion.south) / 2,
        (initialRegion.east + initialRegion.west) / 2
      ];
      // Calculate appropriate zoom based on region size
      const latSpan = initialRegion.north - initialRegion.south;
      const lngSpan = initialRegion.east - initialRegion.west;
      const maxSpan = Math.max(latSpan, lngSpan);
      // Approximate zoom level based on region size
      if (maxSpan > 10) newZoom = 5;
      else if (maxSpan > 5) newZoom = 6;
      else if (maxSpan > 2) newZoom = 7;
      else if (maxSpan > 1) newZoom = 8;
      else if (maxSpan > 0.5) newZoom = 9;
      else if (maxSpan > 0.2) newZoom = 10;
      else if (maxSpan > 0.1) newZoom = 11;
      else if (maxSpan > 0.05) newZoom = 12;
      else newZoom = 13;
      
      // Update selected region state
      setSelectedRegion([initialRegion.north, initialRegion.west, initialRegion.south, initialRegion.east]);
      setSelectedLocation(null);
    } else if (initialLatitude && initialLongitude) {
      newCenter = [initialLatitude, initialLongitude];
      newZoom = 12; // Zoom in closer for point locations
      setSelectedLocation([initialLatitude, initialLongitude]);
      setSelectedRegion(null);
    } else {
      return;
    }
    
    // Only update if different from current state
    if (newCenter[0] !== mapCenter[0] || newCenter[1] !== mapCenter[1] || newZoom !== mapZoom) {
      console.log('[LocationMap] Updating map from initial props:', { newCenter, newZoom });
      setMapCenter(newCenter);
      setMapZoom(newZoom);
    }
  }, [initialRegion, initialLatitude, initialLongitude]); // Intentionally excluding mapCenter and mapZoom to avoid loops
  const [showHistory, setShowHistory] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryItem[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [markerIcon, setMarkerIcon] = useState<L.DivIcon | null>(null);
  
  // Overlay layer toggles
  const [showForests, setShowForests] = useState(false);
  const [showProtectedAreas, setShowProtectedAreas] = useState(false);
  const [showVegetation, setShowVegetation] = useState(false);

  // Load location history on mount
  useEffect(() => {
    setLocationHistory(getLocationHistory());
  }, []);

  // Fix Leaflet marker icons
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const L = require('leaflet');
      const greenIcon = L.divIcon({
        className: 'custom-marker-icon',
        html: '<span class="custom-marker-pin"></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
      });
      setMarkerIcon(greenIcon);
    }
  }, []);

  const handleSearchLocation = (lat: number, lng: number, name: string) => {
    setMapCenter([lat, lng]);
    setMapZoom(10);
    setSelectedLocation([lat, lng]);
    setSelectedRegion(null);
    onLocationSelect(lat, lng);
    if (onSearchLocation) {
      onSearchLocation(lat, lng, name);
    }
    
    // Add to history
    addToLocationHistory({
      name,
      latitude: lat,
      longitude: lng,
      type: 'search'
    });
    setLocationHistory(getLocationHistory());
  };

  const handleBoundsChange = (bounds: MapBounds) => {
    logger.log('Region selected:', bounds);
    const region = [
      bounds.getNorth(),
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast()
    ] as [number, number, number, number];
    
    setSelectedRegion(region);
    setSelectedLocation(null);
    onRegionSelect({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    });
    
    // Add to history
    const centerLat = (bounds.getNorth() + bounds.getSouth()) / 2;
    const centerLon = (bounds.getEast() + bounds.getWest()) / 2;
    addToLocationHistory({
      name: 'Selected Region',
      latitude: centerLat,
      longitude: centerLon,
      type: 'region',
      region: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      }
    });
    setLocationHistory(getLocationHistory());
  };

  const handleHistoryItemClick = (item: LocationHistoryItem) => {
    if (item.type === 'region' && item.region) {
      // Load region
      const region = [
        item.region.north,
        item.region.west,
        item.region.south,
        item.region.east
      ] as [number, number, number, number];
      setSelectedRegion(region);
      setSelectedLocation(null);
      setMapCenter([(item.region.north + item.region.south) / 2, (item.region.east + item.region.west) / 2]);
      setMapZoom(10);
      onRegionSelect(item.region);
    } else {
      // Load point
      setMapCenter([item.latitude, item.longitude]);
      setMapZoom(10);
      setSelectedLocation([item.latitude, item.longitude]);
      setSelectedRegion(null);
      onLocationSelect(item.latitude, item.longitude);
    }
    setShowHistory(false);
  };

  const handleRemoveHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromLocationHistory(id);
    setLocationHistory(getLocationHistory());
  };



  const clearSelection = () => {
    setSelectedLocation(null);
    setSelectedRegion(null);
    // Use coordinates that are clearly invalid/out of bounds to indicate no selection
    onLocationSelect(0, 0);
    onRegionSelect({ north: 0, south: 0, east: 0, west: 0 });
  };

  return (
    <div>
      <div className="relative">
        <div className="mb-4">
          <LocationSearch onLocationSelect={handleSearchLocation} />
        </div>

          {/* History Dropdown */}
          {showHistory && locationHistory.length > 0 && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-[1000] max-h-64 overflow-y-auto">
              <div className="p-2">
                <div className="flex items-center justify-between mb-2 px-2">
                  <h4 className="text-xs font-semibold text-gray-700">Recent Locations</h4>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {locationHistory.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleHistoryItemClick(item)}
                    className="w-full text-left px-2 py-2 hover:bg-gray-50 rounded-lg flex items-start justify-between gap-2 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {item.type === 'region' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        <span className="text-xs font-medium text-gray-700 truncate">
                          {formatLocationName(item)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {getRelativeTime(item.timestamp)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleRemoveHistoryItem(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity p-1"
                      title="Remove from history"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}
        <div 
          ref={mapContainerRef}
          className="relative"
        >
          <ClientOnlyMap>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ 
                height: '384px', 
                width: '100%',
                position: 'relative',
              }}
              ref={mapRef}
              zoomControl={true}
            >
              <MapController center={mapCenter} zoom={mapZoom} />
              <ScaleControl />
              <LayerSwitcher 
                showForests={showForests}
                showProtectedAreas={showProtectedAreas}
                showVegetation={showVegetation}
                onToggleForests={() => setShowForests(!showForests)}
                onToggleProtectedAreas={() => setShowProtectedAreas(!showProtectedAreas)}
                onToggleVegetation={() => setShowVegetation(!showVegetation)}
              />
              
              {/* Overlay layers */}
              <OSMOverlays showForests={showForests} showProtectedAreas={showProtectedAreas} />
              <VegetationLayer show={showVegetation} />
              
              {selectedLocation && markerIcon && (
                <Marker position={selectedLocation} icon={markerIcon} />
              )}
              {selectedRegion && (
                <Rectangle 
                  bounds={[
                    [selectedRegion[0], selectedRegion[1]],
                    [selectedRegion[2], selectedRegion[3]]
                  ]}
                  color="green"
                  fillColor="green"
                  fillOpacity={0.2}
                />
              )}
              {selectedRegion && markerIcon && (
                <Marker
                  position={[
                    (selectedRegion[0] + selectedRegion[2]) / 2,
                    (selectedRegion[1] + selectedRegion[3]) / 2,
                  ]}
                  icon={markerIcon}
                />
              )}
              
              {/* Custom Region Selector - Always enabled for drag selection */}
              <CustomRegionSelector 
                onBoundsChange={handleBoundsChange} 
              />
              <MapClickHandler />
            </MapContainer>
          </ClientOnlyMap>
          
          {/* Map control buttons */}
          <div className="absolute top-2 right-2 z-[1000] flex gap-2">
            {/* Clear selection button */}
            {selectedRegion && (
              <button
                onClick={clearSelection}
                className="bg-white hover:bg-gray-100 text-gray-700 rounded-md p-2 shadow-md border border-gray-200 transition-colors"
                title="Clear selection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Region information box - moved outside map container */}
      {selectedRegion && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Selected region:</strong> {selectedRegion[0].toFixed(4)}?N to {selectedRegion[2].toFixed(4)}?N, {selectedRegion[1].toFixed(4)}?E to {selectedRegion[3].toFixed(4)}?E</p>
            <p><strong>Area size:</strong> {formatArea(calculateRegionArea({
              north: selectedRegion[0],
              south: selectedRegion[2], 
              east: selectedRegion[3],
              west: selectedRegion[1]
            }))}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationMap; 