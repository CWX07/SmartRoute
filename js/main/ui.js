// main/ui.js
// Responsibilities: info banner + line/mode toggles.
(function () {
  var dom = window.MainDom || {};

  function setInfo(msg) {
    if (dom.infoEl) dom.infoEl.textContent = msg;
    console.log("[Main]", msg);
  }

  function toggleRouteLine(routeId, buttonEl) {
    var line = window.routeLines && window.routeLines[routeId];
    var markers = (window.stationMarkersByRoute && window.stationMarkersByRoute[routeId]) || [];
    if (!line) return;
    var isActive = window.activeLineRoutes.has(routeId);
    if (isActive) {
      if (window.map && typeof window.map.removeLayer === "function") {
        window.map.removeLayer(line);
      }
      window.activeLineRoutes.delete(routeId);
      if (buttonEl) buttonEl.classList.remove("pill--active");
      markers.forEach(function (marker) {
        if (window.map && typeof window.map.hasLayer === "function" && window.map.hasLayer(marker)) {
          window.map.removeLayer(marker);
        }
      });
    } else {
      if (typeof line.addTo === "function") line.addTo(window.map);
      window.activeLineRoutes.add(routeId);
      if (buttonEl) buttonEl.classList.add("pill--active");
      markers.forEach(function (marker) {
        if (typeof marker.addTo === "function") marker.addTo(window.map);
      });
    }
  }

  function setupLineButtons() {
    var container = dom.lineButtonsContainer;
    if (!container) {
      console.warn("[Main] Line buttons container not found");
      return;
    }

    if (typeof window.getRouteColor !== "function") {
      console.warn("[Main] window.getRouteColor not available yet, retrying...");
      setTimeout(setupLineButtons, 100);
      return;
    }

    var buttons = container.querySelectorAll(".pill");
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
    var container = dom.modeButtonsContainer;
    if (!container) {
      console.warn("[Main] Mode buttons container not found");
      return;
    }

    var buttons = container.querySelectorAll(".mode-pill");

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
          "eco-friendly": "Route mode: Eco-Friendly (walks up to 2km for sustainability)",
        };
        setInfo(modeMessages[mode] || "Route mode changed");

        if (window.startMarker && window.destMarker) {
          console.log("[Main] Auto-recalculating route for new mode");
          setTimeout(function () {
            if (window.InputHandler && typeof window.InputHandler.handleRoute === "function") {
              window.InputHandler.handleRoute();
            }
          }, 100);
        }
      });
    });

    console.log("[Main] Mode buttons initialized");
  }

  function toggleAllLines(shouldActivate) {
    if (!window.routeLines) return;
    Object.keys(window.routeLines).forEach(function (routeId) {
      var isActive = window.activeLineRoutes.has(routeId);
      var shouldBeActive = shouldActivate;

      if (isActive !== shouldBeActive) {
        var buttons = dom.lineButtonsContainer
          ? dom.lineButtonsContainer.querySelectorAll(".pill")
          : [];
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

  window.MainUI = {
    setInfo: setInfo,
    toggleRouteLine: toggleRouteLine,
    setupLineButtons: setupLineButtons,
    setupModeButtons: setupModeButtons,
    toggleAllLines: toggleAllLines,
  };
})();
