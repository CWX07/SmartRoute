// map-init.js

window.map = L.map("map").setView([3.139, 101.686], 12);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap, ©CartoDB",
  maxZoom: 19,
}).addTo(window.map);

var ROUTE_COLORS = {
  AG: "#e57200",
  PH: "#7C3F00",
  KJ: "#D50032",
  MR: "#84bd00",
  MRT: "#047940",
  PYL: "#FFCD00",
  BRT: "#115740",
};

window.getRouteColor = function (routeId) {
  if (!routeId) return "#54c1ff";
  return ROUTE_COLORS[routeId] || "#54c1ff";
};

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
window.stations = [];

console.log("[Map Init] Map initialized and ready");
