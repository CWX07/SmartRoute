// config/aliases.js
// Responsibilities: shared route ID normalization and aliases.
(function () {
  // Canonical aliases
  window.ROUTE_ID_ALIAS = {
    // LRT lines
    KJ: "KJ",
    KJL: "KJ",
    AGL: "AG",
    AG: "AG",
    SPL: "SP",
    SP: "SP",
    PH: "SP", // Treat Putra Heights dataset as SP for routing
    MRL: "MR",
    MR: "MR",
    BRT: "BRT",

    // MRT standardization
    MRT: "MRT",
    MRT_SBK: "MRT",
    MRT_KGL: "MRT",
    SBK: "MRT",
    KGL: "MRT",
  };

  // Normalization helper (shared)
  window.normalizeRouteId = function (rid) {
    if (!rid) return null;
    var id = String(rid).trim().toUpperCase();
    if (window.ROUTE_ID_ALIAS && window.ROUTE_ID_ALIAS[id]) {
      return window.ROUTE_ID_ALIAS[id];
    }
    return id;
  };
})();
