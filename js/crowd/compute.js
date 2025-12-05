// crowd/compute.js
// Responsibilities: normalize station names, modifiers, and crowd computation.
(function () {
  var CONST = window.CROWD_CONSTANTS || {};

  function normalizeStationName(name) {
    return (name || "")
      .toUpperCase()
      .replace(/'/g, "")
      .replace(/[()!-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  var BUSY_STATIONS = {
    "KL SENTRAL": 1.6,
    "MASJID JAMEK": 1.4,
    "PASAR SENI": 1.3,
    "HANG TUAH": 1.3,
    "BUKIT BINTANG": 1.4,
    "TRX": 1.4,
    "KLCC": 1.4,
    "TITIWANGSA": 1.2,
    "TUN RAZAK EXCHANGE": 1.4,
    "PUTRA HEIGHTS": 1.3,
    "CHAN SOW LIN": 1.2,
    "BANDARAYA": 1.1,
    "PWTC": 1.1,
    "SULTAN ISMAIL": 1.1,
    "PLAZA RAKYAT": 1.1,
    "MERDEKA": 1.2,
    "ABDULLAH HUKUM": 1.1,
  };

  var BUSY_ALIASES = {
    "KL SENTRAL REDONE": "KL SENTRAL",
    "BANDARAYA-UOB": "BANDARAYA",
    "KAMPUNG BARU-CBP COOPBANK PERTAMA": "KAMPUNG BARU",
    "SUNWAY-SETIA JAYA": "SUNWAY SETIA JAYA",
    "SUNU-MONASH": "SUNU MONASH",
    "SOUTH QUAY-USJ 1": "SOUTH QUAY USJ 1",
    "MRT TRX": "TRX",
    "STESEN TRX": "TRX",
  };

  var INTERCHANGE_STATIONS = {
    "KL SENTRAL": true,
    "MASJID JAMEK": true,
    "PASAR SENI": true,
    "HANG TUAH": true,
    "CHAN SOW LIN": true,
    "PUTRA HEIGHTS": true,
    "TITIWANGSA": true,
    "PAVILION BUKIT BINTANG": true,
    "PAVILION DAMANSARA": true,
    "TUN RAZAK EXCHANGE": true,
    "MRT TRX": true,
    "TRX": true,
    "BANDARAYA": true,
    "SULTAN ISMAIL": true,
    "PWTC": true,
    "ABDULLAH HUKUM": true,
    "IOI PUCHONG JAYA": true,
    "USJ 7": true,
  };

  function calculateCrowd(station, hour, passengerData) {
    var ROUTE_TO_COLUMN = CONST.ROUTE_TO_COLUMN || {};
    var ACTIVE_HOURS = CONST.ACTIVE_HOURS || 16;
    var PEAK_HOURS = CONST.PEAK_HOURS || [];
    var VISUAL_CAPACITY_FACTOR = CONST.VISUAL_CAPACITY_FACTOR || 5;
    var LINE_CAPACITY = CONST.LINE_CAPACITY || {};
    var INTERCHANGE_MODIFIER = CONST.INTERCHANGE_MODIFIER || 1.2;

    var column = ROUTE_TO_COLUMN[station.route_id];
    if (!column || !passengerData) return station.crowd || 0;

    var latestData = passengerData[passengerData.length - 1];
    var dailyStr = latestData[column];
    var daily = parseInt(dailyStr) || 0;
    if (daily === 0) return 0;

    var lineStations = window.stations.filter(function (s) {
      return s.route_id === station.route_id;
    });
    var stationCount = lineStations.length || 1;

    var hourly = daily / ACTIVE_HOURS / stationCount;

    for (var i = 0; i < PEAK_HOURS.length; i++) {
      var start = PEAK_HOURS[i][0];
      var end = PEAK_HOURS[i][1];
      if (hour >= start && hour <= end) {
        hourly *= 1.5;
        break;
      }
    }

    var capacity = LINE_CAPACITY[column] || 500;
    var crowd = Math.min(hourly / (capacity * VISUAL_CAPACITY_FACTOR), 1.0);

    var nameKey = normalizeStationName(station.name || station.id || "");
    if (BUSY_ALIASES[nameKey]) nameKey = BUSY_ALIASES[nameKey];
    var multiplier = 1;
    if (BUSY_STATIONS[nameKey]) multiplier *= BUSY_STATIONS[nameKey];

    var isInterchange =
      station.interchange_id ||
      (station.lines && station.lines.length > 1) ||
      INTERCHANGE_STATIONS[nameKey] ||
      INTERCHANGE_STATIONS[BUSY_ALIASES[nameKey] || ""] ||
      false;
    if (isInterchange) multiplier *= INTERCHANGE_MODIFIER;

    crowd = Math.min(crowd * multiplier, 1.0);
    return Math.round(crowd * 1000) / 1000;
  }

  window.CrowdCompute = {
    normalizeStationName: normalizeStationName,
    calculateCrowd: calculateCrowd,
  };
})();
