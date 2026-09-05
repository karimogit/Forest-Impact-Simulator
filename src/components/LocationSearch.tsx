"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  validateSearchQuery, 
  sanitizeSearchQuery, 
  sanitizeDisplayName, 
  apiRateLimiter 
} from '@/utils/security';
import { logger } from '@/utils/logger';
import { SearchIcon, MapPinIcon, Spinner } from './ui/Icons';

interface LocationSearchProps {
  onLocationSelect: (lat: number, lng: number, name: string) => void;
}

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

const LocationSearch: React.FC<LocationSearchProps> = ({ onLocationSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    // Validate and sanitize input
    if (!validateSearchQuery(searchQuery)) {
      logger.warn('Invalid search query:', searchQuery);
      setResults([]);
      return;
    }

    const sanitizedQuery = sanitizeSearchQuery(searchQuery);
    
    // Rate limiting
    if (!apiRateLimiter.isAllowed('search')) {
      logger.warn('Rate limit exceeded for search');
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(sanitizedQuery)}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        // Sanitize the results
        const sanitizedResults = data.map((result: { display_name?: string }) => ({
          ...result,
          display_name: sanitizeDisplayName(result.display_name || '')
        }));
        setResults(sanitizedResults);
      } else {
        setResults([]);
      }
    } catch (error) {
      logger.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    if (value.trim()) {
      // Debounce the search by 300ms
      debounceTimeoutRef.current = setTimeout(() => {
        searchLocations(value);
        setShowResults(true);
      }, 300);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      logger.error('Invalid coordinates:', result);
      return;
    }
    
    onLocationSelect(lat, lng, result.display_name);
    setQuery(result.display_name);
    setShowResults(false);
    setResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0) {
      handleResultClick(results[0]);
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <label htmlFor="location-search" className="sr-only">Search for a location</label>
          <input
            id="location-search"
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search for a place, city, or region…"
            aria-label="Search for a location"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-sand-300 bg-white pl-10 pr-10 text-sm text-ink-900 placeholder:text-ink-400 shadow-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <SearchIcon size={16} className="text-ink-400" />
          </div>
          {isLoading && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Spinner size={16} className="text-accent" />
            </div>
          )}
        </div>
      </form>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-[1000] mt-2 max-h-64 w-full overflow-y-auto scroll-thin rounded-2xl border border-sand-200 bg-white p-1.5 shadow-float animate-fade-in">
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => handleResultClick(result)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-sand-50 focus:bg-sand-50 focus:outline-none"
            >
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
                <MapPinIcon size={13} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink-900">
                  {result.display_name.split(',')[0]}
                </span>
                <span className="block truncate text-xs text-ink-400">
                  {result.display_name}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && !isLoading && results.length === 0 && query.trim() && (
        <div className="absolute z-[1000] mt-2 w-full rounded-2xl border border-sand-200 bg-white shadow-float animate-fade-in">
          <div className="px-4 py-3 text-sm text-ink-500">
            No locations found for &quot;{query}&quot;
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSearch; 