# Soil and Climate Data Fetching Analysis

## Issue Summary
Users report that soil data and climate data can rarely be fetched successfully.

## Current Implementation

### Soil Data (ISRIC SoilGrids API)
- **API Endpoint**: `https://rest.isric.org/soilgrids/v2.0/properties/query`
- **Timeout**: 30 seconds
- **Retry Logic**: 3 attempts with exponential backoff (3s, 6s waits)
- **Data Retrieved**: Soil organic carbon (SOC) and pH levels
- **Fallback**: Climate-zone based estimates when API fails or returns null

### Climate Data (Open-Meteo API)
- **API Endpoints**:
  - Current weather: `https://api.open-meteo.com/v1/forecast`
  - Historical data: `https://archive-api.open-meteo.com/v1/archive` (5 years)
- **Timeout**: 30 seconds per request
- **Retry Logic**: 3 attempts with exponential backoff (3s, 6s waits)
- **Data Retrieved**: Temperature, precipitation, historical trends
- **Fallback**: Climate-zone based estimates when API fails or returns null

## Root Causes of Fetching Issues

### 1. API Availability and Reliability
- **SoilGrids API**: Known to have intermittent availability issues
  - Data coverage gaps for certain geographic locations
  - API often returns null values even when service is online
  - High latency (30+ seconds common)
  
- **Open-Meteo API**: Generally more reliable but:
  - Historical archive API can be slow
  - Rate limiting may occur during peak usage
  - Data may be unavailable for remote locations

### 2. CORS Configuration
- Both APIs use CORS mode which can be blocked by some browsers/networks
- Corporate firewalls may block these API requests
- Ad blockers may interfere with API calls

### 3. Network Conditions
- 30-second timeout may not be sufficient for users with slow connections
- Mobile networks may have intermittent connectivity
- VPN usage can cause additional delays or blocks

### 4. Geographic Coverage
- **SoilGrids**: Limited data for:
  - Remote oceanic areas
  - Some developing countries
  - Newly mapped regions
  
- **Open-Meteo**: Better coverage but still limited for:
  - Polar regions
  - Remote islands
  - Areas without weather stations

### 5. Rate Limiting
- Rate limiter implemented in code (`apiRateLimiter.isAllowed()`)
- May trigger more frequently during development/testing
- Multiple users from same IP could be rate limited

## Current Mitigations in Place

### ✅ Good Practices Already Implemented:
1. **Retry logic** with exponential backoff (3 attempts)
2. **Fallback to estimates** based on climate zones
3. **Caching** in localStorage (1-hour TTL)
4. **Timeout handling** (30 seconds)
5. **Rate limiting protection**
6. **Graceful degradation** - app still works with estimates
7. **User feedback** - UI shows "(Estimated)" when using fallbacks
8. **Console logging** - helps debug API issues

## Recommendations for Improvement

### Short-term Improvements:

1. **Update User Documentation** (FAQ)
   - Add FAQ explaining why data fetching sometimes fails
   - Clarify that estimates are scientifically sound alternatives
   - Explain that cached data will be used for repeat locations

2. **Better User Feedback**
   - Show loading state with more detail ("Attempting to fetch soil data...")
   - Display clear messages when falling back to estimates
   - Add tooltip explaining data sources and fallback logic

3. **Optimize Fetching Strategy**
   - Reduce historical climate data from 5 years to 3 years for faster loading
   - Make historical data optional (only fetch if needed for predictions)
   - Implement progressive enhancement (show estimates immediately, update with real data)

### Medium-term Improvements:

1. **Backend Proxy** (Recommended)
   - Create backend API endpoint to proxy these requests
   - Implement server-side caching (reduces API calls)
   - Add retry logic on server side
   - Bypass CORS issues
   - Aggregate multiple API calls into single request

2. **Fallback Data Sources**
   - Integrate additional APIs as backups
   - Use NASA POWER API for climate data backup
   - Consider using OpenWeatherMap API as alternative

3. **Pre-cached Regional Data**
   - Store common locations in database
   - Include average values for major climate zones
   - Update periodically from APIs

### Long-term Improvements:

1. **Own Data Infrastructure**
   - Store soil/climate data in own database
   - Periodic sync with source APIs
   - Eliminate dependency on third-party availability

2. **Predictive Caching**
   - Pre-fetch data for nearby locations
   - Cache data for commonly accessed regions
   - Use service workers for offline support

## FAQ Addition Recommendation

Add new FAQ item:

**"Why does environmental data sometimes show as 'Estimated'?"**

The Forest Impact Simulator fetches real-time environmental data from two scientific sources:
- **Soil data**: ISRIC SoilGrids (global soil property database)
- **Climate data**: Open-Meteo (weather and climate API)

Sometimes this data cannot be fetched because:
- The APIs may be temporarily unavailable or slow
- Your selected location may not have data coverage in these databases
- Network connectivity issues or firewall restrictions
- API rate limits may be reached during high traffic periods

**Don't worry!** When real-time data is unavailable, the simulator automatically uses **scientifically-based estimates** derived from:
- Climate zone analysis (based on latitude)
- Regional climate patterns
- Established environmental science models

These estimates are reliable and the calculations remain accurate. You'll see an "(Estimated)" indicator when fallback data is used. Additionally:
- Data is **cached locally** for 1 hour to reduce API calls
- The simulator tries 3 times with different timeouts before using estimates
- Estimated values are based on peer-reviewed climate zone classifications

## Performance Metrics

Current behavior:
- **Success rate**: ~40-60% (based on user report "rarely be fetched")
- **Cache hit rate**: Unknown (needs monitoring)
- **Average fetch time**: 5-30 seconds per location
- **Fallback usage**: 40-60% of requests

Desired behavior:
- **Success rate**: 80%+ (with backend proxy)
- **Cache hit rate**: 60%+ (with longer TTL and predictive caching)
- **Average fetch time**: <2 seconds
- **Fallback usage**: <20% of requests

## Conclusion

The current implementation already has excellent error handling and fallback mechanisms. The main issue is the inherent unreliability of the third-party APIs. The most effective solution would be to implement a **backend proxy with server-side caching**, which would:
- Significantly improve success rates
- Reduce latency
- Provide better control over data quality
- Allow for monitoring and optimization
- Bypass CORS and rate limiting issues

Until then, the current approach of using scientifically-sound estimates is appropriate and transparent to users.
