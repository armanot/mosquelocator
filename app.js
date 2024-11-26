let map = L.map('map').setView([0, 0], 2); // Default view
let userLocation = [0, 0]; // Default user location

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors',
}).addTo(map);

// Get user's location
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Set user location
        userLocation = [lat, lon];

        // Log user's location
        console.log("Detected Latitude:", lat);
        console.log("Detected Longitude:", lon);

        // Center the map on the user's location
        map.setView(userLocation, 14);

        // Add marker with reverse geocoding
        addUserLocationMarker(lat, lon);

        // Find nearby mosques
        findNearbyMosques(userLocation);
      },
      (error) => {
        alert("Unable to retrieve your location.");
        console.error(error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
}

// Add marker for user's location
function addUserLocationMarker(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const locationName = data.display_name || "Your Location";
      const marker = L.marker([lat, lon], { draggable: true })
        .addTo(map)
        .bindPopup(`You are here: <br>${locationName}`)
        .openPopup();

      // Allow user to adjust location by dragging the marker
      marker.on("dragend", function (event) {
        const adjustedLocation = event.target.getLatLng();
        userLocation = [adjustedLocation.lat, adjustedLocation.lng];
        findNearbyMosques(userLocation);
      });
    })
    .catch((error) => {
      console.error("Error fetching location name:", error);
      L.marker([lat, lon], { draggable: true })
        .addTo(map)
        .bindPopup("You are here")
        .openPopup();
    });
}

// Find nearby mosques using Overpass API
function findNearbyMosques(location) {
  const [lat, lon] = location;
  const url = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];
    (node["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${lat},${lon});
     );out body;`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (!data.elements || data.elements.length === 0) {
        alert("No mosques found nearby.");
        return;
      }

      // Display mosques
      displayMosques(data.elements);
    })
    .catch((error) => {
      console.error("Error fetching mosques:", error);
    });
}

// Display mosques with distance and facilities toggle
async function displayMosques(mosques) {
  const mosqueList = document.getElementById("mosque-list");
  mosqueList.innerHTML = ""; // Clear previous list items

  const mosquesWithDistance = mosques.map((mosque, index) => {
    const { lat, lon } = mosque;
    const distance = calculateDistance(userLocation[0], userLocation[1], lat, lon);
    return { ...mosque, distance, id: index }; // Add an ID for unique collapsible sections
  });

  mosquesWithDistance.sort((a, b) => a.distance - b.distance);

  for (const mosque of mosquesWithDistance) {
    const { lat, lon, tags, distance, id } = mosque;
    const name = tags.name || "Unnamed Mosque";

    // Fetch the address
    const address = await fetchAddress(lat, lon);

    // Add the mosque item
    const listItem = document.createElement("li");
    listItem.innerHTML = `
      <strong>${name}</strong><br>
      Distance: ${distance.toFixed(2)} km<br>
      Address: ${address}<br>
      <a href="https://waze.com/ul?ll=${lat},${lon}&navigate=yes" target="_blank" rel="noopener noreferrer">Open in Waze</a><br>
      <button onclick="toggleFacilities(${id})">▼ Nearby Facilities</button>
      <div id="facilities-${id}" class="collapsible" style="display: none;"></div>
    `;
    mosqueList.appendChild(listItem);

    // Fetch and display nearby facilities
    fetchNearbyFacilities(lat, lon, id);
  }
}

// Calculate the distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = degToRad(lat2 - lat1);
  const dLon = degToRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(lat1)) *
      Math.cos(degToRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Convert degrees to radians
function degToRad(deg) {
  return deg * (Math.PI / 180);
}

// Fetch address using Nominatim API
async function fetchAddress(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.display_name || "Address not available";
  } catch (error) {
    console.error("Error fetching address:", error);
    return "Address not available";
  }
}

// Fetch nearby facilities using Overpass API
function fetchNearbyFacilities(lat, lon, mosqueId) {
  const url = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];
    (node["amenity"="restaurant"](around:1000,${lat},${lon});
     node["shop"="convenience"](around:1000,${lat},${lon});
     node["amenity"="fuel"](around:1000,${lat},${lon});
    );out body;`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (!data.elements || data.elements.length === 0) {
        console.log(`No facilities found near mosque ${mosqueId}.`);
        return;
      }

      // Display facilities
      displayFacilities(mosqueId, data.elements);
    })
    .catch((error) => {
      console.error("Error fetching facilities:", error);
    });
}

// Display facilities in a collapsible section
function displayFacilities(mosqueId, facilities) {
  const collapsibleDiv = document.getElementById(`facilities-${mosqueId}`);
  if (!collapsibleDiv) {
    console.error(`Collapsible div not found for mosque ${mosqueId}`);
    return;
  }

  facilities.forEach((facility) => {
    const { lat, lon, tags } = facility;
    const name = tags.name || capitalize(tags.amenity || tags.shop) || "Unnamed Facility";
    const type = tags.amenity || tags.shop || "Unknown Type";

    // Add facility to the collapsible container
    const facilityItem = document.createElement("div");
    facilityItem.className = "facility-item";
    facilityItem.innerHTML = `
      <strong>${name}</strong> (${capitalize(type)})<br>
      <a href="https://waze.com/ul?ll=${lat},${lon}&navigate=yes" target="_blank" rel="noopener noreferrer">Open in Waze</a>
    `;
    collapsibleDiv.appendChild(facilityItem);
  });
}

// Capitalize the first letter of a string
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Toggle facilities visibility
function toggleFacilities(id) {
  console.log(`Toggling facilities for mosque ${id}`);
  const facilitiesDiv = document.getElementById(`facilities-${id}`);
  if (facilitiesDiv.style.display === "none") {
    facilitiesDiv.style.display = "block"; // Show facilities
  } else {
    facilitiesDiv.style.display = "none"; // Hide facilities
  }
}

// Add event listener to the button
document.getElementById("getLocationBtn").addEventListener("click", getUserLocation);
