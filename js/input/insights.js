// input/insights.js
// Responsibilities: build insight messages for a route.
(function () {
  var utils = window.InputUtils || {};

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

      var totalWalking = startWalkDist + destWalkDist;
      var co2Saved = (totalWalking / 1000) * 120;
      if (co2Saved >= 1) {
        insights.push("🌍 Estimated CO2 saved: " + Math.round(co2Saved) + "g by walking instead of driving");
      } else if (co2Saved > 0) {
        insights.push("🌍 Estimated CO2 saved: " + co2Saved.toFixed(1) + "g by walking instead of driving");
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
