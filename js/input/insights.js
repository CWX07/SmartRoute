// input/insights.js
// Responsibilities: build insight messages for a route.
(function () {
  var utils = window.InputUtils || {};

  // Emission factors (grams CO2e per km)
  var EMISSION = {
    CAR_G_PER_KM: 180,
    GRAB_G_PER_KM: 180, // assume similar to private car
    RAIL_DEFAULT_G_PER_KM: 60,
    RAIL_BY_LINE: {
      KJ: 50, // LRT Kelana Jaya
      SP: 50, // LRT Sri Petaling
      AG: 50, // LRT Ampang
      MRT: 35, // MRT Kajang
      PYL: 35, // MRT Putrajaya
      MR: 60, // Monorail
      BRT: 85, // BRT Sunway (diesel bus)
    },
  };

  function railEmissionFactor(routeId) {
    if (!routeId) return EMISSION.RAIL_DEFAULT_G_PER_KM;
    var id = String(routeId).toUpperCase();
    return EMISSION.RAIL_BY_LINE[id] || EMISSION.RAIL_DEFAULT_G_PER_KM;
  }

  function computeEmissions(routeData, path) {
    if (!routeData || !routeData.segments) return null;

    var totalKm = 0;
    var tripEmissions = 0;
    var walkKm = 0;

    routeData.segments.forEach(function (seg) {
      var dist = typeof seg.distance === "number" ? seg.distance : seg.distance_km || 0;
      totalKm += dist;

      if (seg.type === "walk") {
        walkKm += dist;
        return;
      }

      if (seg.type === "grab") {
        tripEmissions += dist * EMISSION.GRAB_G_PER_KM;
        return;
      }

      if (seg.type === "transit") {
        if (seg.transitLines) {
          Object.keys(seg.transitLines).forEach(function (rid) {
            var line = seg.transitLines[rid];
            var km = typeof line.distanceKm === "number" ? line.distanceKm : 0;
            tripEmissions += km * railEmissionFactor(rid);
          });
        } else {
          tripEmissions += dist * EMISSION.RAIL_DEFAULT_G_PER_KM;
        }
      }
    });

    // If totals include only some segments, fall back to summed distance
    if (!totalKm && routeData.totals && typeof routeData.totals.distance === "number") {
      totalKm = routeData.totals.distance;
    }

    // Baseline: prefer provided driving km (OSRM), else straight line between first/last station, else trip km
    var baselineDistanceKm =
      typeof routeData.baselineDrivingKm === "number" && routeData.baselineDrivingKm > 0
        ? routeData.baselineDrivingKm
        : totalKm;

    if (!baselineDistanceKm && path && path.length > 1 && window.distance) {
      var first = path[0];
      var last = path[path.length - 1];
      if (
        first &&
        last &&
        typeof first.lat === "number" &&
        typeof first.lng === "number" &&
        typeof last.lat === "number" &&
        typeof last.lng === "number"
      ) {
        var baselineMeters = window.distance(first.lat, first.lng, last.lat, last.lng);
        if (baselineMeters > 0) baselineDistanceKm = baselineMeters / 1000;
      }
    }

    var baselineCar = baselineDistanceKm * EMISSION.CAR_G_PER_KM;
    var saved = baselineCar - tripEmissions;
    if (saved < 0) saved = 0;

    return {
      trip: tripEmissions,
      baseline: baselineCar,
      saved: saved,
      walkKm: walkKm,
      baselineKm: baselineDistanceKm,
      tripKm: totalKm,
    };
  }

  function buildInsights(path, startWalkDist, destWalkDist, routeData) {
    var insights = [];
    var mode = window.routingMode || "fastest";
    var walkThreshold = window.getWalkingThreshold ? window.getWalkingThreshold() : 300;
    var transitSegment = null;

    if (routeData && routeData.segments) {
      transitSegment = routeData.segments.find(function (seg) {
        return seg.type === "transit";
      });
    }

    if (mode === "comfort") {
      insights.push("🛋️ Comfort mode: Route optimized to avoid crowded stations");

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

      if (routeData && typeof routeData.comfortScore === "number") {
        var comfortScore = routeData.comfortScore;
        var label = "Crowded";
        if (comfortScore < 1) label = "Very Comfortable";
        else if (comfortScore < 2) label = "Moderate";
        insights.push("🧠 Comfort index: " + comfortScore.toFixed(2) + " / 3 (" + label + ")");
      }
    } else if (mode === "fastest") {
      insights.push("⚡ Fastest mode: Minimizes total travel time");
      insights.push("🚗 Uses Grab for distances >" + walkThreshold + "m for speed");

      if (routeData && routeData.totals) {
        insights.push("🕐 Estimated total time: ~" + routeData.totals.time + " minutes");
      }
    } else if (mode === "shortest") {
      insights.push("📏 Shortest mode: Minimizes total distance traveled");
      insights.push("🚗 Uses Grab for distances >" + walkThreshold + "m");

      if (routeData && routeData.totals) {
        insights.push("📍 Total distance: " + routeData.totals.distance + " km");
      }
    } else if (mode === "eco-friendly") {
      insights.push("🌱 Eco-friendly mode: Prioritizes walking up to " + (walkThreshold / 1000).toFixed(1) + "km");

      var emissions = computeEmissions(routeData, path);
      if (emissions) {
        insights.push(
          "🌍 CO₂ vs driving: saved " +
            Math.round(emissions.saved) +
            "g (trip " +
            Math.round(emissions.trip) +
            "g, car baseline " +
            Math.round(emissions.baseline) +
            "g)"
        );
        if (emissions.walkKm > 0) {
          insights.push("🚶‍♀️ Walking distance: " + emissions.walkKm.toFixed(2) + " km (zero emissions)");
        }
      }
    } else if (mode === "cheapest") {
      insights.push("💰 Cheapest mode: Minimizes total fare (walks up to " + (walkThreshold / 1000).toFixed(1) + "km)");

      if (routeData) {
        if (startWalkDist > walkThreshold || destWalkDist > walkThreshold) {
          insights.push("ℹ️ Note: Walking further could save on Grab fares");
        }
      }
    }

    if (routeData && routeData.segments) {
      var breakdownParts = [];
      for (var i = 0; i < routeData.segments.length; i++) {
        var seg = routeData.segments[i];
        if (seg.position === "start" && seg.fare > 0) {
          breakdownParts.push(seg.type.charAt(0).toUpperCase() + seg.type.slice(1) + " (Start): RM " + seg.fare.toFixed(2));
        } else if (seg.position === "transit" && seg.fare > 0) {
          breakdownParts.push("Transit: RM " + seg.fare.toFixed(2));
        } else if (seg.position === "end" && seg.fare > 0) {
          breakdownParts.push(seg.type.charAt(0).toUpperCase() + seg.type.slice(1) + " (End): RM " + seg.fare.toFixed(2));
        }
      }
      if (breakdownParts.length > 0) {
        insights.push("💵 " + breakdownParts.join(" + "));
      }
    }

    var travelMinutes = 0;
    var transitStops = 0;
    if (routeData && routeData.segments) {
      travelMinutes = utils.sumSegmentMetric(routeData.segments, "transit", "time");
      transitStops = transitSegment ? transitSegment.stopCount || 0 : 0;
    }

    if (travelMinutes > 0) {
      insights.push(
        "⏱️ ~" +
          Math.round(travelMinutes) +
          " min on board across " +
          Math.max((transitStops || 1) - 1, 0) +
          " stops"
      );
    }

    if (path && path.length) {
      var lines = new Set();
      path.forEach(function (s) {
        lines.add(s.route_id);
      });

      if (lines.size > 1) {
        insights.push("🔄 " + (lines.size - 1) + " transfer(s) across " + Array.from(lines).join(", "));
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
          insights.push("⚠️ Crowded stations: " + crowded.slice(0, 3).join(", "));
        }
      }
    }

    if (startWalkDist > walkThreshold) {
      insights.push("🚗 Start: " + utils.formatKm(startWalkDist) + " - Grab recommended (purple route)");
    } else if (startWalkDist > 200) {
      insights.push("🚶 Walk " + utils.formatKm(startWalkDist) + " to start station");
    }

    if (destWalkDist > walkThreshold) {
      insights.push("🚗 End: " + utils.formatKm(destWalkDist) + " - Grab recommended (purple route)");
    } else if (destWalkDist > 200) {
      insights.push("🚶 Walk " + utils.formatKm(destWalkDist) + " after exiting");
    }

    return insights;
  }

  window.InputInsights = { buildInsights: buildInsights };
})();
