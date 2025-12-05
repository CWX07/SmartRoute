// input/route-runner.js
// Responsibilities: orchestrate routing flow, wiring UI events, using shared helpers.
(function () {
  var dom = window.InputDom || {};
  var utils = window.InputUtils || {};
  var summary = window.InputSummary || {};
  var insights = window.InputInsights || {};
  var comfort = window.InputComfort || {};

  var startInput = dom.startInput;
  var destInput = dom.destInput;
  var routeBtn = dom.routeBtn;

  function resolveWalkDistance(from, to) {
    if (window.fetchWalkingDistance) {
      return window.fetchWalkingDistance(from, to);
    }
    return Promise.reject(new Error("fetchWalkingDistance unavailable"));
  }

  function resolveDriveDistance(from, to) {
    if (window.fetchDrivingDistance) {
      return window.fetchDrivingDistance(from, to);
    }
    return Promise.reject(new Error("fetchDrivingDistance unavailable"));
  }

  async function effectiveLegDistance(from, to, thresholdMeters) {
    var walk = await resolveWalkDistance(from, to);
    if (walk > thresholdMeters) {
      try {
        var drive = await resolveDriveDistance(from, to);
        return drive;
      } catch (e) {
        return walk;
      }
    }
    return walk;
  }

  async function handleRoute() {
    var startText = startInput ? startInput.value.trim() : "";
    var destText = destInput ? destInput.value.trim() : "";

    if (!startText || !destText) {
      utils.setInfo("Please enter both start and destination");
      utils.renderInsights([]);
      window.hasPlannedRoute = false;
      return;
    }

    if (window.mapReady === false) {
      utils.setInfo("Map not ready (Leaflet missing)");
      window.hasPlannedRoute = false;
      return;
    }

    if (!window.stations || window.stations.length === 0) {
      utils.setInfo("Station data loading, please wait...");
      utils.renderInsights([]);
      window.hasPlannedRoute = false;
      return;
    }

    if (routeBtn) {
      routeBtn.disabled = true;
      routeBtn.textContent = "Routing...";
    }
    utils.setInfo("Resolving locations...");

    try {
      var mode = window.routingMode || "fastest";
      if (mode !== "comfort") {
        window.currentComfortScore = null;
      }
      if (mode === "comfort") {
        utils.setInfo("Preparing crowd data...");

        var hasCrowdData = window.stations.some(function (s) {
          return s.crowd !== undefined;
        });

        if (!hasCrowdData) {
          console.log("[Input] Loading crowd data for comfort mode...");

          if (window.Crowd) {
            await window.Crowd.loadPassengerData();
            window.Crowd.updateCrowdLevels();
          }
        } else {
          if (window.Crowd && typeof window.Crowd.updateCrowdLevels === "function") {
            window.Crowd.updateCrowdLevels();
          }
        }

        console.log("[Input] Crowd data ready");
      }

      if (typeof window.toggleAllLines === "function") {
        window.toggleAllLines(false);
      }

      utils.setInfo("Finding locations...");
      var startResult = await window.resolveQueryToNearestStation(startText, window.geocodeWithFallback);
      var destResult = await window.resolveQueryToNearestStation(destText, window.geocodeWithFallback);

      if (!startResult || !destResult) {
        utils.setInfo("Could not locate one or both locations");
        utils.renderInsights([]);
        window.hasPlannedRoute = false;
        return;
      }

      var startStation = startResult.station || window.findNearestStation(startResult.coords.lat, startResult.coords.lng);
      var destStation = destResult.station || window.findNearestStation(destResult.coords.lat, destResult.coords.lng);

      if (!startStation || !destStation) {
        utils.setInfo("Could not find nearby transit stations");
        utils.renderInsights([]);
        window.hasPlannedRoute = false;
        return;
      }

      utils.setInfo("Calculating route...");
      var path = window.findPathBetweenStations(startStation, destStation);
      if (!path) {
        utils.setInfo("No transit path found between stations");
        utils.renderInsights([]);
        window.hasPlannedRoute = false;
        return;
      }

      var startObj = { lat: startResult.coords.lat, lng: startResult.coords.lng, name: startText };
      var destObj = { lat: destResult.coords.lat, lng: destResult.coords.lng, name: destText };
      var walkThreshold = window.getWalkingThreshold ? window.getWalkingThreshold() : 300;

      var precomputedRouteData = null;
      if (mode === "cheapest" && window.UnifiedCalc && typeof window.UnifiedCalc.completeRoute === "function") {
        var walkThresholdCheapest =
          window.getWalkingThreshold && typeof window.getWalkingThreshold === "function"
            ? window.getWalkingThreshold()
            : 300;
        var candidateModes = ["cheapest", "fastest", "shortest"];
        var best = { fare: Infinity, path: path, routeData: null };
        var origMode = window.routingMode;

        for (var ci = 0; ci < candidateModes.length; ci++) {
          var m = candidateModes[ci];
          window.routingMode = m;
          var candPath = window.findPathBetweenStations(startStation, destStation);
          if (!candPath) continue;

          var candStartWalk = await effectiveLegDistance(
            startObj,
            { lat: startStation.lat, lng: startStation.lng },
            walkThresholdCheapest
          );
          var candDestWalk = await effectiveLegDistance(
            { lat: destStation.lat, lng: destStation.lng },
            destObj,
            walkThresholdCheapest
          );

          var candRouteData = window.UnifiedCalc.completeRoute(
            candStartWalk,
            candPath,
            candDestWalk,
            walkThresholdCheapest
          );

          var candFare = candRouteData && candRouteData.totals ? candRouteData.totals.fare : Infinity;

          if (candFare < best.fare) {
            best.fare = candFare;
            best.path = candPath;
            best.routeData = candRouteData;
          }
        }

        window.routingMode = origMode;
        if (best.path) path = best.path;
        if (best.routeData) precomputedRouteData = best.routeData;
      }

      var startWalkDist = await effectiveLegDistance(
        startObj,
        { lat: startStation.lat, lng: startStation.lng },
        walkThreshold
      ).catch(function (err) {
        throw new Error("Failed to get start leg distance (OSRM): " + err.message);
      });

      var destWalkDist = await effectiveLegDistance(
        { lat: destStation.lat, lng: destStation.lng },
        destObj,
        walkThreshold
      ).catch(function (err) {
        throw new Error("Failed to get end leg distance (OSRM): " + err.message);
      });
      var routeData =
        precomputedRouteData || window.UnifiedCalc.completeRoute(startWalkDist, path, destWalkDist, walkThreshold);

      // Optional: get realistic driving baseline for CO2 comparison
      try {
        var driveMeters = await resolveDriveDistance(
          { lat: startStation.lat, lng: startStation.lng },
          { lat: destStation.lat, lng: destStation.lng }
        );
        if (driveMeters > 0) {
          routeData.baselineDrivingKm = driveMeters / 1000;
        }
      } catch (e) {
        // fallback handled in computeEmissions
      }

      if (mode === "comfort") {
        await comfort.applyComfortAdjustments(routeData);
      }

      window.drawPublicTransportRoute(startObj, destObj, startStation, destStation, path, routeData);

      summary.buildRouteSummary(startObj, destObj, startStation, destStation, path, startWalkDist, destWalkDist, routeData);

      var insightsList = insights.buildInsights(path, startWalkDist, destWalkDist, routeData);
      utils.renderInsights(insightsList);

      var modeNames = {
        fastest: "Fastest",
        shortest: "Shortest",
        cheapest: "Cheapest",
        comfort: "Comfort",
        "eco-friendly": "Eco-Friendly",
      };

      var summaryMsg = "Route displayed (" + (modeNames[mode] || mode) + ")";
      if (routeData && routeData.totals && routeData.totals.fare > 0) {
        summaryMsg += " • RM " + routeData.totals.fare.toFixed(2);
      }
      utils.setInfo(summaryMsg);

      window.hasPlannedRoute = true;
    } catch (err) {
      console.error("[Input] Error:", err);
      utils.setInfo("Routing failed: " + err.message);
      utils.renderInsights([]);
      window.hasPlannedRoute = false;
    } finally {
      if (routeBtn) {
        routeBtn.disabled = false;
        routeBtn.textContent = "Go";
      }
    }
  }

  if (routeBtn) routeBtn.addEventListener("click", handleRoute);
  if (startInput) {
    startInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleRoute();
    });
  }
  if (destInput) {
    destInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleRoute();
    });
  }

  window.InputHandler = {
    handleRoute: handleRoute,
    init: function () {
      console.log("[Input] InputHandler initialized");
    },
  };
})();
