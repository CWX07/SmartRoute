// calc/constants.js
// Responsibilities: shared constants for time/fare models.
(function () {
  window.CalcConstants = {
    WALKING_SPEED_KMH: 4.5,
    ROUTE_SPEED_KMH: {
      KJ: 33,
      SP: 28,
      AG: 26,
      MRT: 39,
      PYL: 40,
      MR: 19,
      BRT: 28,
    },
    DEFAULT_TRANSIT_SPEED_KMH: 30,
    DWELL_TIME_PER_STOP_MIN: 0.33,
    TRANSIT_BASE_FARE: 0.8,
    TRANSIT_PER_KM: 0.15,
    TRANSIT_MAX_FARE: 4.5,
    GRAB_BASE_FARE: 2.0,
    GRAB_PER_KM: 0.65,
    GRAB_PER_MIN: 0.3,
    GRAB_BOOKING_FEE: 1.0,
    GRAB_SPEED_KMH: 20,
  };
})();
