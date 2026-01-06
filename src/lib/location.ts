/**
 * Location & GPS Calculation Utilities
 *
 * Provides functions for calculating speed, direction (bearing),
 * distance, and motion state based on GPS coordinates.
 */

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;
// Earth's radius in miles
const EARTH_RADIUS_MILES = 3959;

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate the bearing (direction) between two coordinates
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRadians(lon2 - lon1);

  const y =
    Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.cos(dLon);

  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360; // Normalize to 0-360

  return bearing;
}

/**
 * Get compass direction from bearing
 * @param bearing Bearing in degrees (0-360)
 * @returns Compass direction string (e.g., "N", "NE", "E", "SE", "S", "SW", "W", "NW")
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Calculate speed from distance and time
 * @param distanceKm Distance in kilometers
 * @param timeMs Time elapsed in milliseconds
 * @returns Speed object with km/h and mph
 */
export function calculateSpeed(
  distanceKm: number,
  timeMs: number
): { kmh: number; mph: number } {
  if (timeMs === 0) return { kmh: 0, mph: 0 };

  const hours = timeMs / (1000 * 60 * 60);
  const speedKmh = distanceKm / hours;
  const speedMph = speedKmh * 0.621371;

  return {
    kmh: Math.round(speedKmh * 10) / 10,
    mph: Math.round(speedMph * 10) / 10,
  };
}

/**
 * Determine motion state based on speed
 * @param speedKmh Speed in km/h
 * @returns Motion state (stationary, walking, driving, unknown)
 */
export function determineMotionState(speedKmh: number | null): string {
  if (speedKmh === null || speedKmh === undefined || isNaN(speedKmh)) {
    return 'UNKNOWN';
  }

  if (speedKmh < 2) {
    return 'STATIONARY';
  } else if (speedKmh < 10) {
    return 'WALKING';
  } else {
    return 'DRIVING';
  }
}

/**
 * Calculate all location data between two points
 * @param prevLat Previous latitude
 * @param prevLon Previous longitude
 * @param newLat New latitude
 * @param newLon New longitude
 * @param timeElapsed Time elapsed in milliseconds
 * @returns Complete location calculations
 */
export interface LocationCalculations {
  distanceKm: number;
  distanceMiles: number;
  speed: { kmh: number; mph: number };
  bearing: number;
  compassDirection: string;
  motionState: string;
}

export function calculateLocationData(
  prevLat: number | null,
  prevLon: number | null,
  newLat: number,
  newLon: number,
  timeElapsed: number | null
): LocationCalculations {
  // If no previous position, return default values
  if (prevLat === null || prevLon === null) {
    return {
      distanceKm: 0,
      distanceMiles: 0,
      speed: { kmh: 0, mph: 0 },
      bearing: 0,
      compassDirection: 'N',
      motionState: 'UNKNOWN',
    };
  }

  // Calculate distance
  const distanceKm = calculateDistance(prevLat, prevLon, newLat, newLon);
  const distanceMiles = distanceKm * 0.621371;

  // Calculate speed
  let speed = { kmh: 0, mph: 0 };
  if (timeElapsed && timeElapsed > 0) {
    speed = calculateSpeed(distanceKm, timeElapsed);
  }

  // Calculate bearing
  const bearing = calculateBearing(prevLat, prevLon, newLat, newLon);
  const compassDirection = getCompassDirection(bearing);

  // Determine motion state
  const motionState = determineMotionState(speed.kmh);

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    distanceMiles: Math.round(distanceMiles * 100) / 100,
    speed,
    bearing,
    compassDirection,
    motionState,
  };
}

/**
 * Validate GPS coordinates
 * @param latitude Latitude
 * @param longitude Longitude
 * @returns True if coordinates are valid
 */
export function isValidCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return false;
  }

  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Format coordinates for display
 * @param latitude Latitude
 * @param longitude Longitude
 * @returns Formatted coordinate string
 */
export function formatCoordinates(
  latitude: number,
  longitude: number
): string {
  const latDirection = latitude >= 0 ? 'N' : 'S';
  const lonDirection = longitude >= 0 ? 'E' : 'W';

  const latAbs = Math.abs(latitude).toFixed(6);
  const lonAbs = Math.abs(longitude).toFixed(6);

  return `${latAbs}° ${latDirection}, ${lonAbs}° ${lonDirection}`;
}

/**
 * Calculate the center point of multiple coordinates
 * @param coordinates Array of {lat, lon} objects
 * @returns Center point {lat, lon}
 */
export interface Coordinate {
  lat: number;
  lon: number;
}

export function calculateCenterPoint(coordinates: Coordinate[]): {
  lat: number;
  lon: number;
} {
  if (coordinates.length === 0) {
    return { lat: 0, lon: 0 };
  }

  if (coordinates.length === 1) {
    return { lat: coordinates[0].lat, lon: coordinates[0].lon };
  }

  let x = 0;
  let y = 0;
  let z = 0;

  for (const coord of coordinates) {
    const lat = toRadians(coord.lat);
    const lon = toRadians(coord.lon);

    x += Math.cos(lat) * Math.cos(lon);
    y += Math.cos(lat) * Math.sin(lon);
    z += Math.sin(lat);
  }

  x /= coordinates.length;
  y /= coordinates.length;
  z /= coordinates.length;

  const lon = Math.atan2(y, x);
  const hyp = Math.sqrt(x * x + y * y);
  const lat = Math.atan2(z, hyp);

  return {
    lat: toDegrees(lat),
    lon: toDegrees(lon),
  };
}

/**
 * Calculate bounding box for coordinates
 * @param coordinates Array of {lat, lon} objects
 * @returns Bounding box {minLat, maxLat, minLon, maxLon}
 */
export function calculateBoundingBox(
  coordinates: Coordinate[]
): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  if (coordinates.length === 0) {
    return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
  }

  const lats = coordinates.map(c => c.lat);
  const lons = coordinates.map(c => c.lon);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };
}

/**
 * Add padding to bounding box (for map view)
 * @param bounds Bounding box
 * @param paddingFactor Padding factor (0.1 = 10% padding)
 * @returns Padded bounding box
 */
export function padBoundingBox(
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  },
  paddingFactor: number = 0.1
): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  const latPadding = (bounds.maxLat - bounds.minLat) * paddingFactor;
  const lonPadding = (bounds.maxLon - bounds.minLon) * paddingFactor;

  return {
    minLat: bounds.minLat - latPadding,
    maxLat: bounds.maxLat + latPadding,
    minLon: bounds.minLon - lonPadding,
    maxLon: bounds.maxLon + lonPadding,
  };
}
