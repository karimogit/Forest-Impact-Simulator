import { NextResponse } from 'next/server'

export function middleware() {
  const response = NextResponse.next()

  // Security headers as documented in SECURITY.md
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Content Security Policy
  // Note: Next.js requires 'unsafe-inline' for both scripts and styles for:
  // - Hot Module Replacement (HMR) in development
  // - Runtime hydration scripts
  // - Dynamic chunk loading
  // We cannot use 'strict-dynamic' as it causes browsers to ignore 'unsafe-inline'
  // Other security measures (XSS protection, frame options, etc.) remain in place
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://nominatim.openstreetmap.org https://rest.isric.org https://api.open-meteo.com https://archive-api.open-meteo.com https://overpass-api.de; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'; upgrade-insecure-requests; block-all-mixed-content;"
  )

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - _next/webpack-hmr (hot reload)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|_next/webpack-hmr).*)',
  ],
} 