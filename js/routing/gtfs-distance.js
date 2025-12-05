// routing/gtfs-distance.js
// Responsibilities: GTFS shape distance helpers for routing edge calculations.
(function () {
  function mapShapeIdToRoute(shapeId) {
    if (!shapeId) return null;
    var id = shapeId.toUpperCase();
    if (id.startsWith("SHP_PH_")) return "SP";
    if (id.startsWith("SHP_MRT_")) return "MRT";
    if (id.startsWith("MRT_")) return "MRT";
    if (id.startsWith("MRT")) return "MRT";
    if (id.startsWith("KGL")) return "MRT";
    if (id.startsWith("SBK")) return "MRT";
    return null;
  }

  function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = ((lat2 - lat1) * Math.PI) / 180;
    var dLon = ((lon2 - lon1) * Math.PI) / 180;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function computeShapeDistance(points, startIdx, endIdx) {
    var dist = 0;
    for (var i = startIdx; i < endIdx; i++) {
      var a = points[i];
      var b = points[i + 1];
      dist += haversine(a.lat, a.lon, b.lat, b.lon);
    }
    return dist;
  }

  function snapStationToShape(station, shapePoints) {
    var bestIdx = -1;
    var bestDist = Infinity;

    for (var i = 0; i < shapePoints.length; i++) {
      var p = shapePoints[i];
      var d = haversine(station.lat, station.lng, p.lat, p.lon);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    return bestIdx;
  }

  function getGTFSShapeDistance(stA, stB) {
    if (!window.RouteShapes || !window.GTFSShapes || !stA.route_id || stA.route_id !== stB.route_id) {
      return null;
    }

    var routeId = stA.route_id;
    var shapeId = window.RouteShapes[routeId];

    if (!shapeId) {
      for (var sid in window.GTFSShapes) {
        var mapped = mapShapeIdToRoute(sid);
        if (mapped === routeId) {
          shapeId = sid;
          break;
        }
      }
    }

    if (!shapeId) return null;

    var shapePoints = window.GTFSShapes[shapeId];
    if (!shapePoints) return null;

    var idxA = snapStationToShape(stA, shapePoints);
    var idxB = snapStationToShape(stB, shapePoints);

    if (idxA < 0 || idxB < 0) return null;

    var start = Math.min(idxA, idxB);
    var end = Math.max(idxA, idxB);

    return computeShapeDistance(shapePoints, start, end); // km
  }

  window.getGTFSShapeDistance = getGTFSShapeDistance;
})();
