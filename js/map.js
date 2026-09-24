// Everything that touches the Leaflet map. `L` is a global from the <script> tag in index.html.
import { isStale } from './utils/time.js';

let map = null;
let myMarker = null;
let accuracyCircle = null;
const otherMarkers = {}; // everyone else's marker, keyed by their user ID

export function initMap() {
  map = L.map('map').setView([9.0820, 8.6753], 6); // default: center of Nigeria

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
    maxNativeZoom: 17 // Esri often has no real imagery past this zoom; this zooms into the last available tile instead of showing blanks
  }).addTo(map);
}

// Move (or create) MY marker and the blue accuracy circle around it
export function updateMyPosition(lat, lng, accuracy) {
  if (!myMarker) {
    myMarker = L.marker([lat, lng]).addTo(map);
    accuracyCircle = L.circle([lat, lng], { radius: accuracy, color: '#3388ff', fillOpacity: 0.1 }).addTo(map);
    map.setView([lat, lng], 16); // first fix: jump to where I am
  } else {
    myMarker.setLatLng([lat, lng]);
    accuracyCircle.setLatLng([lat, lng]);
    accuracyCircle.setRadius(accuracy);
  }
}

// Used by the sidebar: tap a person, map flies to them
export function focusOn(lat, lng) {
  map.setView([lat, lng], 16);
}

// The little name tag shown on the map. Red = normal, flashing red = SOS, grey = offline.
function buildIconHtml(person, isSos, stale) {
  const name = person.name || 'Unknown';
  if (isSos) {
    return `<div class="sos-icon-wrapper"><div style="background:#c0392b;color:white;padding:3px 10px;border-radius:10px;font-size:12px;white-space:nowrap;font-weight:bold;">🆘 ${name}</div></div>`;
  }
  if (stale) {
    return `<div style="background:#95a5a6;color:white;padding:2px 8px;border-radius:10px;font-size:12px;white-space:nowrap;opacity:0.7;">⚠️ ${name}</div>`;
  }
  return `<div style="background:#e74c3c;color:white;padding:2px 8px;border-radius:10px;font-size:12px;white-space:nowrap;">${name}</div>`;
}

// Draw / move / remove everyone else's markers to match the database
export function updateOtherMarkers(allLocations, myId) {
  Object.keys(allLocations).forEach((id) => {
    if (id === myId) return; // my own marker is drawn by updateMyPosition

    const person = allLocations[id];
    if (!person || typeof person.lat !== 'number' || typeof person.lng !== 'number') return;

    const icon = L.divIcon({
      className: 'other-user-icon',
      html: buildIconHtml(person, !!person.sos, isStale(person.timestamp)),
      iconSize: null
    });

    if (otherMarkers[id]) {
      otherMarkers[id].setLatLng([person.lat, person.lng]);
      otherMarkers[id].setIcon(icon);
    } else {
      otherMarkers[id] = L.marker([person.lat, person.lng], { icon }).addTo(map);
    }
  });

  // Remove markers for anyone no longer in the database
  Object.keys(otherMarkers).forEach((id) => {
    if (!allLocations[id]) {
      map.removeLayer(otherMarkers[id]);
      delete otherMarkers[id];
    }
  });
}
