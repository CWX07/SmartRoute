// calc/helpers.js
// Responsibilities: helper utilities for calc-unified (rounding, lookup, transfer fees, distances).
(function () {
  var C = window.CalcConstants || {};
  var ROUTE_ALIAS = (typeof window !== "undefined" && window.ROUTE_ID_ALIAS) || {
    LRT: null, // will resolve based on more specific aliases below
    "LRT KJ": "KJ",
    "LRT KELANA JAYA": "KJ",
    "LRT SP": "SP",
    "LRT SRI PETALING": "SP",
    "LRT AG": "AG",
    "LRT AMPANG": "AG",
  };

  function roundToTwo(n) {
    return Math.round(n * 100) / 100;
  }

  function roundToNearestTenth(n) {
    return Math.round(n * 10) / 10;
  }

  function normalizeRouteId(routeId) {
    if (typeof window !== "undefined" && typeof window.normalizeRouteId === "function") {
      return window.normalizeRouteId(routeId);
    }
    if (!routeId) return null;
    var up = String(routeId).trim().toUpperCase();
    // direct alias map first
    if (ROUTE_ALIAS[up]) return ROUTE_ALIAS[up];
    // heuristic: if starts with LRT and has suffix
    if (up.startsWith("LRT ")) {
      var suffix = up.replace(/^LRT\s+/, "");
      if (ROUTE_ALIAS["LRT " + suffix]) return ROUTE_ALIAS["LRT " + suffix];
    }
    return up;
  }

  function normalizeStationName(name) {
    if (!name) return "";
    return String(name)
      .toUpperCase()
      .replace(/'/g, "")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getRouteSpeed(routeId) {
    if (!routeId) return C.DEFAULT_TRANSIT_SPEED_KMH || 30;
    return (C.ROUTE_SPEED_KMH && C.ROUTE_SPEED_KMH[routeId]) || C.DEFAULT_TRANSIT_SPEED_KMH || 30;
  }

  function getTransferFee(fromRoute, toRoute) {
    var fm = typeof window !== "undefined" ? window.FareModel : null;
    if (!fm) return 0;
    var fee = typeof fm.transfer_fee === "number" ? fm.transfer_fee : 0;

    var a = (fromRoute || "").toUpperCase();
    var b = (toRoute || "").toUpperCase();
    if (fm.cross_lines && a && b) {
      var key = [a, b].sort().join("|");
      var cl = fm.cross_lines[key];
      if (cl && typeof cl.transfer_penalty === "number") {
        fee = cl.transfer_penalty;
      }
    }
    return fee;
  }

  function lookupFareByStations(routeId, fromName, toName) {
    var normalized = normalizeRouteId(routeId);
    if (!normalized) return null;

    var from = normalizeStationName(fromName);
    var to = normalizeStationName(toName);

    var table =
      (window.FareLookup && window.FareLookup[normalized]) ||
      (window.FARE_TABLE && window.FARE_TABLE[normalized]) ||
      null;
    if (!table) return null;

    var key = from + "||" + to;
    var rev = to + "||" + from;

    var fare = table[key];
    if (typeof fare === "number") return fare;
    fare = table[rev];
    return typeof fare === "number" ? fare : null;
  }

  function normalizeLinePairKey(lines) {
    if (!lines) return null;
    if (typeof lines === "string") {
      return normalizeLinePairKey(lines.split("|"));
    }
    var unique = [];
    for (var i = 0; i < lines.length; i++) {
      var id = normalizeRouteId(lines[i]);
      if (id && unique.indexOf(id) === -1) unique.push(id);
    }
    if (unique.length < 2) return null;
    return unique.sort().join("|");
  }

  function lookupCrossFareByStations(pairKey, fromName, toName) {
    if (!pairKey) return null;
    var upperKey = pairKey.toUpperCase();
    var from = normalizeStationName(fromName);
    var to = normalizeStationName(toName);
    var table =
      (window.FareLookupCross && window.FareLookupCross[upperKey]) ||
      (window.FARE_TABLE_CROSS && window.FARE_TABLE_CROSS[upperKey]) ||
      null;
    if (!table) return null;

    var key = from + "||" + to;
    var rev = to + "||" + from;

    var fare = table[key];
    if (typeof fare === "number") return fare;
    fare = table[rev];
    return typeof fare === "number" ? fare : null;
  }

  function fareFromCrossModel(pairKey, distanceKm, transferCount) {
    if (!pairKey || !window.FareModel) return null;
    var upperKey = pairKey.toUpperCase();
    var crossLines = window.FareModel.cross_lines || {};
    var model = crossLines[upperKey];
    if (!model) return null;

    var base = typeof model.base === "number" ? model.base : C.TRANSIT_BASE_FARE;
    var perKm = typeof model.per_km === "number" ? model.per_km : C.TRANSIT_PER_KM;
    var minFare = typeof model.min_fare === "number" ? model.min_fare : null;
    var maxFare = typeof model.max_fare === "number" ? model.max_fare : null;
    var transferPenalty = typeof model.transfer_penalty === "number" ? model.transfer_penalty : 0;
    var transfers = typeof transferCount === "number" && transferCount > 0 ? transferCount : 1;

    var fare = base + perKm * distanceKm + transferPenalty * transfers;
    if (minFare !== null) fare = Math.max(fare, minFare);
    if (maxFare !== null) fare = Math.min(fare, maxFare);
    fare = roundToNearestTenth(fare);
    return roundToTwo(fare);
  }

  function legDistanceKm(s1, s2) {
    if (
      typeof window !== "undefined" &&
      typeof window.getGTFSShapeDistance === "function" &&
      s1.route_id &&
      s1.route_id === s2.route_id
    ) {
      var trackKm = window.getGTFSShapeDistance(s1, s2);
      if (typeof trackKm === "number" && trackKm > 0) {
        return trackKm;
      }
    }
    var meters = window.distance(s1.lat, s1.lng, s2.lat, s2.lng);
    return meters / 1000;
  }

  window.CalcHelpers = {
    roundToTwo: roundToTwo,
    roundToNearestTenth: roundToNearestTenth,
    normalizeRouteId: normalizeRouteId,
    normalizeStationName: normalizeStationName,
    getRouteSpeed: getRouteSpeed,
    getTransferFee: getTransferFee,
    lookupFareByStations: lookupFareByStations,
    normalizeLinePairKey: normalizeLinePairKey,
    lookupCrossFareByStations: lookupCrossFareByStations,
    fareFromCrossModel: fareFromCrossModel,
    legDistanceKm: legDistanceKm,
  };
})();
