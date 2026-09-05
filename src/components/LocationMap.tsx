"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useMap } from 'react-leaflet';
import type * as L from 'leaflet';
import LocationSearch from './LocationSearch';
import { calculateRegionArea, formatArea } from '@/utils/treePlanting';
import { getLocationHistory, addToLocationHistory, removeFromLocationHistory, formatLocationName, getRelativeTime, type LocationHistoryItem } from '@/utils/locationHistory';
import { logger } from '@/utils/logger';
import { escapeHtml } from '@/utils/security';
import { formatLatitude, formatLongitude, hasCoordinates } from '@/utils/geo';
import { ClockIcon, XIcon, LayersIcon, CheckIcon, MapPinIcon, Spinner, RulerIcon } from './ui/Icons';

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
    return (
      <div className="flex h-[440px] items-center justify-center gap-3 bg-sand-100 text-sm text-ink-500">
        <Spinner size={18} className="text-accent" />
        Loading map…
      </div>
    );
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
      if (lastBoundsRef.current !== boundsKey) {
        return;
      }
      
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
            const areaType = escapeHtml(element.tags?.boundary || element.tags?.leisure || 'Nature Reserve');
            polygon.bindPopup(`<strong>🛡️ ${escapeHtml(name)}</strong><br/>Type: ${areaType}<br/>OSM ID: ${element.id}`);
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
      <div className="leaflet-top leaflet-left" style={{ top: '84px', left: '10px' }}>
        <div className="flex items-center gap-2 rounded-full border border-sand-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-ink-700 shadow-card">
          <Spinner size={12} className="text-accent" />
          Loading map data…
        </div>
      </div>
    );
  }
  
  if (showZoomHint) {
    return (
      <div className="leaflet-top leaflet-left" style={{ top: '84px', left: '10px' }}>
        <div className="flex items-center gap-2 rounded-full border border-ember-200 bg-ember-50/95 px-3 py-1.5 text-xs font-medium text-ember-700 shadow-card">
          <LayersIcon size={12} />
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
  
  const baseLayers: { id: 'street' | 'satellite' | 'terrain'; label: string }[] = [
    { id: 'satellite', label: 'Satellite' },
    { id: 'street', label: 'Street' },
    { id: 'terrain', label: 'Terrain' },
  ];

  const overlays = [
    { label: 'Forests', active: showForests, onToggle: onToggleForests, swatch: '#228B22' },
    { label: 'Protected areas', active: showProtectedAreas, onToggle: onToggleProtectedAreas, swatch: '#4169E1' },
    { label: 'Vegetation (NASA)', active: showVegetation, onToggle: onToggleVegetation, swatch: '#84cc16' },
  ];

  return (
    <div className="leaflet-bottom leaflet-right" style={{ bottom: '30px', right: '10px' }}>
      <div className="leaflet-control relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          className="flex items-center gap-2 rounded-xl border border-sand-200 bg-white/95 px-3 py-2 text-xs font-medium text-ink-700 shadow-card backdrop-blur transition-colors hover:bg-white cursor-pointer"
          title="Map layers & overlays"
        >
          <LayersIcon size={15} />
          <span className="hidden sm:inline">Layers</span>
        </button>
        {isOpen && (
          <div className="absolute bottom-full right-0 mb-2 w-56 overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-float">
            <div className="px-3 pt-3 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Base map</span>
            </div>
            <div className="mx-2 mb-2 grid grid-cols-3 gap-1 rounded-xl bg-sand-100 p-1">
              {baseLayers.map(layer => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => handleLayerChange(layer.id)}
                  aria-pressed={activeLayer === layer.id}
                  className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    activeLayer === layer.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>

            <div className="border-t border-sand-200 px-3 pt-2.5 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Overlays</span>
            </div>
            <div className="px-2 pb-2">
              {overlays.map(overlay => (
                <button
                  key={overlay.label}
                  type="button"
                  onClick={overlay.onToggle}
                  role="checkbox"
                  aria-checked={overlay.active}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs text-ink-700 transition-colors hover:bg-sand-50 cursor-pointer"
                >
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                      overlay.active ? 'border-accent bg-accent text-white' : 'border-sand-300 bg-white'
                    }`}
                  >
                    {overlay.active && <CheckIcon size={11} strokeWidth={3} />}
                  </span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: overlay.swatch }} aria-hidden="true" />
                  <span className="flex-1">{overlay.label}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-sand-200 bg-sand-50 px-3 py-2 text-[11px] text-ink-400">
              Zoom in (level 10+) to see forests &amp; reserves
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

const CustomRegionSelector = ({ onBoundsChange, onSelectingChange, drawMode }: { onBoundsChange: (bounds: MapBounds) => void; onSelectingChange?: (selecting: boolean) => void; drawMode: boolean }) => {
  const map = useMap();
  const [isSelecting, setIsSelecting] = useState(false);
  const tempRectangleRef = useRef<L.Rectangle | null>(null);
  const isSelectingRef = useRef(false);
  const startPointRef = useRef<[number, number] | null>(null);
  const currentBoundsRef = useRef<MapBounds | null>(null);
  
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
      isSelectingRef.current = true;
      startPointRef.current = [e.latlng.lat, e.latlng.lng];
      map.dragging.disable();
      e.originalEvent.stopImmediatePropagation();
    };

    const handleTouchStart = (e: LeafletMouseEvent) => {
      if (!drawMode) {
        return;
      }
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
      isSelectingRef.current = true;
      startPointRef.current = [centerLat, centerLng];
      currentBoundsRef.current = bounds;
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
      if (!isSelectingRef.current || !startPointRef.current) return;
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      
      const start = startPointRef.current;
      const bounds = {
        getSouth: () => Math.min(start[0], e.latlng.lat),
        getNorth: () => Math.max(start[0], e.latlng.lat),
        getWest: () => Math.min(start[1], e.latlng.lng),
        getEast: () => Math.max(start[1], e.latlng.lng),
      };
      currentBoundsRef.current = bounds;
      
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
      if (!isSelectingRef.current || !startPointRef.current) return;
      
      // Prevent default touch behavior during selection
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      
      const start = startPointRef.current;
      const bounds = {
        getSouth: () => Math.min(start[0], e.latlng.lat),
        getNorth: () => Math.max(start[0], e.latlng.lat),
        getWest: () => Math.min(start[1], e.latlng.lng),
        getEast: () => Math.max(start[1], e.latlng.lng),
      };
      currentBoundsRef.current = bounds;
      
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
      const selecting = isSelectingRef.current;
      const bounds = currentBoundsRef.current;
      const start = startPointRef.current;
      logger.log('Mouse end:', e.latlng, 'isSelecting:', selecting, 'currentBounds:', bounds);
      if (selecting && bounds && start) {
        const dragDistance = Math.sqrt(
          Math.pow(e.latlng.lat - start[0], 2) + 
          Math.pow(e.latlng.lng - start[1], 2)
        );
        logger.log('Drag distance:', dragDistance);
        if (dragDistance > 0.0001) {
          logger.log('Calling onBoundsChange');
          onBoundsChange(bounds);
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
      isSelectingRef.current = false;
      startPointRef.current = null;
      currentBoundsRef.current = null;
    };

    const handleTouchEnd = (e: LeafletMouseEvent) => {
      const selecting = isSelectingRef.current;
      const bounds = currentBoundsRef.current;
      logger.log('Touch end:', e.latlng, 'isSelecting:', selecting, 'currentBounds:', bounds);
      
      if (selecting && bounds) {
        // For mobile, always confirm the selection since we created it with a tap
        logger.log('Confirming mobile selection');
        onBoundsChange(bounds);
      }
      
      // Remove temporary rectangle
      if (tempRectangleRef.current) {
        map.removeLayer(tempRectangleRef.current);
        tempRectangleRef.current = null;
      }
      map.dragging.enable();
      setIsSelecting(false);
      isSelectingRef.current = false;
      startPointRef.current = null;
      currentBoundsRef.current = null;
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
      // Only handle clicks on mobile when draw mode is enabled
      if (
        drawMode &&
        !('ctrlKey' in e.originalEvent && (e.originalEvent as MouseEvent).ctrlKey) &&
        'ontouchstart' in window
      ) {
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
  }, [map, onBoundsChange, drawMode]);

  return null;
};

interface LocationMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onRegionSelect: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onSearchLocation?: (lat: number, lng: number, name: string) => void;
  onClearSelection?: () => void;
  initialRegion?: { north: number; south: number; east: number; west: number } | null;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
}

const LocationMap: React.FC<LocationMapProps> = ({ 
  onLocationSelect, 
  onRegionSelect, 
  onSearchLocation,
  onClearSelection,
  initialRegion,
  initialLatitude,
  initialLongitude
}) => {
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(
    hasCoordinates(initialLatitude, initialLongitude) ? [initialLatitude!, initialLongitude!] : null
  );
  const [selectedRegion, setSelectedRegion] = useState<[number, number, number, number] | null>(
    initialRegion ? [initialRegion.north, initialRegion.west, initialRegion.south, initialRegion.east] : null
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialRegion 
      ? [(initialRegion.north + initialRegion.south) / 2, (initialRegion.east + initialRegion.west) / 2]
      : hasCoordinates(initialLatitude, initialLongitude)
      ? [initialLatitude!, initialLongitude!]
      : [54.0, 15.0]
  );
  const [mapZoom, setMapZoom] = useState<number>(
    initialRegion || hasCoordinates(initialLatitude, initialLongitude) ? 10 : 4
  );
  
  // Update map center/zoom when initial props change (e.g., from shared links)
  useEffect(() => {
    // Skip if no initial props or already processed in this render cycle
    if (!initialRegion && !hasCoordinates(initialLatitude, initialLongitude)) {
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
    } else if (hasCoordinates(initialLatitude, initialLongitude)) {
      newCenter = [initialLatitude!, initialLongitude!];
      newZoom = 12; // Zoom in closer for point locations
      setSelectedLocation([initialLatitude!, initialLongitude!]);
      setSelectedRegion(null);
    } else {
      return;
    }
    
    // Only update if different from current state
    if (newCenter[0] !== mapCenter[0] || newCenter[1] !== mapCenter[1] || newZoom !== mapZoom) {
      logger.log('[LocationMap] Updating map from initial props:', { newCenter, newZoom });
      setMapCenter(newCenter);
      setMapZoom(newZoom);
    }
  }, [initialRegion, initialLatitude, initialLongitude]); // Intentionally excluding mapCenter and mapZoom to avoid loops
  const [showHistory, setShowHistory] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
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
    setDrawMode(false);
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
    if (onClearSelection) {
      onClearSelection();
    }
  };

  const regionBounds = selectedRegion
    ? { north: selectedRegion[0], south: selectedRegion[2], east: selectedRegion[3], west: selectedRegion[1] }
    : null;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="relative">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <LocationSearch onLocationSelect={handleSearchLocation} />
          </div>
          <button
            type="button"
            onClick={() => setShowHistory(prev => !prev)}
            className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${
              showHistory
                ? 'border-accent bg-accent text-white'
                : 'border-sand-300 bg-white text-ink-700 hover:border-ink-300 hover:bg-sand-50'
            }`}
            aria-pressed={showHistory}
            aria-label="Recent locations"
            title="Recent locations"
          >
            <ClockIcon size={15} />
            <span className="hidden sm:inline">Recent</span>
          </button>
          <button
            type="button"
            onClick={() => setDrawMode(prev => !prev)}
            className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors md:hidden ${
              drawMode
                ? 'border-accent bg-accent text-white'
                : 'border-sand-300 bg-white text-ink-700 hover:border-ink-300 hover:bg-sand-50'
            }`}
            aria-pressed={drawMode}
            aria-label="Draw region on map"
            title="Draw region"
          >
            <RulerIcon size={15} />
            Draw
          </button>
        </div>

        {/* History Dropdown */}
        {showHistory && (
          <div className="absolute left-0 right-0 top-full z-[1000] mt-2 max-h-72 overflow-y-auto scroll-thin rounded-2xl border border-sand-200 bg-white shadow-float animate-fade-in">
            <div className="flex items-center justify-between border-b border-sand-200 px-4 py-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">Recent locations</h4>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="rounded-md p-1 text-ink-400 hover:bg-sand-100 hover:text-ink-700"
                aria-label="Close recent locations"
              >
                <XIcon size={14} />
              </button>
            </div>
            <div className="p-1.5">
              {locationHistory.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-start justify-between gap-2 rounded-xl px-2.5 py-2 hover:bg-sand-50"
                >
                  <button
                    type="button"
                    onClick={() => handleHistoryItemClick(item)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
                        {item.type === 'region' ? <RulerIcon size={13} /> : <MapPinIcon size={13} />}
                      </span>
                      <span className="truncate text-sm font-medium text-ink-900">
                        {formatLocationName(item)}
                      </span>
                    </div>
                    <div className="ml-8 mt-0.5 text-xs text-ink-400">
                      {getRelativeTime(item.timestamp)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveHistoryItem(item.id, e)}
                    className="rounded-md p-1.5 text-ink-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                    title="Remove from history"
                    aria-label={`Remove ${formatLocationName(item)} from history`}
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
              {locationHistory.length === 0 && (
                <p className="px-3 py-4 text-sm text-ink-500">No recent locations yet. Search or select a region to save one.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapContainerRef}
        className="relative overflow-hidden rounded-2xl border border-sand-200 bg-sand-100 shadow-sm"
      >
        <ClientOnlyMap>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{
              height: '440px',
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
                pathOptions={{ color: '#2a7052', fillColor: '#2a7052', fillOpacity: 0.2, weight: 2 }}
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
              drawMode={drawMode}
            />
            <MapClickHandler />
          </MapContainer>
        </ClientOnlyMap>

        {/* Draw-mode hint (mobile) */}
        {drawMode && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center md:hidden">
            <span className="rounded-full bg-ink-900/85 px-3 py-1.5 text-xs font-medium text-white shadow-float backdrop-blur">
              Tap the map to place a selection square
            </span>
          </div>
        )}

        {/* Clear selection button */}
        {selectedRegion && (
          <div className="absolute right-3 top-3 z-[1000]">
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sand-200 bg-white/95 px-3 py-2 text-xs font-medium text-ink-700 shadow-card backdrop-blur transition-colors hover:bg-white hover:text-red-700"
              title="Clear selection"
            >
              <XIcon size={14} />
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* Region information */}
      {regionBounds && (
        <div className="flex flex-col gap-3 rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
              <RulerIcon size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">Selected region</p>
              <p className="truncate text-sm text-ink-700 tnum">
                {formatLatitude(regionBounds.south)} – {formatLatitude(regionBounds.north)}
                <span className="mx-1.5 text-ink-300">·</span>
                {formatLongitude(regionBounds.west)} – {formatLongitude(regionBounds.east)}
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">Area</p>
            <p className="text-base font-semibold text-accent-strong tnum">{formatArea(calculateRegionArea(regionBounds))}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationMap; 