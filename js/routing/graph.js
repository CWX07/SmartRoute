// routing/graph.js
// Responsibilities: build station graph (nodes/edges) and expose indices.
(function () {
  var helpers = window.RoutingHelpers || {};
  var distance = helpers.distance || function () { return 0; };

  var stationGraph = new Map();
  var stationIndex = new Map();
  var routeStationCounts = {};

  function addGraphEdge(id1, id2) {
    if (!id1 || !id2 || id1 === id2) return;
    if (!stationGraph.has(id1)) stationGraph.set(id1, new Set());
    if (!stationGraph.has(id2)) stationGraph.set(id2, new Set());
    stationGraph.get(id1).add(id2);
    stationGraph.get(id2).add(id1);
  }

  function buildStationGraph(stationList) {
    stationGraph = new Map();
    stationIndex = new Map();
    routeStationCounts = {};
    if (!stationList || !stationList.length) return;

    stationList.forEach(function (station) {
      stationIndex.set(station.id, station);
    });

    var byRoute = {};
    stationList.forEach(function (station) {
      if (!byRoute[station.route_id]) byRoute[station.route_id] = [];
      byRoute[station.route_id].push(station);
    });

    Object.keys(byRoute).forEach(function (routeId) {
      var routeStations = byRoute[routeId];
      routeStationCounts[routeId] = routeStations.length;
      routeStations.sort(function (a, b) {
        var ma = a.id && a.id.match(/\d+/);
        var mb = b.id && b.id.match(/\d+/);
        var numA = ma ? parseInt(ma[0], 10) : NaN;
        var numB = mb ? parseInt(mb[0], 10) : NaN;
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.id.localeCompare(b.id);
      });
      for (var i = 0; i < routeStations.length - 1; i++) {
        addGraphEdge(routeStations[i].id, routeStations[i + 1].id);
      }
    });

    for (var i = 0; i < stationList.length; i++) {
      for (var j = i + 1; j < stationList.length; j++) {
        var s1 = stationList[i];
        var s2 = stationList[j];
        if (!s1 || !s2 || s1.route_id === s2.route_id) continue;

        var name1 = (s1.name || "").toUpperCase().trim();
        var name2 = (s2.name || "").toUpperCase().trim();
        var sameName = name1 !== "" && name1 === name2;
        var close = distance(s1.lat, s1.lng, s2.lat, s2.lng) < 250;

        if (sameName || close) {
          addGraphEdge(s1.id, s2.id);
        }
      }
    }

  window.stationGraph = stationGraph;
  window.stationIndex = stationIndex;
  window.routeStationCounts = routeStationCounts;
  console.log("[Routing] Station graph built with", stationGraph.size, "nodes");
  }

  window.buildStationGraph = buildStationGraph;
  window.RoutingGraph = { buildStationGraph: buildStationGraph };
})();
