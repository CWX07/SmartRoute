// input/summary.js
// Responsibilities: build the route summary UI.
(function () {
  var dom = window.InputDom || {};
  var utils = window.InputUtils || {};

  function buildRouteSummary(start, dest, startStation, destStation, path, startWalkDist, destWalkDist, routeData) {
    var summaryContent = dom.summaryContent;
    if (!summaryContent) return;

    var segments = [];
    var startName = utils.capitalizeName(start.name || "Start");
    var destName = utils.capitalizeName(dest.name || "Destination");
    var startStationName = startStation.name || "Station";
    var destStationName = destStation.name || "Station";

    var walkThreshold = window.getWalkingThreshold ? window.getWalkingThreshold() : 300;

    var calc = routeData;
    if (!calc && window.UnifiedCalc && typeof window.UnifiedCalc.completeRoute === "function") {
      calc = window.UnifiedCalc.completeRoute(startWalkDist, path, destWalkDist, walkThreshold);
    }

    if (!calc) {
      console.warn("[Summary] Missing route data for summary");
      return;
    }

    for (var i = 0; i < calc.segments.length; i++) {
      var seg = calc.segments[i];
      if (seg.position === "start") {
        if (seg.type === "grab") {
          segments.push({ icon: "🚗", text: "<strong>Grab</strong> from " + startName + " to " + startStationName });
        } else {
          segments.push({ icon: "🚶", text: "<strong>Walk</strong> from " + startName + " to " + startStationName });
        }
      } else if (seg.position === "transit") {
        segments.push({
          icon: "🚇",
          text: "<strong>Transit</strong> from " + startStationName + " to " + destStationName,
        });
      } else if (seg.position === "end") {
        if (seg.type === "grab") {
          segments.push({ icon: "🚗", text: "<strong>Grab</strong> from " + destStationName + " to " + destName });
        } else {
          segments.push({ icon: "🚶", text: "<strong>Walk</strong> from " + destStationName + " to " + destName });
        }
      }
    }

    var html = "";
    for (var j = 0; j < segments.length; j++) {
      var segItem = segments[j];
      html +=
        '<div class="summary-item">' +
        '<span class="summary-icon">' +
        segItem.icon +
        "</span>" +
        '<span class="summary-text">' +
        segItem.text +
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
    if (dom.routeSummaryPanel) dom.routeSummaryPanel.classList.remove("hidden");

    console.log("[Summary] Total: " + calc.totals.distance + "km, " + calc.totals.time + "min, RM" + calc.totals.fare.toFixed(2));

    return calc;
  }

  window.InputSummary = { buildRouteSummary: buildRouteSummary };
})();
