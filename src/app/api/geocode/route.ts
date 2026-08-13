import { NextRequest, NextResponse } from 'next/server';
import { sanitizeSearchQuery, validateSearchQuery } from '@/utils/security';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'ForestImpactSimulator/1.0 (https://forest-impact-simulator.vercel.app; https://github.com/karimogit/Forest-Impact-Simulator)';

let lastRequestAt = 0;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || '';

  if (!validateSearchQuery(query)) {
    return NextResponse.json({ error: 'Invalid search query' }, { status: 400 });
  }

  const sanitizedQuery = sanitizeSearchQuery(query);
  if (!sanitizedQuery) {
    return NextResponse.json({ error: 'Invalid search query' }, { status: 400 });
  }

  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
  }
  lastRequestAt = Date.now();

  const url = `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(sanitizedQuery)}&limit=5&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    return NextResponse.json({ error: 'Geocoding request failed' }, { status: 502 });
  }
}
