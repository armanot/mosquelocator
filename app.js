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
  const url = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];(node["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${lat},${lon}););out body;`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (!data.elements || data.elements.length === 0) {
        alert("No mosques found nearby.");
        return;
      }

      // Display mosques on the map and list
      displayMosques(data.elements);
    })
    .catch((error) => {
      console.error("Error fetching mosques:", error);
    });
}

// Display mosques with distance
function displayMosques(mosques) {
  const mosqueList = document.getElementById("mosque-list");
  mosqueList.innerHTML = ""; // Clear previous list items

  // Calculate distance for each mosque and add it to the object
  const mosquesWithDistance = mosques.map((mosque) => {
    const { lat, lon } = mosque;
    const distance = calculateDistance(userLocation[0], userLocation[1], lat, lon);
    return { ...mosque, distance }; // Add distance to each mosque object
  });

  // Sort mosques by distance (ascending)
  mosquesWithDistance.sort((a, b) => a.distance - b.distance);

  // Display each mosque in the sorted order
  mosquesWithDistance.forEach((mosque) => {
    const { lat, lon, tags, distance } = mosque;
    const name = tags.name || "Unnamed Mosque";

    // Add a marker on the map
    L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`<strong>${name}</strong><br>Distance: ${distance.toFixed(2)} km`);

    // Add to the list view
    const listItem = document.createElement("li");
    listItem.innerHTML = `<strong>${name}</strong><br>Distance: ${distance.toFixed(2)} km`;
    mosqueList.appendChild(listItem);
  });
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

// Add event listener to the button
document.getElementById("getLocationBtn").addEventListener("click", getUserLocation);
