// My GPS: read it, show it on the map, push it to Firebase.
// Plus the live feed of everyone's locations.
import { db } from './firebase.js';
import { getUserId, getUserName } from './session.js';
import { updateMyPosition } from './map.js';

let lastLat = null;
let lastLng = null;
const positionListeners = []; // other files (like the treasure hunt) can ask "tell me when I move"

// Other files use this instead of reading lastLat/lastLng directly
export function getLastPosition() {
  return lastLat === null ? null : { lat: lastLat, lng: lastLng };
}

export function onPosition(callback) {
  positionListeners.push(callback);
}

export function startLocationSharing() {
  const statusEl = document.getElementById('status');

  if (!navigator.geolocation) {
    statusEl.textContent = 'Geolocation not supported by this browser.';
    return;
  }

  navigator.geolocation.watchPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy; // in meters

      statusEl.textContent = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} (±${Math.round(accuracy)}m)`;
      updateMyPosition(lat, lng, accuracy);

      lastLat = lat;
      lastLng = lng;
      db.ref('locations/' + getUserId()).set({
        name: getUserName(),
        lat: lat,
        lng: lng,
        timestamp: Date.now()
      });

      positionListeners.forEach((callback) => callback(lat, lng));
    },
    (error) => {
      statusEl.textContent = 'Location error: ' + error.message;
      console.error(error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 25000
    }
  );

  // Heartbeat: refresh our timestamp every 15s even if we haven't moved,
  // so family always sees a fresh "last seen" while this tab stays open.
  setInterval(() => {
    if (lastLat !== null && lastLng !== null) {
      db.ref('locations/' + getUserId()).update({ timestamp: Date.now() });
    }
  }, 15000);
}

// Live feed of EVERYONE's location (including mine). Calls back on every change.
export function listenToFamily(callback) {
  db.ref('locations').on('value', (snapshot) => {
    callback(snapshot.val() || {});
  });
}
