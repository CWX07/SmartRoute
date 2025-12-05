// main.js
// Responsibilities: bootstrap app, wire UI + data loaders, set shared globals.

(function () {
  var ui = window.MainUI || {};
  var loaders = window.MainLoaders || {};

  // Backend base URL for data + AI model
  window.API_BASE = window.API_BASE || "https://smartroute-server.onrender.com";

  // Ensure aliases/normalize are present (config/aliases.js)
  window.ROUTE_ID_ALIAS = window.ROUTE_ID_ALIAS || {};
  if (!window.normalizeRouteId) {
    window.normalizeRouteId = function (rid) {
      if (!rid) return null;
      var id = String(rid).trim().toUpperCase();
      if (window.ROUTE_ID_ALIAS && window.ROUTE_ID_ALIAS[id]) {
        return window.ROUTE_ID_ALIAS[id];
      }
      return id;
    };
  }

  window.stationMarkersByRoute = window.stationMarkersByRoute || {};
  window.routeLines = window.routeLines || {};
  window.activeLineRoutes = window.activeLineRoutes || new Set();
  window.routingMode = window.routingMode || "fastest";
  window.FareModel = window.FareModel || null;
  window.getWalkingThreshold =
    window.getWalkingThreshold ||
    function () {
      return window.routingMode === "eco-friendly" ? 2000 : 300;
    };

  function init() {
    console.log("[Main] Initializing KL Transportation System");

    if (!window.map) {
      console.error("[Main] Map not initialized!");
      if (ui.setInfo) ui.setInfo("Map initialization failed");
      return;
    }

    if (typeof window.getRouteColor !== "function") {
      console.error("[Main] getRouteColor not available!");
      if (ui.setInfo) ui.setInfo("Color helper not initialized");
      return;
    }

    var preloadTasks = [];

    if (window.Crowd && typeof window.Crowd.loadPassengerData === "function") {
      preloadTasks.push(window.Crowd.loadPassengerData());
    }

    if (typeof loaders.loadGTFSData === "function") {
      preloadTasks.push(loaders.loadGTFSData());
    }

    if (typeof loaders.loadFareTable === "function") {
      preloadTasks.push(loaders.loadFareTable());
    }

    if (typeof loaders.loadFareModel === "function") {
      preloadTasks.push(loaders.loadFareModel());
    }

    Promise.all(preloadTasks).then(function () {
      if (typeof loaders.loadStations === "function") loaders.loadStations();
      if (typeof ui.setupLineButtons === "function") ui.setupLineButtons();
      if (typeof ui.setupModeButtons === "function") ui.setupModeButtons();
    });
  }

  window.toggleAllLines = ui.toggleAllLines;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
