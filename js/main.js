// main.js

(function () {
  var infoEl = document.getElementById("info");
  var lineButtonsContainer = document.getElementById("lineButtons");
  var modeButtonsContainer = document.getElementById("modeButtons");
  window.stationMarkersByRoute = {};
  window.routeLines = {};
  window.activeLineRoutes = new Set();
  window.routingMode = "fastest";

  function setInfo(msg) {
    if (infoEl) infoEl.textContent = msg;
    console.log("[Main]", msg);
  }

  function toggleRouteLine(routeId, buttonEl) {
    var line = window.routeLines && window.routeLines[routeId];
    var markers = window.stationMarkersByRoute[routeId] || [];
    if (!line) return;
    var isActive = window.activeLineRoutes.has(routeId);
    if (isActive) {
      map.removeLayer(line);
      window.activeLineRoutes.delete(routeId);
      if (buttonEl) buttonEl.classList.remove("pill--active");
      markers.forEach(function (marker) {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      });
    } else {
      line.addTo(map);
      window.activeLineRoutes.add(routeId);
      if (buttonEl) buttonEl.classList.add("pill--active");
      markers.forEach(function (marker) {
        marker.addTo(map);
      });
    }
  }

  function setupLineButtons() {
    if (!lineButtonsContainer) {
      console.warn("[Main] Line buttons container not found");
      return;
    }

    if (typeof window.getRouteColor !== "function") {
      console.warn(
        "[Main] window.getRouteColor not available yet, retrying..."
      );
      setTimeout(setupLineButtons, 100);
      return;
    }

    var buttons = lineButtonsContainer.querySelectorAll(".pill");
    buttons.forEach(function (btn) {
      var routeId = btn.getAttribute("data-route-id");
      if (!routeId) return;

      var color = window.getRouteColor(routeId);
      btn.style.setProperty("--pill-color", color || "var(--accent)");
      btn.addEventListener("click", function () {
        toggleRouteLine(routeId, btn);
      });
    });

    console.log("[Main] Line buttons initialized");
  }

  function setupModeButtons() {
    if (!modeButtonsContainer) {
      console.warn("[Main] Mode buttons container not found");
      return;
    }

    var buttons = modeButtonsContainer.querySelectorAll(".mode-pill");

    buttons.forEach(function (btn) {
      if (btn.getAttribute("data-mode") === "fastest") {
        btn.classList.add("mode-pill--active");
      }
    });

    buttons.forEach(function (btn) {
      var mode = btn.getAttribute("data-mode");
      if (!mode) return;

      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          b.classList.remove("mode-pill--active");
        });

        btn.classList.add("mode-pill--active");

        window.routingMode = mode;
        console.log("[Main] Routing mode changed to:", mode);

        var modeMessages = {
          fastest: "Route mode: Fastest (minimizes travel time)",
          shortest: "Route mode: Shortest (minimizes distance)",
          cheapest: "Route mode: Cheapest (walks up to 1km, minimizes fare)",
          comfort: "Route mode: Comfort (avoids crowded stations)",
          "eco-friendly":
            "Route mode: Eco-Friendly (walks up to 2km for sustainability)",
        };
        setInfo(modeMessages[mode] || "Route mode changed");

        // Auto-recalculate if route already exists
        if (window.startMarker && window.destMarker) {
          console.log("[Main] Auto-recalculating route for new mode");
          setTimeout(function () {
            if (
              window.InputHandler &&
              typeof window.InputHandler.handleRoute === "function"
            ) {
              window.InputHandler.handleRoute();
            }
          }, 100);
        }
      });
    });

    console.log("[Main] Mode buttons initialized");
  }

  function toggleAllLines(shouldActivate) {
    Object.keys(window.routeLines).forEach(function (routeId) {
      var isActive = window.activeLineRoutes.has(routeId);
      var shouldBeActive = shouldActivate;

      if (isActive !== shouldBeActive) {
        var buttons = lineButtonsContainer.querySelectorAll(".pill");
        var buttonEl = null;
        buttons.forEach(function (btn) {
          if (btn.getAttribute("data-route-id") === routeId) {
            buttonEl = btn;
          }
        });
        toggleRouteLine(routeId, buttonEl);
      }
    });
  }

  function loadStations() {
    setInfo("Loading stations...");

    fetch("datasets/station.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load station data");
        return res.json();
      })
      .then(function (data) {
        window.stations = data;
        setInfo("Stations loaded (" + data.length + " stations)");

        window.stationMarkersByRoute = {};
        window.routeLines = {};
        window.activeLineRoutes = new Set();

        if (typeof window.buildStationGraph === "function") {
          window.buildStationGraph(window.stations);
          console.log("[Main] Station graph built");
        }

        var routeGroups = {};

        data.forEach(function (station) {
          if (
            typeof station.lat !== "number" ||
            typeof station.lng !== "number"
          )
            return;

          var routeId = station.route_id || "OTHER";
          if (!routeGroups[routeId]) routeGroups[routeId] = [];
          routeGroups[routeId].push(station);

          var crowdLevel = station.crowd || 0;
          var color =
            typeof window.getRouteColor === "function"
              ? window.getRouteColor(routeId)
              : "#54c1ff";
          var radius = 4 + Math.min(crowdLevel * 10, 6);

          var marker = L.circleMarker([station.lat, station.lng], {
            radius: radius,
            color: color,
            fillColor: color,
            fillOpacity: 0.6,
            weight: 2,
          }).bindPopup(
            (station.name || station.id) +
              "<br>Crowd: " +
              ((crowdLevel || 0) * 100).toFixed(1) +
              "%" +
              "<br>Route: " +
              (station.route_id || "N/A")
          );

          if (!window.stationMarkersByRoute[routeId]) {
            window.stationMarkersByRoute[routeId] = [];
          }
          window.stationMarkersByRoute[routeId].push(marker);
        });

        Object.keys(routeGroups).forEach(function (routeId) {
          var stations = routeGroups[routeId].slice().sort(function (a, b) {
            var ma = a.id && a.id.match(/\d+/);
            var mb = b.id && b.id.match(/\d+/);
            var numA = ma ? parseInt(ma[0], 10) : NaN;
            var numB = mb ? parseInt(mb[0], 10) : NaN;
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return (a.id || "").localeCompare(b.id || "");
          });
          if (stations.length < 2) return;
          var latlngs = stations.map(function (s) {
            return [s.lat, s.lng];
          });
          var polyline = L.polyline(latlngs, {
            color:
              typeof window.getRouteColor === "function"
                ? window.getRouteColor(routeId)
                : "#54c1ff",
            weight: 5,
            opacity: 0.85,
            dashArray: "12,8",
            lineJoin: "round",
            lineCap: "round",
          });
          window.routeLines[routeId] = polyline;
        });

        toggleAllLines(true);
        console.log("[Main] Station markers rendered");

        if (window.Crowd) {
          window.Crowd.startHourlyUpdates();
        }

        if (
          window.InputHandler &&
          typeof window.InputHandler.init === "function"
        ) {
          window.InputHandler.init();
        } else {
          console.warn("[Main] InputHandler not available");
        }
      })
      .catch(function (err) {
        console.error("[Main] Error loading stations:", err);
        setInfo("Failed to load stations");
      });
  }

  function init() {
    console.log("[Main] Initializing KL Transportation System");

    if (!window.map) {
      console.error("[Main] Map not initialized!");
      setInfo("Map initialization failed");
      return;
    }

    if (typeof window.getRouteColor !== "function") {
      console.error("[Main] getRouteColor not available!");
      setInfo("Color helper not initialized");
      return;
    }

    if (window.Crowd) {
      window.Crowd.loadPassengerData().then(function () {
        loadStations();
        setupLineButtons();
        setupModeButtons();
      });
    } else {
      loadStations();
      setupLineButtons();
      setupModeButtons();
    }
  }

  window.toggleAllLines = toggleAllLines;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
