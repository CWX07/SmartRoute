// routing/cheapest.js
// Responsibilities: fare-aware Dijkstra for cheapest fare path.
(function () {
  var helpers = window.RoutingHelpers || {};
  var fareLegKm = helpers.fareLegKm || function () { return 0; };
  var calcHelpers = window.CalcHelpers || {};
  var normalizeLinePairKey =
    calcHelpers.normalizeLinePairKey ||
    function (lines) {
      if (!lines) return null;
      if (typeof lines === "string") {
        return lines;
      }
      var unique = [];
      for (var i = 0; i < lines.length; i++) {
        var id = (lines[i] || "").toUpperCase();
        if (id && unique.indexOf(id) === -1) unique.push(id);
      }
      return unique.sort().join("|");
    };
  var lookupCrossFareByStations = calcHelpers.lookupCrossFareByStations || function () { return null; };
  var fareFromCrossModel = calcHelpers.fareFromCrossModel || function () { return null; };
  var normalizeStationName = calcHelpers.normalizeStationName || function (n) { return (n || "").toUpperCase(); };

  function findCheapestFarePath(start, dest) {
    var stationGraph = window.stationGraph;
    var stationIndex = window.stationIndex;
    var aliasMap = (typeof window !== "undefined" && window.ROUTE_ID_ALIAS) || {};

    function fareFn(distanceKm, lineId, fromName, toName, prevLineId) {
      var normLine = normLineId(lineId);
      var fare = null;

      // Try cross-line fare if changing lines and we have a pair key
      if (prevLineId && prevLineId !== normLine) {
        var pairKey = normalizeLinePairKey([prevLineId, normLine]);
        if (pairKey) {
          var lookupFare = lookupCrossFareByStations(
            pairKey,
            (fromName || "").toUpperCase(),
            (toName || "").toUpperCase()
          );
          if (typeof lookupFare === "number") {
            fare = lookupFare;
          } else {
            fare = fareFromCrossModel(pairKey, distanceKm, 1);
          }
        }
      }

      // Fallback to per-line fare model
      if (fare === null && window.UnifiedCalc && typeof window.UnifiedCalc.transitFareFromDistance === "function") {
        fare = window.UnifiedCalc.transitFareFromDistance(distanceKm, normLine, fromName, toName);
      }

      return fare;
    }
    if (!fareFn) {
      console.warn("[Routing] Fare function missing, falling back to distance");
      return null;
    }

    function normLine(id) {
      return (aliasMap[id] || id || "").toUpperCase();
    }
    function normLineId(id) {
      return normLine(id);
    }

    var pq = [];
    function push(state) {
      pq.push(state);
    }
    function popMin() {
      if (pq.length === 0) return null;
      var idx = 0;
      for (var i = 1; i < pq.length; i++) {
        if (pq[i].cost < pq[idx].cost) idx = i;
      }
      var st = pq[idx];
      pq.splice(idx, 1);
      return st;
    }

    var startState = {
      nodeId: start.id,
      cost: 0,
      lineId: null,
      segDistKm: 0,
      segStartName: start.name || start.id || "",
    };

    var best = {}; // key: node|line|segStart -> cost
    var prev = {}; // key: node|line|segStart -> {nodeId,lineId,segStartName}

    function key(st) {
      return st.nodeId + "|" + (st.lineId || "NONE") + "|" + (st.segStartName || "NA");
    }

    push(startState);
    best[key(startState)] = 0;

    var destState = null;

    while (true) {
      var cur = popMin();
      if (!cur) break;
      if (cur.nodeId === dest.id) {
        destState = cur;
        break;
      }

      var neighbors = stationGraph.get(cur.nodeId);
      if (!neighbors) continue;

      for (const neighborId of neighbors) {
        var neighbor = stationIndex.get(neighborId);
        if (!neighbor) continue;

        var currentStation = stationIndex.get(cur.nodeId);
        var edgeKm = fareLegKm(currentStation, neighbor);
        var edgeLineRaw = neighbor.route_id || currentStation.route_id || cur.lineId;
        var edgeLine = normLine(edgeLineRaw);

        var nextState = {
          nodeId: neighborId,
          cost: 0,
          lineId: edgeLine,
          segDistKm: 0,
          segStartName: cur.segStartName,
        };

        var fareIncrement = 0;

        if (!cur.lineId || cur.lineId === edgeLine) {
          var newSegDist = cur.segDistKm + edgeKm;
          var newSegFare = fareFn(
            newSegDist,
            edgeLine,
            cur.segStartName || currentStation.name || currentStation.id || "",
            neighbor.name || neighbor.id || "",
            cur.lineId
          );
          var oldSegFare = fareFn(
            cur.segDistKm,
            edgeLine,
            cur.segStartName || currentStation.name || currentStation.id || "",
            currentStation.name || currentStation.id || "",
            cur.lineId
          );
          fareIncrement = newSegFare - oldSegFare;
          if (fareIncrement < 0 || !isFinite(fareIncrement)) fareIncrement = 0;
          nextState.segDistKm = newSegDist;
          nextState.segStartName = cur.segStartName;
          nextState.lineId = edgeLine;
        } else {
          var newFare = fareFn(
            edgeKm,
            edgeLine,
            currentStation.name || currentStation.id || "",
            neighbor.name || neighbor.id || "",
            cur.lineId
          );
          fareIncrement = isFinite(newFare) ? newFare : 0;
          nextState.segDistKm = edgeKm;
          nextState.segStartName = currentStation.name || currentStation.id || "";
          nextState.lineId = edgeLine;
        }

        var nextCost = cur.cost + fareIncrement;
        nextState.cost = nextCost;

        var k = key(nextState);
        if (!(k in best) || nextCost < best[k]) {
          best[k] = nextCost;
          prev[k] = {
            nodeId: cur.nodeId,
            lineId: cur.lineId,
            segStartName: cur.segStartName,
          };
          push(nextState);
        }
      }
    }

    if (!destState) return null;

    var minCost = Infinity;
    var bestDestKey = null;
    Object.keys(best).forEach(function (k) {
      var parts = k.split("|");
      if (parts[0] === dest.id.toString()) {
        if (best[k] < minCost) {
          minCost = best[k];
          bestDestKey = k;
        }
      }
    });
    if (!bestDestKey) return null;

    var pathIds = [];
    var cursor = bestDestKey;
    while (cursor) {
      var parts = cursor.split("|");
      pathIds.unshift(parts[0]);
      var p = prev[cursor];
      if (!p) break;
      cursor = p.nodeId + "|" + (p.lineId || "NONE") + "|" + (p.segStartName || "NA");
    }

    var path = pathIds.map(function (id) {
      return stationIndex.get(id);
    });

    if (!path.length || path[0].id !== start.id) return null;
    return path;
  }

  window.RoutingCheapest = { findCheapestFarePath: findCheapestFarePath };
})();
