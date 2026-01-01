// Calculate distance using Haversine formula (in meters)
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance); // Return distance in meters
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

export function isWithinRadius(lat1, lon1, lat2, lon2, radiusM) {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return distance <= radiusM;
}

export function getPriority(distance, dangerRadiusM, warningRadiusM) {
  if (distance <= dangerRadiusM) {
    return 'DANGER';
  } else if (distance <= warningRadiusM) {
    return 'WARNING';
  }
  return null;
}
