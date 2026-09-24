// The entry point. Its only job is to start things in the right order.
import { requireApproval } from './auth.js';
import { setSession } from './session.js';
import { initMap, updateOtherMarkers } from './map.js';
import { startLocationSharing, listenToFamily } from './location.js';

async function start() {
  // 1. The gate. Nothing below runs until the person is logged in AND approved.
  const user = await requireApproval();
  setSession(user);

  // 2. Map, then my GPS
  initMap();
  startLocationSharing();

  // 3. Everyone else on the map
  listenToFamily((allLocations) => {
    updateOtherMarkers(allLocations, user.uid);
    // Batch 3 plugs in here: sidebar list + SOS alerts
  });
}

start();
