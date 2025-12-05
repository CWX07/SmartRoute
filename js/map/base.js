// map/base.js
// Responsibilities: initialize Leaflet map with tile layer. Safely handles missing Leaflet.
(function () {
  if (typeof L === "undefined") {
    console.error("[Map Init] Leaflet library not loaded (L is undefined)");
    window.mapReady = false;
    window.getRouteColor =
      window.getRouteColor ||
      function () {
        return "#54c1ff";
      };
    return;
  }

  window.mapReady = true;
  window.map = L.map("map").setView([3.139, 101.686], 12);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap, ©CartoDB",
    maxZoom: 19,
  }).addTo(window.map);

  console.log("[Map Init] Map initialized and ready");
})();
