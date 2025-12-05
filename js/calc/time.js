// calc/time.js
// Responsibilities: walking, transit, and grab time calculations.
(function () {
  var C = window.CalcConstants || {};
  var helpers = window.CalcHelpers || {};
  var getRouteSpeed = helpers.getRouteSpeed || function () { return C.DEFAULT_TRANSIT_SPEED_KMH || 30; };

  function walkingTimeMin(meters) {
    var km = meters / 1000;
    var hours = km / (C.WALKING_SPEED_KMH || 5);
    return Math.ceil(hours * 60);
  }

  function transitTimeMin(stopCount) {
    if (!stopCount || stopCount <= 1) return 0;
    var approxDistanceKm = Math.max(stopCount - 1, 0) * 0.8;
    var runningTimeMin = (approxDistanceKm / (C.DEFAULT_TRANSIT_SPEED_KMH || 30)) * 60;
    var dwellTimeMin = Math.max(stopCount - 1, 0) * (C.DWELL_TIME_PER_STOP_MIN || 0.5);
    return Math.round(runningTimeMin + dwellTimeMin);
  }

  function grabTimeMin(meters) {
    var km = meters / 1000;
    var hours = km / (C.GRAB_SPEED_KMH || 20);
    return Math.ceil(hours * 60);
  }

  function transitTimeFromDistance(routeId, distanceKm, stopCount) {
    if (!distanceKm || distanceKm <= 0) return 0;
    var speedKmh = getRouteSpeed(routeId);
    var runningTimeMin = (distanceKm / speedKmh) * 60;
    var sc = stopCount || 0;
    var dwellTimeMin = Math.max(sc - 1, 0) * (C.DWELL_TIME_PER_STOP_MIN || 0.5);
    return Math.round(runningTimeMin + dwellTimeMin);
  }

  window.CalcTime = {
    walkingTimeMin: walkingTimeMin,
    transitTimeMin: transitTimeMin,
    grabTimeMin: grabTimeMin,
    transitTimeFromDistance: transitTimeFromDistance,
  };
})();
