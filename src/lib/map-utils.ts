/**
 * Map Utilities
 *
 * Helper functions for Leaflet map operations
 */

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Create custom device marker icon with direction arrow
 */
export function createDeviceMarkerIcon(
  heading: number | null,
  color: string = '#3b82f6'
): any {
  // Convert heading to rotation angle
  const rotation = heading || 0;

  // Create SVG marker icon
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" style="transform: rotate(${rotation}deg)">
      <path
        fill="${color}"
        d="M16 0 C7.16 0 0 7.16 0 16 C0 24.84 7.16 32 16 32 C24.84 32 32 24.84 32 16 C32 7.16 24.84 0 16 16 0 Z M16 24 C12.69 24 10 21.31 10 18 C10 14.69 12.69 12 16 12 C19.31 12 22 14.69 22 18 C22 21.31 19.31 24 16 24 Z"
      />
      <path
        fill="#ffffff"
        d="M16 4 L20 12 L16 10 L12 12 Z"
      />
    </svg>
  `;

  return {
    html: svgContent,
    className: 'custom-device-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  };
}

/**
 * Get marker color based on motion state
 */
export function getMotionStateColor(motionState: string | null): string {
  switch (motionState) {
    case 'DRIVING':
      return '#22c55e'; // green
    case 'WALKING':
      return '#eab308'; // yellow
    case 'STATIONARY':
      return '#6b7280'; // gray
    default:
      return '#9ca3af'; // gray-400
  }
}

/**
 * Calculate map bounds from array of coordinates
 */
export function calculateMapBounds(
  latitudes: number[],
  longitudes: number[]
): [[number, number], [number, number]] | null {
  if (latitudes.length === 0 || longitudes.length === 0) {
    return null;
  }

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return [
    [minLat, minLng], // Southwest
    [maxLat, maxLng], // Northeast
  ];
}

/**
 * Add padding to map bounds
 */
export function padMapBounds(
  bounds: [[number, number], [number, number]],
  paddingFactor: number = 0.1
): [[number, number], [number, number]] {
  const [[minLat, minLng], [maxLat, maxLng]] = bounds;
  const latPadding = (maxLat - minLat) * paddingFactor;
  const lngPadding = (maxLng - minLng) * paddingFactor;

  return [
    [minLat - latPadding, minLng - lngPadding],
    [maxLat + latPadding, maxLng + lngPadding],
  ];
}

/**
 * Default map center (global)
 */
export const DEFAULT_CENTER = [40.7128, -74.0060] as [number, number]; // New York

/**
 * Default zoom level
 */
export const DEFAULT_ZOOM = 13;

/**
 * Minimum zoom level
 */
export const MIN_ZOOM = 2;

/**
 * Maximum zoom level
 */
export const MAX_ZOOM = 19;

/**
 * OpenStreetMap tile layer URL
 */
export const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * Tile layer attribution
 */
export const TILE_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Convert speed to display string
 */
export function formatSpeed(speedKmh: number | null): string {
  if (speedKmh === null || speedKmh === undefined) {
    return 'N/A';
  }
  return `${speedKmh.toFixed(1)} km/h`;
}

/**
 * Convert motion state to display string
 */
export function formatMotionState(state: string | null): string {
  switch (state) {
    case 'DRIVING':
      return 'Driving';
    case 'WALKING':
      return 'Walking';
    case 'STATIONARY':
      return 'Stationary';
    default:
      return 'Unknown';
  }
}

/**
 * Create popup content for device marker
 */
export function createDevicePopupContent(device: {
  name: string;
  deviceId: string;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number | null;
  heading: number | null;
  motionState: string | null;
  lastSeen: string | null;
}): string {
  return `
    <div class="device-popup">
      <h3 class="font-semibold text-lg">${device.name}</h3>
      <p class="text-sm text-muted-foreground">${device.deviceId}</p>
      <div class="mt-2 space-y-1">
        <div class="flex justify-between">
          <span class="text-sm text-muted-foreground">Status:</span>
          <span class="text-sm font-medium">${formatMotionState(device.motionState)}</span>
        </div>
        ${device.speedKmh !== null ? `
          <div class="flex justify-between">
            <span class="text-sm text-muted-foreground">Speed:</span>
            <span class="text-sm font-medium">${formatSpeed(device.speedKmh)}</span>
          </div>
        ` : ''}
        ${device.heading !== null ? `
          <div class="flex justify-between">
            <span class="text-sm text-muted-foreground">Heading:</span>
            <span class="text-sm font-medium">${device.heading.toFixed(0)}°</span>
          </div>
        ` : ''}
        ${device.lastSeen ? `
          <div class="flex justify-between">
            <span class="text-sm text-muted-foreground">Last Seen:</span>
            <span class="text-sm font-medium">${new Date(device.lastSeen).toLocaleString()}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}
