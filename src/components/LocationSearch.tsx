"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  validateSearchQuery, 
  sanitizeSearchQuery, 
  sanitizeDisplayName, 
  apiRateLimiter 
} from '@/utils/security';
import { logger } from '@/utils/logger';

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
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sanitizedQuery)}&limit=5&addressdetails=1`,
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
    <div className="relative mb-4" ref={searchRef}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search for a location..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </div>
      </form>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-[1000] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.place_id}
              onClick={() => handleResultClick(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900 text-sm">
                {result.display_name.split(',')[0]}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {result.display_name}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && !isLoading && results.length === 0 && query.trim() && (
        <div className="absolute z-[1000] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="px-4 py-3 text-sm text-gray-500">
            No locations found for &quot;{query}&quot;
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSearch; 