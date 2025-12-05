/**
 * Utilities for creating shareable links with encoded analysis parameters
 */

export interface ShareableState {
  mode: 'planting' | 'clear-cutting';
  latitude?: number;
  longitude?: number;
  region?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  years: number;
  calculationMode: 'perTree' | 'perArea';
  averageTreeAge?: number;
  treeIds: string[]; // Store only IDs, not full tree objects
  treePercentages: { [key: string]: number };
}

/**
 * Ultra-compact URL encoding using delimiter-separated values
 * Format: m|y|c|lat,lon|n,s,e,w|a|treeId1:pct1,treeId2:pct2
 */
function toUltraCompactString(state: ShareableState): string {
  const parts: string[] = [];
  
  // Mode: p=planting, c=clear-cutting
  parts.push(state.mode === 'planting' ? 'p' : 'c');
  
  // Years
  parts.push(state.years.toString());
  
  // Calculation mode: t=perTree, a=perArea
  parts.push(state.calculationMode === 'perTree' ? 't' : 'a');
  
  // Location (lat,lon) - round to 3 decimals (~100m precision)
  if (state.latitude !== undefined && state.longitude !== undefined) {
    const lat = Math.round(state.latitude * 1000) / 1000;
    const lon = Math.round(state.longitude * 1000) / 1000;
    parts.push(`${lat},${lon}`);
  } else {
    parts.push('');
  }
  
  // Region (n,s,e,w) - round to 3 decimals
  if (state.region) {
    const n = Math.round(state.region.north * 1000) / 1000;
    const s = Math.round(state.region.south * 1000) / 1000;
    const e = Math.round(state.region.east * 1000) / 1000;
    const w = Math.round(state.region.west * 1000) / 1000;
    parts.push(`${n},${s},${e},${w}`);
  } else {
    parts.push('');
  }
  
  // Average tree age (only if defined)
  parts.push(state.averageTreeAge !== undefined ? state.averageTreeAge.toString() : '');
  
  // Trees with percentages (id:pct,id:pct) - include all trees, even with 0%
  const treesWithPcts: string[] = [];
  state.treeIds.forEach(id => {
    const pct = state.treePercentages[id] ?? 0;
    // Always include the tree ID, with its percentage (even if 0)
    treesWithPcts.push(`${id}:${pct}`);
  });
  parts.push(treesWithPcts.join(','));
  
  return parts.join('|');
}

/**
 * Decode ultra-compact string back to state
 */
function fromUltraCompactString(compact: string): ShareableState {
  const parts = compact.split('|');
  
  const state: ShareableState = {
    mode: parts[0] === 'p' ? 'planting' : 'clear-cutting',
    years: parseInt(parts[1]),
    calculationMode: parts[2] === 't' ? 'perTree' : 'perArea',
    treeIds: [],
    treePercentages: {}
  };
  
  // Location
  if (parts[3]) {
    const [lat, lon] = parts[3].split(',').map(parseFloat);
    state.latitude = lat;
    state.longitude = lon;
  }
  
  // Region
  if (parts[4]) {
    const [n, s, e, w] = parts[4].split(',').map(parseFloat);
    state.region = { north: n, south: s, east: e, west: w };
  }
  
  // Average tree age
  if (parts[5]) {
    state.averageTreeAge = parseInt(parts[5]);
  }
  
  // Trees with percentages
  if (parts[6]) {
    parts[6].split(',').forEach(treePct => {
      const [id, pct] = treePct.split(':');
      state.treeIds.push(id);
      state.treePercentages[id] = parseFloat(pct);
    });
  }
  
  return state;
}

/**
 * Encode state to URL-safe compact string
 */
export function encodeStateToUrl(state: ShareableState): string {
  try {
    // Convert to ultra-compact string format
    const compactStr = toUltraCompactString(state);
    
    // Use base64 encoding for URL safety (still much shorter than JSON)
    const base64 = typeof window !== 'undefined' 
      ? btoa(compactStr)
      : Buffer.from(compactStr).toString('base64');
    
    // Make URL-safe by replacing characters
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('Error encoding state:', error);
    return '';
  }
}

/**
 * Decode URL parameter to state object
 */
export function decodeUrlToState(encoded: string): ShareableState | null {
  try {
    // Restore base64 padding and characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode base64
    const compactStr = typeof window !== 'undefined'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('utf-8');
    
    // Convert from ultra-compact string format
    const state = fromUltraCompactString(compactStr);
    
    // Validate required fields
    if (!state.mode || !state.years || !state.calculationMode) {
      console.error('Invalid state: missing required fields');
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Error decoding state:', error);
    return null;
  }
}

/**
 * Generate shareable URL for current analysis
 */
export function generateShareableUrl(state: ShareableState): string {
  const encoded = encodeStateToUrl(state);
  if (!encoded) {
    return '';
  }
  
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin + window.location.pathname
    : '';
  
  return `${baseUrl}?share=${encoded}`;
}

/**
 * Get share parameter from current URL
 */
export function getShareParameterFromUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const params = new URLSearchParams(window.location.search);
  return params.get('share');
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch {
        document.body.removeChild(textArea);
        return false;
      }
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Validate state object
 */
export function validateState(state: ShareableState): boolean {
  // Check required fields
  if (!state.mode || !['planting', 'clear-cutting'].includes(state.mode)) {
    return false;
  }
  
  if (!state.years || state.years <= 0 || state.years > 200) {
    return false;
  }
  
  if (!state.calculationMode || !['perTree', 'perArea'].includes(state.calculationMode)) {
    return false;
  }
  
  // Check location
  if (!state.latitude && !state.longitude && !state.region) {
    return false;
  }
  
  // Validate coordinates if present
  if (state.latitude !== undefined && (state.latitude < -90 || state.latitude > 90)) {
    return false;
  }
  
  if (state.longitude !== undefined && (state.longitude < -180 || state.longitude > 180)) {
    return false;
  }
  
  // Validate region bounds if present
  if (state.region) {
    const { north, south, east, west } = state.region;
    if (north < -90 || north > 90 || south < -90 || south > 90) {
      return false;
    }
    if (east < -180 || east > 180 || west < -180 || west > 180) {
      return false;
    }
    if (north <= south) {
      return false;
    }
  }
  
  // Validate tree percentages
  if (state.treePercentages) {
    const total = Object.values(state.treePercentages).reduce((sum, val) => sum + val, 0);
    if (total < 0 || total > 100) {
      return false;
    }
  }
  
  return true;
}
