/**
 * Location search history and recent selections
 */

import { logger } from './logger';

export interface LocationHistoryItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  type: 'search' | 'selection' | 'region';
  region?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

const HISTORY_KEY = 'forest-sim-location-history';
const MAX_HISTORY_ITEMS = 10;

/**
 * Get location history from localStorage
 */
export function getLocationHistory(): LocationHistoryItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) {
      return [];
    }

    const history = JSON.parse(stored) as LocationHistoryItem[];
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    logger.error('Error reading location history:', error);
    return [];
  }
}

/**
 * Add location to history
 */
export function addToLocationHistory(item: Omit<LocationHistoryItem, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const history = getLocationHistory();
    
    // Check if similar location already exists (within 0.01 degrees)
    const exists = history.find(h => 
      Math.abs(h.latitude - item.latitude) < 0.01 &&
      Math.abs(h.longitude - item.longitude) < 0.01
    );

    if (exists) {
      // Update timestamp of existing item
      exists.timestamp = Date.now();
      exists.name = item.name; // Update name in case it changed
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      return;
    }

    // Add new item
    const newItem: LocationHistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    history.unshift(newItem);

    // Keep only latest MAX_HISTORY_ITEMS
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    logger.error('Error adding to location history:', error);
  }
}

/**
 * Clear all location history
 */
export function clearLocationHistory(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    logger.error('Error clearing location history:', error);
  }
}

/**
 * Remove specific item from history
 */
export function removeFromLocationHistory(id: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const history = getLocationHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    logger.error('Error removing from location history:', error);
  }
}

/**
 * Format location name for display
 */
export function formatLocationName(item: LocationHistoryItem): string {
  if (item.name && item.name !== 'Selected Location') {
    return item.name;
  }

  // Format coordinates
  const lat = item.latitude.toFixed(4);
  const lon = item.longitude.toFixed(4);
  const latDir = item.latitude >= 0 ? 'N' : 'S';
  const lonDir = item.longitude >= 0 ? 'E' : 'W';
  
  return `${Math.abs(parseFloat(lat))}°${latDir}, ${Math.abs(parseFloat(lon))}°${lonDir}`;
}

/**
 * Get relative time string
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}
