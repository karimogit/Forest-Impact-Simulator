/**
 * Geographic helpers for coordinate checks and display formatting.
 */

export function hasCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
}

export function formatLatitude(lat: number, digits = 4): string {
  return `${Math.abs(lat).toFixed(digits)}\u00B0${lat >= 0 ? 'N' : 'S'}`;
}

export function formatLongitude(lng: number, digits = 4): string {
  return `${Math.abs(lng).toFixed(digits)}\u00B0${lng >= 0 ? 'E' : 'W'}`;
}

export function equalSplitPercentages(ids: string[]): { [key: string]: number } {
  const result: { [key: string]: number } = {};
  const n = ids.length;
  if (n === 0) return result;

  const base = Math.floor(100 / n);
  const remainder = 100 - base * n;
  ids.forEach((id, i) => {
    result[id] = base + (i < remainder ? 1 : 0);
  });
  return result;
}

export function percentagesSumTo100(
  percentages: { [key: string]: number } | undefined
): boolean {
  const total = Object.values(percentages || {}).reduce((sum, p) => sum + (p || 0), 0);
  return Math.abs(total - 100) < 0.01;
}
