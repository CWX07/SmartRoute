// map/colors.js
// Responsibilities: route colors and getRouteColor helper.
(function () {
  var ROUTE_COLORS = {
    AG: "#e57200",
    SP: "#7C3F00",
    KJ: "#D50032",
    MR: "#84bd00",
    MRT: "#047940",
    PYL: "#FFCD00",
    BRT: "#115740",
  };

  window.getRouteColor = function (routeId) {
    if (!routeId) return "#54c1ff";
    if (ROUTE_COLORS[routeId]) return ROUTE_COLORS[routeId];
    var id = routeId;
    if (typeof window.normalizeRouteId === "function") {
      id = window.normalizeRouteId(routeId) || routeId;
      if (ROUTE_COLORS[id]) return ROUTE_COLORS[id];
    }
    return "#54c1ff";
  };
})();
