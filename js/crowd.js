// crowd.js
// Responsibilities: orchestrate crowd data load + hourly updates and station crowd fields.
(function () {
  var data = window.CrowdData || {};
  var compute = window.CrowdCompute || {};
  var constants = window.CROWD_CONSTANTS || {};

  var passengerData = null;
  var crowdUpdateInterval = null;

  function updateCrowdLevels() {
    if (!window.stations || !passengerData) return;

    var now = new Date();
    var hour = now.getHours();

    window.stations.forEach(function (station) {
      station.crowd = compute.calculateCrowd(station, hour, passengerData);
    });

    Object.keys(window.stationMarkersByRoute || {}).forEach(function (routeId) {
      var markers = window.stationMarkersByRoute[routeId];
      markers.forEach(function (marker) {
        var station = null;
        if (marker._stationId) {
          station = window.stations.find(function (s) {
            return s.id === marker._stationId;
          });
        }
        if (!station) {
          station = window.stations.find(function (s) {
            return s.route_id === routeId && s.lat === marker.getLatLng().lat;
          });
        }

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

  function loadPassengerData() {
    if (!data || typeof data.loadPassengerData !== "function") {
      console.error("[Crowd] CrowdData.loadPassengerData missing");
      return Promise.resolve(false);
    }

    return data.loadPassengerData().then(function (loaded) {
      passengerData = loaded;
      return true;
    });
  }

  window.Crowd = {
    loadPassengerData: loadPassengerData,
    startHourlyUpdates: startHourlyUpdates,
    stopHourlyUpdates: stopHourlyUpdates,
    updateCrowdLevels: updateCrowdLevels,
  };
})();
