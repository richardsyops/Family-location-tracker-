// Distance and direction maths. Pure functions: no page, map or Firebase code in here.

// Straight-line distance between two GPS points, in meters
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 850 -> "850m", 2300 -> "2.3km"
export function formatDistance(meters) {
  if (meters < 1000) return Math.round(meters) + 'm';
  return (meters / 1000).toFixed(1) + 'km';
}

// Which compass direction point 2 is from point 1: N, NE, E, SE, S, SW, W, NW
export function bearingDirection(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => deg * Math.PI / 180;
  const toDeg = (rad) => rad * 180 / Math.PI;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(bearing / 45) % 8];
}
