// Initialize the map
let map = L.map('map').setView([0, 0], 2); // Default view (center of the world)

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors',
}).addTo(map);

// Function to get the user's location
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        console.log("Detected Latitude:", lat);
        console.log("Detected Longitude:", lon);
        // Center the map on the user's location
        map.setView([lat, lon], 14);

        // Add marker with reverse geocoding
        addUserLocationMarker(lat, lon);

        // Find nearby mosques
        findNearbyMosques([lat, lon]);
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

// Function to add a marker for the user's location with reverse geocoding
function addUserLocationMarker(lat, lon) {
  const userLocation = [lat, lon];

  // Fetch the location name using Nominatim
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const locationName = data.display_name || "Your Location";
      const marker = L.marker(userLocation, { draggable: true })
        .addTo(map)
        .bindPopup(`You are here: <br>${locationName}`)
        .openPopup();

      // Allow user to adjust their location by dragging the marker
      marker.on("dragend", function (event) {
        const adjustedLocation = event.target.getLatLng();
        findNearbyMosques([adjustedLocation.lat, adjustedLocation.lng]);
      });
    })
    .catch((error) => {
      console.error("Error fetching location name:", error);
      L.marker(userLocation, { draggable: true })
        .addTo(map)
        .bindPopup("You are here")
        .openPopup();
    });
}

// Function to search for nearby mosques using Overpass API
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

// Function to display mosques on the map and in a list
function displayMosques(mosques) {
  const mosqueList = document.getElementById("mosque-list");
  mosqueList.innerHTML = ""; // Clear previous list items

  mosques.forEach((mosque) => {
    const { lat, lon, tags } = mosque;
    const name = tags.name || "Unnamed Mosque";

    // Add a marker on the map
    L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`<strong>${name}</strong>`);

    // Add to the list view
    const listItem = document.createElement("li");
    listItem.innerHTML = `<strong>${name}</strong>`;
    mosqueList.appendChild(listItem);
  });
}

// Function to search for a location manually (optional)
function searchLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (data.length > 0) {
        const { lat, lon } = data[0];
        map.setView([lat, lon], 14);
        addUserLocationMarker(lat, lon);
      } else {
        alert("Location not found. Please try again.");
      }
    })
    .catch((error) => {
      console.error("Error searching location:", error);
    });
}

// Event listener for the "Find Nearest Mosques" button
document.getElementById("getLocationBtn").addEventListener("click", getUserLocation);
