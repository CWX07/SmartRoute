// crowd.js

(function () {
  var passengerData = null;
  var crowdUpdateInterval = null;

  var ACTIVE_HOURS = 16;
  var PEAK_HOURS = [
    [8, 10],
    [17, 19],
  ];
  var VISUAL_CAPACITY_FACTOR = 5;

  var LINE_CAPACITY = {
    rail_lrt_ampang: 5000,
    rail_mrt_kajang: 8000,
    rail_lrt_kj: 4000,
    rail_monorail: 3000,
    rail_mrt_pjy: 6000,
  };

  var ROUTE_TO_COLUMN = {
    AG: "rail_lrt_ampang",
    PH: "rail_lrt_ampang",
    KKJ: "rail_lrt_kj",
    MR: "rail_monorail",
    MRT: "rail_mrt_kajang",
    PYL: "rail_mrt_pjy",
    BRT: null,
  };

  function calculateCrowd(station, hour) {
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
    return Math.round(crowd * 1000) / 1000;
  }

  function updateCrowdLevels() {
    if (!window.stations || !passengerData) return;

    var now = new Date();
    var hour = now.getHours();

    window.stations.forEach(function (station) {
      station.crowd = calculateCrowd(station, hour);
    });

    Object.keys(window.stationMarkersByRoute || {}).forEach(function (routeId) {
      var markers = window.stationMarkersByRoute[routeId];
      markers.forEach(function (marker) {
        var station = window.stations.find(function (s) {
          return s.route_id === routeId && s.lat === marker.getLatLng().lat;
        });

        if (station) {
          var crowdLevel = station.crowd || 0;
          var color = window.getRouteColor(routeId);
          var radius = 4 + Math.min(crowdLevel * 10, 6);

          marker.setRadius(radius);
          marker.setStyle({ fillColor: color, color: color });
          marker.setPopupContent(
            (station.name || station.id) +
              "<br>Crowd: " +
              ((crowdLevel || 0) * 100).toFixed(1) +
              "%" +
              "<br>Route: " +
              (station.route_id || "N/A")
          );
        }
      });
    });
  }

  function loadPassengerData() {
    return fetch("data.gov.my/ridership-headline.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Ridership data not found");
        return res.json();
      })
      .then(function (data) {
        passengerData = data;
        return true;
      })
      .catch(function () {
        passengerData = generateMockData();
        return true;
      });
  }

  function generateMockData() {
    return [
      {
        date: new Date().toISOString().split("T")[0],
        rail_lrt_ampang: "50000",
        rail_mrt_kajang: "80000",
        rail_lrt_kj: "60000",
        rail_monorail: "30000",
        rail_mrt_pjy: "70000",
      },
    ];
  }

  function startHourlyUpdates() {
    if (!passengerData) return;
    updateCrowdLevels();
    if (crowdUpdateInterval) clearInterval(crowdUpdateInterval);
    crowdUpdateInterval = setInterval(updateCrowdLevels, 3600000);
  }

  function stopHourlyUpdates() {
    if (crowdUpdateInterval) {
      clearInterval(crowdUpdateInterval);
      crowdUpdateInterval = null;
    }
  }

  window.Crowd = {
    loadPassengerData: loadPassengerData,
    startHourlyUpdates: startHourlyUpdates,
    stopHourlyUpdates: stopHourlyUpdates,
    updateCrowdLevels: updateCrowdLevels,
  };
})();
