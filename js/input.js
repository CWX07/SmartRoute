// input.js - FIXED to use calc-unified.js consistently

(function () {
  var startInput = document.getElementById("start");
  var destInput = document.getElementById("dest");
  var routeBtn = document.getElementById("routeBtn");
  var infoEl = document.getElementById("info");
  var insightsList = document.getElementById("insightsList");
  var insightsEmpty = document.getElementById("insightsEmpty");
  var routeSummaryPanel = document.getElementById("routeSummaryPanel");
  var insightsPanel = document.getElementById("insightsPanel");

  function setInfo(msg) {
    if (infoEl) infoEl.textContent = msg;
    console.log("[Input]", msg);
  }

  function formatKm(meters) {
    if (!meters) return "0 km";
    if (meters < 1000) return meters.toFixed(0) + " m";
    return (meters / 1000).toFixed(2) + " km";
  }

  function capitalizeName(name) {
    if (!name) return "";
    return name
      .split(" ")
      .map(function (word) {
        var lower = word.toLowerCase();
        if (
          lower === "and" ||
          lower === "of" ||
          lower === "the" ||
          lower === "at"
        ) {
          return lower;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  }

  function buildRouteSummary(
    start,
    dest,
    startStation,
    destStation,
    path,
    startWalkDist,
    destWalkDist,
    routeData
  ) {
    var summaryContent = document.getElementById("routeSummaryContent");
    if (!summaryContent) return;

    var segments = [];
    var startName = capitalizeName(start.name || "Start");
    var destName = capitalizeName(dest.name || "Destination");
    var startStationName = startStation.name || "Station";
    var destStationName = destStation.name || "Station";

    var walkThreshold = window.getWalkingThreshold ? window.getWalkingThreshold() : 300;

    // Use the complete route calculation
    var calc = window.UnifiedCalc.completeRoute(startWalkDist, path, destWalkDist, walkThreshold);

    // Build segments for display
    for (var i = 0; i < calc.segments.length; i++) {
      var seg = calc.segments[i];
      if (seg.position === 'start') {
        if (seg.type === 'grab') {
          segments.push({
            icon: "🚗",
            text: "<strong>Grab</strong> from " + startName + " to " + startStationName
          });
        } else {
          segments.push({
            icon: "🚶",
            text: "<strong>Walk</strong> from " + startName + " to " + startStationName
          });
        }
      } else if (seg.position === 'transit') {
        segments.push({
          icon: "🚇",
          text: "<strong>Transit</strong> from " + startStationName + " to " + destStationName
        });
      } else if (seg.position === 'end') {
        if (seg.type === 'grab') {
          segments.push({
            icon: "🚗",
            text: "<strong>Grab</strong> from " + destStationName + " to " + destName
          });
        } else {
          segments.push({
            icon: "🚶",
            text: "<strong>Walk</strong> from " + destStationName + " to " + destName
          });
        }
      }
    }

    var html = "";
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      html +=
        '<div class="summary-item">' +
        '<span class="summary-icon">' +
        seg.icon +
        "</span>" +
        '<span class="summary-text">' +
        seg.text +
        "</span>" +
        "</div>";
    }

    html +=
      '<div class="summary-stats">' +
      '<div class="summary-stat">' +
      '<span class="summary-stat-label">Total Distance</span>' +
      '<span class="summary-stat-value">' +
      calc.totals.distance +
      " km</span>" +
      "</div>" +
      '<div class="summary-stat">' +
      '<span class="summary-stat-label">Est. Time</span>' +
      '<span class="summary-stat-value">~' +
      calc.totals.time +
      " min</span>" +
      "</div>" +
      '<div class="summary-stat">' +
      '<span class="summary-stat-label">Total Fare</span>' +
      '<span class="summary-stat-value">RM ' +
      calc.totals.fare.toFixed(2) +
      "</span>" +
      "</div>" +
      "</div>";

    summaryContent.innerHTML = html;
    routeSummaryPanel.classList.remove("hidden");

    console.log(
      "[Summary] Total: " +
        calc.totals.distance +
        "km, " +
        calc.totals.time +
        "min, RM" +
        calc.totals.fare.toFixed(2)
    );

    // Return for insights
    return calc;
  }

  function buildInsights(path, startWalkDist, destWalkDist, routeData) {
    var insights = [];
    var mode = window.routingMode || "fastest";
    var walkThreshold = window.getWalkingThreshold ? window.getWalkingThreshold() : 300;

    if (mode === "comfort") {
      insights.push(
        "🛋️ Comfort mode: Route optimized to avoid crowded stations"
      );

      if (path && path.length) {
        var avgCrowd = 0;
        var maxCrowd = 0;
        path.forEach(function (s) {
          var crowd = s.crowd || 0;
          avgCrowd += crowd;
          if (crowd > maxCrowd) maxCrowd = crowd;
        });
        avgCrowd = avgCrowd / path.length;

        insights.push(
          "👥 Average crowd level: " +
            (avgCrowd * 100).toFixed(1) +
            "% (max: " +
            (maxCrowd * 100).toFixed(1) +
            "%)"
        );
      }
    } else if (mode === "fastest") {
      insights.push("⚡ Fastest mode: Minimizes total travel time");
      insights.push(
        "🚗 Uses Grab for distances >" + walkThreshold + "m for speed"
      );

      if (routeData && routeData.totals) {
        insights.push(
          "🕐 Estimated total time: ~" + routeData.totals.time + " minutes"
        );
      }
    } else if (mode === "shortest") {
      insights.push("📏 Shortest mode: Minimizes total distance traveled");
      insights.push("🚗 Uses Grab for distances >" + walkThreshold + "m");

      if (routeData && routeData.totals) {
        insights.push(
          "📍 Total distance: " + routeData.totals.distance + " km"
        );
      }
    } else if (mode === "eco-friendly") {
      insights.push(
        "🌱 Eco-friendly mode: Prioritizes walking up to " +
          (walkThreshold / 1000).toFixed(1) +
          "km"
      );

      var totalWalking = startWalkDist + destWalkDist;
      var co2Saved = (totalWalking / 1000) * 120;
      if (co2Saved >= 1) {
        insights.push(
          "🌍 Estimated CO2 saved: " +
            Math.round(co2Saved) +
            "g by walking instead of driving"
        );
      } else if (co2Saved > 0) {
        insights.push(
          "🌍 Estimated CO2 saved: " +
            co2Saved.toFixed(1) +
            "g by walking instead of driving"
        );
      }
    } else if (mode === "cheapest") {
      insights.push(
        "💰 Cheapest mode: Minimizes total fare (walks up to " +
          (walkThreshold / 1000).toFixed(1) +
          "km)"
      );

      if (routeData) {
        if (startWalkDist > walkThreshold || destWalkDist > walkThreshold) {
          insights.push("ℹ️ Note: Walking further could save on Grab fares");
        }
      }
    }

    // Fare breakdown
    if (routeData && routeData.segments) {
      var breakdownParts = [];
      for (var i = 0; i < routeData.segments.length; i++) {
        var seg = routeData.segments[i];
        if (seg.position === 'start' && seg.fare > 0) {
          breakdownParts.push(
            seg.type.charAt(0).toUpperCase() + seg.type.slice(1) +
            " (Start): RM " + seg.fare.toFixed(2)
          );
        } else if (seg.position === 'transit' && seg.fare > 0) {
          breakdownParts.push("Transit: RM " + seg.fare.toFixed(2));
        } else if (seg.position === 'end' && seg.fare > 0) {
          breakdownParts.push(
            seg.type.charAt(0).toUpperCase() + seg.type.slice(1) +
            " (End): RM " + seg.fare.toFixed(2)
          );
        }
      }
      if (breakdownParts.length > 0) {
        insights.push("💵 " + breakdownParts.join(" + "));
      }
    }

    if (path && path.length) {
      var travelMinutes = window.UnifiedCalc.transitTimeMin(path.length);
      if (travelMinutes > 0) {
        insights.push(
          "⏱️ ~" +
            travelMinutes +
            " min on board across " +
            (path.length - 1) +
            " stops"
        );
      }

      var lines = new Set();
      path.forEach(function (s) {
        lines.add(s.route_id);
      });

      if (lines.size > 1) {
        insights.push(
          "🔄 " +
            (lines.size - 1) +
            " transfer(s) across " +
            Array.from(lines).join(", ")
        );
      } else if (lines.size === 1) {
        insights.push("✅ Single-line journey on " + Array.from(lines)[0]);
      }

      if (mode !== "comfort") {
        var crowded = [];
        path.forEach(function (s) {
          var crowd = s.crowd || 0;
          if (crowd >= 0.75) crowded.push(s.name);
        });

        if (crowded.length) {
          insights.push(
            "⚠️ Crowded stations: " + crowded.slice(0, 3).join(", ")
          );
        }
      }
    }

    if (startWalkDist > walkThreshold) {
      insights.push(
        "🚗 Start: " +
          formatKm(startWalkDist) +
          " - Grab recommended (purple route)"
      );
    } else if (startWalkDist > 200) {
      insights.push("🚶 Walk " + formatKm(startWalkDist) + " to start station");
    }

    if (destWalkDist > walkThreshold) {
      insights.push(
        "🚗 End: " +
          formatKm(destWalkDist) +
          " - Grab recommended (purple route)"
      );
    } else if (destWalkDist > 200) {
      insights.push("🚶 Walk " + formatKm(destWalkDist) + " after exiting");
    }

    return insights;
  }

  function renderInsights(insights) {
    if (!insightsList) return;

    insightsList.innerHTML = "";

    if (!insights || !insights.length) {
      if (insightsEmpty) insightsEmpty.classList.remove("hidden");
      insightsList.classList.add("hidden");
      return;
    }

    if (insightsEmpty) insightsEmpty.classList.add("hidden");
    insightsList.classList.remove("hidden");
    insightsPanel.classList.remove("hidden");

    insights.forEach(function (text) {
      var li = document.createElement("li");
      li.textContent = text;
      insightsList.appendChild(li);
    });
  }

  async function handleRoute() {
    var startText = startInput.value.trim();
    var destText = destInput.value.trim();

    if (!startText || !destText) {
      setInfo("Please enter both start and destination");
      renderInsights([]);
      window.hasPlannedRoute = false;
      return;
    }

    if (!window.stations || window.stations.length === 0) {
      setInfo("Station data loading, please wait...");
      renderInsights([]);
      window.hasPlannedRoute = false;
      return;
    }

    routeBtn.disabled = true;
    routeBtn.textContent = "Routing...";
    setInfo("Resolving locations...");

    try {
      var mode = window.routingMode || "fastest";
      if (mode === "comfort") {
        setInfo("Preparing crowd data...");

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
          if (
            window.Crowd &&
            typeof window.Crowd.updateCrowdLevels === "function"
          ) {
            window.Crowd.updateCrowdLevels();
          }
        }

        console.log("[Input] Crowd data ready");
      }

      if (typeof window.toggleAllLines === "function") {
        window.toggleAllLines(false);
      }

      setInfo("Finding locations...");
      var startResult = await window.resolveQueryToNearestStation(
        startText,
        window.geocodeWithFallback
      );
      var destResult = await window.resolveQueryToNearestStation(
        destText,
        window.geocodeWithFallback
      );

      if (!startResult || !destResult) {
        setInfo("Could not locate one or both locations");
        renderInsights([]);
        window.hasPlannedRoute = false;
        return;
      }

      var startStation =
        startResult.station ||
        window.findNearestStation(
          startResult.coords.lat,
          startResult.coords.lng
        );
      var destStation =
        destResult.station ||
        window.findNearestStation(destResult.coords.lat, destResult.coords.lng);

      if (!startStation || !destStation) {
        setInfo("Could not find nearby transit stations");
        renderInsights([]);
        window.hasPlannedRoute = false;
        return;
      }

      setInfo("Calculating route...");
      var path = window.findPathBetweenStations(startStation, destStation);
      if (!path) {
        setInfo("No transit path found between stations");
        renderInsights([]);
        window.hasPlannedRoute = false;
        return;
      }

      var startObj = {
        lat: startResult.coords.lat,
        lng: startResult.coords.lng,
        name: startText,
      };
      var destObj = {
        lat: destResult.coords.lat,
        lng: destResult.coords.lng,
        name: destText,
      };

      // Draw route (this will show popups with correct calculations)
      window.drawPublicTransportRoute(
        startObj,
        destObj,
        startStation,
        destStation,
        path
      );

      var startWalkDist = window.distance(
        startObj.lat,
        startObj.lng,
        startStation.lat,
        startStation.lng
      );
      var destWalkDist = window.distance(
        destObj.lat,
        destObj.lng,
        destStation.lat,
        destStation.lng
      );

      // Calculate complete route data
      var walkThreshold = window.getWalkingThreshold ? window.getWalkingThreshold() : 300;
      var routeData = window.UnifiedCalc.completeRoute(
        startWalkDist,
        path,
        destWalkDist,
        walkThreshold
      );

      // Build summary and insights with consistent calculations
      buildRouteSummary(
        startObj,
        destObj,
        startStation,
        destStation,
        path,
        startWalkDist,
        destWalkDist,
        routeData
      );

      var insights = buildInsights(
        path,
        startWalkDist,
        destWalkDist,
        routeData
      );
      renderInsights(insights);

      var modeNames = {
        fastest: "Fastest",
        shortest: "Shortest",
        cheapest: "Cheapest",
        comfort: "Comfort",
        "eco-friendly": "Eco-Friendly",
      };

      var summary = "Route displayed (" + (modeNames[mode] || mode) + ")";
      if (routeData && routeData.totals && routeData.totals.fare > 0) {
        summary += " • RM " + routeData.totals.fare.toFixed(2);
      }
      setInfo(summary);

      window.hasPlannedRoute = true;
    } catch (err) {
      console.error("[Input] Error:", err);
      setInfo("Routing failed: " + err.message);
      renderInsights([]);
      window.hasPlannedRoute = false;
    } finally {
      routeBtn.disabled = false;
      routeBtn.textContent = "Go";
    }
  }

  if (routeBtn) routeBtn.addEventListener("click", handleRoute);
  if (startInput)
    startInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleRoute();
    });
  if (destInput)
    destInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleRoute();
    });

  window.InputHandler = {
    handleRoute: handleRoute,
    init: function () {
      console.log("[Input] InputHandler initialized");
    },
  };
})();