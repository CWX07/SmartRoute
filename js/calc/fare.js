// calc/fare.js
// Responsibilities: fare calculations for transit and grab.
(function () {
  var C = window.CalcConstants || {};
  var helpers = window.CalcHelpers || {};
  var roundToTwo = helpers.roundToTwo || function (n) { return Math.round(n * 100) / 100; };
  var roundToNearestTenth = helpers.roundToNearestTenth || function (n) { return Math.round(n * 10) / 10; };
  var normalizeRouteId = helpers.normalizeRouteId || function (rid) { return rid ? String(rid).toUpperCase() : null; };
  var lookupFareByStations = helpers.lookupFareByStations || function () { return null; };
  var normalizeLinePairKey = helpers.normalizeLinePairKey || function () { return null; };
  var lookupCrossFareByStations = helpers.lookupCrossFareByStations || function () { return null; };
  var fareFromCrossModel = helpers.fareFromCrossModel || function () { return null; };

  function transitFareFromDistance(distanceKm, routeId, fromName, toName) {
    var lineId = normalizeRouteId(routeId);
    var from = (fromName || "").toUpperCase();
    var to = (toName || "").toUpperCase();

    var fareFromTable = lookupFareByStations(lineId, from, to);
    if (typeof fareFromTable === "number") {
      return roundToTwo(fareFromTable);
    }

    if (!distanceKm || distanceKm <= 0) return 0;

    var fare;

    if (typeof window !== "undefined" && window.FareModel) {
      var model = window.FareModel;
      var lines = model.lines || {};
      var lineModel = lines[lineId];

      if (lineModel) {
        var base = typeof lineModel.base === "number" ? lineModel.base : C.TRANSIT_BASE_FARE;
        var perKm = typeof lineModel.per_km === "number" ? lineModel.per_km : C.TRANSIT_PER_KM;
        var minFare = typeof lineModel.min_fare === "number" ? lineModel.min_fare : null;
        var maxFare = typeof lineModel.max_fare === "number" ? lineModel.max_fare : null;

        var aiFare = base + perKm * distanceKm;
        if (minFare !== null) aiFare = Math.max(aiFare, minFare);
        if (maxFare !== null) aiFare = Math.min(aiFare, maxFare);
        fare = roundToNearestTenth(aiFare);
        return roundToTwo(fare);
      }
    }

    if (typeof window !== "undefined" && !window.FareModel) {
      console.warn("[Fare] FareModel missing; using distance fallback for", lineId || "(unknown)");
    }

    fare = (C.TRANSIT_BASE_FARE || 0) + distanceKm * (C.TRANSIT_PER_KM || 0);
    fare = roundToNearestTenth(fare);
    return roundToTwo(fare);
  }

  function transitFare(stopCount) {
    if (!stopCount || stopCount <= 1) return 0;
    var approxDistanceKm = Math.max(stopCount - 1, 0) * 0.8;
    return transitFareFromDistance(approxDistanceKm, null, "", "");
  }

  function grabFare(meters) {
    var km = meters / 1000;
    var timeMin = window.CalcTime && typeof window.CalcTime.grabTimeMin === "function"
      ? window.CalcTime.grabTimeMin(meters)
      : 0;

    var fare =
      (C.GRAB_BASE_FARE || 0) +
      km * (C.GRAB_PER_KM || 0) +
      timeMin * (C.GRAB_PER_MIN || 0) +
      (C.GRAB_BOOKING_FEE || 0);

    return roundToTwo(fare);
  }

  window.CalcFare = {
    transitFareFromDistance: transitFareFromDistance,
    transitFare: transitFare,
    grabFare: grabFare,
  };
})();
