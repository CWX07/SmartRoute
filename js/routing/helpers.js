// routing/helpers.js
// Responsibilities: shared geometry and transfer/cost helpers.
(function () {
  function distance(lat1, lng1, lat2, lng2) {
    var R = 6371e3;
    var φ1 = (lat1 * Math.PI) / 180;
    var φ2 = (lat2 * Math.PI) / 180;
    var Δφ = ((lat2 - lat1) * Math.PI) / 180;
    var Δλ = ((lng2 - lng1) * Math.PI) / 180;
    var a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function getTransferFee(fromRoute, toRoute) {
    var fm = (typeof window !== "undefined" && window.FareModel) || null;
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

  function fareLegKm(a, b) {
    var aliasMap = (typeof window !== "undefined" && window.ROUTE_ID_ALIAS) || {};
    var ra = aliasMap[a.route_id] || a.route_id;
    var rb = aliasMap[b.route_id] || b.route_id;
    if (typeof window.getGTFSShapeDistance === "function" && ra && ra === rb) {
      var trackKm = window.getGTFSShapeDistance(a, b);
      if (typeof trackKm === "number" && trackKm > 0) return trackKm;
    }
    return distance(a.lat, a.lng, b.lat, b.lng) / 1000;
  }

  window.RoutingHelpers = {
    distance: distance,
    getTransferFee: getTransferFee,
    fareLegKm: fareLegKm,
  };
})();
