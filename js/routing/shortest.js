// routing/shortest.js
// Responsibilities: core Dijkstra pathfinding with mode-aware edge costs.
(function () {
  var helpers = window.RoutingHelpers || {};
  var distance = helpers.distance || function () { return 0; };
  var getTransferFee = helpers.getTransferFee || function () { return 0; };
  var fareLegKm = helpers.fareLegKm || function () { return 0; };
  var cheapest = window.RoutingCheapest || {};

  function calculateEdgeCost(fromStation, toStation, mode) {
    var baseCost = 1.0;

    var aliasMap = (typeof window !== "undefined" && window.ROUTE_ID_ALIAS) || {};
    var aliasFrom = aliasMap[fromStation.route_id] || fromStation.route_id || null;
    var aliasTo = aliasMap[toStation.route_id] || toStation.route_id || null;
    var shapeDistKm = getGTFSShapeDistance(
      Object.assign({}, fromStation, { route_id: aliasFrom }),
      Object.assign({}, toStation, { route_id: aliasTo })
    );
    var distKm;

    if (shapeDistKm !== null) {
      distKm = shapeDistKm;
    } else {
      var straightDist = distance(fromStation.lat, fromStation.lng, toStation.lat, toStation.lng);
      distKm = straightDist / 1000;
    }

    var isTransfer =
      fromStation.route_id &&
      toStation.route_id &&
      fromStation.route_id !== toStation.route_id;
    var transferPenaltyMinutes = isTransfer ? 5 : 0;

    switch (mode) {
      case "fastest": {
        if (window.UnifiedCalc && typeof window.UnifiedCalc.transitTimeFromDistance === "function") {
          var routeId = toStation.route_id || fromStation.route_id || null;
          var stopCount = 2;
          var tMin = window.UnifiedCalc.transitTimeFromDistance(routeId, distKm, stopCount);
          return tMin + transferPenaltyMinutes;
        }
        var speedKmh = 30;
        var travelTimeMinutes = (distKm / speedKmh) * 60;
        var dwell = 0.5;
        return travelTimeMinutes + dwell + transferPenaltyMinutes;
      }

      case "shortest":
        return distKm + transferPenaltyMinutes;

      case "cheapest": {
        if (window.UnifiedCalc && typeof window.UnifiedCalc.transitFareFromDistance === "function") {
          var rawRouteId = toStation.route_id || fromStation.route_id || null;
          var lineId = window.normalizeRouteId(rawRouteId);
          var edgeFare = window.UnifiedCalc.transitFareFromDistance(distKm, lineId, fromStation.name, toStation.name);
          var transferFee = isTransfer ? getTransferFee(fromStation.route_id, toStation.route_id) : 0;
          return typeof edgeFare === "number"
            ? edgeFare + transferFee + transferPenaltyMinutes
            : baseCost + distKm * 0.1 + transferFee + transferPenaltyMinutes;
        }
        return baseCost + distKm * 0.1 + transferPenaltyMinutes;
      }

      case "comfort":
        if (typeof window.computeComfortScore === "function") {
          var ridershipData = window.RIDERSHIP_DATA || {};
          var stationCounts = window.routeStationCounts || {};
          var comfortHour = typeof window.currentComfortHour === "number" ? window.currentComfortHour : new Date().getHours();
          var comfortSegment = {
            route_id: toStation.route_id || fromStation.route_id || null,
            stops: stationCounts[toStation.route_id] || stationCounts[fromStation.route_id] || 8,
            type: "transit",
            distance_km: distKm,
            isTransfer: isTransfer,
            transferCount: isTransfer ? 1 : 0,
            crowdFrom: fromStation.crowd,
            crowdTo: toStation.crowd,
          };
          var comfortScore = window.computeComfortScore(comfortSegment, comfortHour, ridershipData);
          return comfortScore + transferPenaltyMinutes;
        }
        var currentStation = null;
        if (window.stations && window.stations.length > 0) {
          currentStation = window.stations.find(function (s) {
            return s.id === toStation.id;
          });
        }
        var crowdLevel = currentStation ? currentStation.crowd || 0 : 0;
        var crowdPenalty = crowdLevel * distKm * 15.0;
        return distKm + crowdPenalty;

      case "eco-friendly":
        var walkKm = distKm;
        if (walkKm <= 2) {
          return baseCost + walkKm * 0.1 + transferPenaltyMinutes;
        }
        if (window.UnifiedCalc && typeof window.UnifiedCalc.transitTimeFromDistance === "function") {
          var ecoRouteId = toStation.route_id || fromStation.route_id || null;
          var ecoTime = window.UnifiedCalc.transitTimeFromDistance(ecoRouteId, distKm, 2);
          return ecoTime + transferPenaltyMinutes;
        }
        return distKm + transferPenaltyMinutes;

      default:
        return distKm;
    }
  }

  function findPathBetweenStations(startStation, destStation) {
    if (!startStation || !destStation) {
      console.warn("[Routing] Missing start or dest station");
      return null;
    }

    if (Array.isArray(startStation)) {
      console.warn("[Routing] Start is an interchange, using first candidate:", startStation[0].name);
      startStation = startStation[0];
    }

    if (Array.isArray(destStation)) {
      console.warn("[Routing] Destination is an interchange, using first candidate:", destStation[0].name);
      destStation = destStation[0];
    }

    if ((!window.stationGraph || window.stationGraph.size === 0) && window.stations) {
      if (typeof window.buildStationGraph === "function") {
        window.buildStationGraph(window.stations);
      }
    }

    var stationGraph = window.stationGraph;
    var stationIndex = window.stationIndex;
    var mode = window.routingMode || "fastest";

    if (mode === "cheapest" && cheapest.findCheapestFarePath) {
      var farePath = cheapest.findCheapestFarePath(startStation, destStation);
      if (farePath) return farePath;
    }

    var visited = {};
    var distMap = {};
    var prev = {};

    stationGraph.forEach(function (_, nodeId) {
      distMap[nodeId] = Infinity;
    });

    distMap[startStation.id] = 0;
    var pq = [];
    pq.push({ id: startStation.id, cost: 0 });

    function popMin() {
      if (pq.length === 0) return null;
      var idx = 0;
      for (var i = 1; i < pq.length; i++) {
        if (pq[i].cost < pq[idx].cost) idx = i;
      }
      var node = pq[idx];
      pq.splice(idx, 1);
      return node;
    }

    while (pq.length > 0) {
      var current = popMin();
      if (!current) break;
      if (visited[current.id]) continue;
      visited[current.id] = true;

      if (current.id === destStation.id) break;

      var neighbors = stationGraph.get(current.id) || [];
      neighbors.forEach(function (neighborId) {
        var neighbor = stationIndex.get(neighborId);
        if (!neighbor) return;
        var currentStation = stationIndex.get(current.id);
        var edgeCost = calculateEdgeCost(currentStation, neighbor, mode);

        var newCost = distMap[current.id] + edgeCost;
        if (newCost < distMap[neighborId]) {
          distMap[neighborId] = newCost;
          prev[neighborId] = current.id;
          pq.push({ id: neighborId, cost: newCost });
        }
      });
    }

    if (!prev[destStation.id] && startStation.id !== destStation.id) {
      console.warn("[Routing] No path found");
      return null;
    }

    var path = [];
    var u = destStation.id;
    while (u !== undefined) {
      path.unshift(stationIndex.get(u));
      u = prev[u];
    }
    var metrics = computePathMetrics(path);

    if (mode === "fastest") {
      var timeMin = metrics ? metrics.timeMin : null;
      if (timeMin !== null) {
        console.log("[Routing] Fastest Route: ~" + Math.round(timeMin) + " minutes");
      }
    } else if (mode === "shortest") {
      var distanceKm = metrics && typeof metrics.distanceKm === "number" ? metrics.distanceKm : null;
      if (distanceKm === null) {
        var totalDistKm = 0;
        for (var j = 0; j < path.length - 1; j++) {
          var d = getGTFSShapeDistance(path[j], path[j + 1]);
          if (d === null) {
            d = distance(path[j].lat, path[j].lng, path[j + 1].lat, path[j + 1].lng) / 1000;
          }
          totalDistKm += d;
        }
        distanceKm = totalDistKm;
      }
      console.log("[Routing] Shortest Route: " + distanceKm.toFixed(2) + "km, " + path.length + " stations");
    } else if (mode === "cheapest") {
      var distKm = metrics ? metrics.distanceKm : null;
      var rawRouteId = path[1].route_id || path[0].route_id || null;
      var lineId = window.normalizeRouteId(rawRouteId);
      var fare = UnifiedCalc.transitFareFromDistance(distKm, lineId, path[0].name, path[path.length - 1].name);
      console.log("[Routing] Cheapest Route: " + path.length + " stations (RM " + fare.toFixed(2) + ")");
    } else if (mode === "eco-friendly") {
      console.log("[Routing] Eco-Friendly Route: Optimized for walking and minimal transit");
    }

    return path;
  }

  function computePathMetrics(path) {
    if (!path || path.length < 2) return null;
    var totalDistKm = 0;
    var totalTimeMin = 0;
    for (var i = 0; i < path.length - 1; i++) {
      var dKm = fareLegKm(path[i], path[i + 1]);
      totalDistKm += dKm;
      if (window.UnifiedCalc && typeof window.UnifiedCalc.transitTimeFromDistance === "function") {
        totalTimeMin += window.UnifiedCalc.transitTimeFromDistance(path[i].route_id, dKm, 2);
      }
    }
    return { distanceKm: totalDistKm, timeMin: totalTimeMin };
  }

  window.RoutingShortest = {
    calculateEdgeCost: calculateEdgeCost,
    findPathBetweenStations: findPathBetweenStations,
    computePathMetrics: computePathMetrics,
  };
})();
