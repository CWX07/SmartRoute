// calc-unified.js
// Responsibilities: expose UnifiedCalc API by composing calc modules; keep computeComfortScore global.

(function () {
  // Ensure helpers/constants loaded
  var time = window.CalcTime || {};
  var fare = window.CalcFare || {};
  var path = window.CalcPath || {};

  if (!time || !fare || !path) {
    console.error("[Calc Unified] Missing calc modules", {
      hasTime: !!time,
      hasFare: !!fare,
      hasPath: !!path,
    });
    return;
  }

  window.UnifiedCalc = {
    distanceKm: path.distanceKm,
    walkingTimeMin: time.walkingTimeMin,
    transitTimeMin: time.transitTimeMin,
    grabTimeMin: time.grabTimeMin,
    transitTimeFromDistance: time.transitTimeFromDistance,
    transitFareFromDistance: fare.transitFareFromDistance,
    transitFare: fare.transitFare,
    grabFare: fare.grabFare,
    transitDistance: path.transitDistance,
    transitMetricsFromPath: path.transitMetricsFromPath,
    completeRoute: path.completeRoute,
    segmentStartEnd: path.segmentStartEnd,
  };

  console.log("[Calc Unified] Module ready - composed from calc modules");
})();