// crowd/constants.js
// Responsibilities: constants for crowd estimation.
(function () {
  window.CROWD_CONSTANTS = {
    ACTIVE_HOURS: 16,
    PEAK_HOURS: [
      [8, 10],
      [17, 19],
    ],
    VISUAL_CAPACITY_FACTOR: 5,
    LINE_CAPACITY: {
      rail_lrt_ampang: 5000,
      rail_mrt_kajang: 8000,
      rail_lrt_kj: 4000,
      rail_monorail: 3000,
      rail_mrt_pjy: 6000,
    },
    ROUTE_TO_COLUMN: {
      AG: "rail_lrt_ampang",
      PH: "rail_lrt_ampang",
      KJ: "rail_lrt_kj",
      KKJ: "rail_lrt_kj",
      MR: "rail_monorail",
      MRT: "rail_mrt_kajang",
      PYL: "rail_mrt_pjy",
      BRT: null,
    },
    INTERCHANGE_MODIFIER: 1.2,
  };
})();
