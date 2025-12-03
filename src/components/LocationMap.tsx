"use client";

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useMap } from 'react-leaflet';
import type * as L from 'leaflet';
import LocationSearch from './LocationSearch';
import { calculateRegionArea, formatArea } from '@/utils/treePlanting';
import { getLocationHistory, addToLocationHistory, removeFromLocationHistory, formatLocationName, getRelativeTime, type LocationHistoryItem } from '@/utils/locationHistory';

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
        console.error('Geolocation error:', error);
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
const LayerSwitcher = () => {
  const map = useMap();
  const [activeLayer, setActiveLayer] = useState<'street' | 'satellite' | 'terrain'>('terrain');
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
      maxZoom: 19
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
    setIsOpen(false);
  };
  
  return (
    <div className="leaflet-bottom leaflet-right" style={{ bottom: '30px', right: '10px' }}>
      <div className="leaflet-control leaflet-bar bg-white rounded shadow-md">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 border-none cursor-pointer flex items-center gap-2"
          title="Change map layer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="hidden sm:inline">{activeLayer === 'street' ? 'Street' : activeLayer === 'satellite' ? 'Satellite' : 'Terrain'}</span>
        </button>
        {isOpen && (
          <div className="absolute bottom-full right-0 mb-2 bg-white rounded shadow-lg border border-gray-200 min-w-[120px]">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18M5 20v-2a2 2 0 012-2h10a2 2 0 012 2v2" />
              </svg>
              <span>Terrain</span>
            </button>
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
            console.warn('Map still not ready for setView:', error);
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.warn('Map not ready for setView:', error);
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
      
      console.log('CTRL+Mouse start:', e.latlng);
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      setIsSelecting(true);
      setStartPoint([e.latlng.lat, e.latlng.lng]);
      map.dragging.disable();
      e.originalEvent.stopImmediatePropagation();
    };

    const handleTouchStart = (e: LeafletMouseEvent) => {
      // For mobile devices, use click-to-create-square approach
      console.log('Touch start:', e.latlng);
      
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
      
      console.log('Created initial selection square');
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
      console.log('Mouse end:', e.latlng, 'isSelecting:', isSelecting, 'currentBounds:', currentBounds);
      if (isSelecting && currentBounds) {
        const dragDistance = Math.sqrt(
          Math.pow(e.latlng.lat - startPoint![0], 2) + 
          Math.pow(e.latlng.lng - startPoint![1], 2)
        );
        console.log('Drag distance:', dragDistance);
        if (dragDistance > 0.0001) {
          console.log('Calling onBoundsChange');
          onBoundsChange(currentBounds);
        } else {
          console.log('Drag distance too small, not selecting region');
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
      console.log('Touch end:', e.latlng, 'isSelecting:', isSelecting, 'currentBounds:', currentBounds);
      
      if (isSelecting && currentBounds) {
        // For mobile, always confirm the selection since we created it with a tap
        console.log('Confirming mobile selection');
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
        console.log('Mobile click detected:', e.latlng);
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
  const [showHistory, setShowHistory] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryItem[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Load location history on mount
  useEffect(() => {
    setLocationHistory(getLocationHistory());
  }, []);

  // Fix Leaflet marker icons
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const L = require('leaflet');
      delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
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
    console.log('Region selected:', bounds);
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
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"> 
        <div className="relative p-3">
          <div className="mb-2">
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
                <LayerSwitcher />
                {selectedLocation && (
                  <Marker position={selectedLocation} />
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
                {selectedRegion && (
                  <Marker
                    position={[
                      (selectedRegion[0] + selectedRegion[2]) / 2,
                      (selectedRegion[1] + selectedRegion[3]) / 2,
                    ]}
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