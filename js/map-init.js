// map-init.js
// Responsibilities: glue map base + colors + shared markers.
(function () {
  if (typeof L === "undefined") {
    console.error("[Map Init] Leaflet library not loaded (L is undefined)");
    window.getRouteColor =
      window.getRouteColor ||
      function () {
        return "#54c1ff";
      };
    return;
  }

  window.startIcon = L.divIcon({
    className: "marker marker--start",
    html: '<span class="marker-arrow"></span>',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  window.destIcon = L.divIcon({
    className: "marker marker--dest",
    html: '<span class="marker-arrow"></span>',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  window.startMarker = null;
  window.destMarker = null;
  window.routeLayer = null;
  window.stationMarkers = [];
  window.routeLayers = [];
  window.grabLayers = [];
  window.stations = window.stations || [];

  console.log("[Map Init] Markers ready");
})();
