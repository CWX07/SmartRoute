// routing.js
// Responsibilities: expose routing helpers, graph build, and pathfinding per mode.
(function () {
  var helpers = window.RoutingHelpers || {};
  var graph = window.RoutingShortest || {};

  // Geometry alias for external callers
  window.distance =
    helpers.distance ||
    function (lat1, lng1, lat2, lng2) {
      return 0;
    };

  // Expose graph builder + pathfinder
  window.buildStationGraph = window.buildStationGraph || (window.RoutingGraph && window.RoutingGraph.buildStationGraph);
  window.findPathBetweenStations = graph.findPathBetweenStations;

  console.log("[Routing] Module initialized");
})();
