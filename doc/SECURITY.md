# Security

## Overview
This document outlines the security measures for the Forest Impact Simulator.

## Security Features

### Input Validation
- All user inputs are validated and sanitized
- Search queries limited to 100 characters
- Coordinates validated (latitude: -90 to 90, longitude: -180 to 180)
- Simulation years limited to 1-100

### Content Security Policy
- Restricts resources to same origin
- Prevents XSS attacks
- Blocks iframe embedding

### Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Data Protection
- No user data stored or collected
- All processing done client-side
- No tracking or analytics

## External APIs
The app connects to these trusted APIs:
- [OpenStreetMap](https://www.openstreetmap.org/) (location search)
- [ISRIC - World Soil Information](https://www.isric.org/) (soil data)
- [Open-Meteo](https://open-meteo.com/) (climate data)

## Reporting Security Issues
For security concerns, please contact the development team through the project repository.

---

*Last updated: August 2025* 