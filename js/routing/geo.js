// routing/geo.js
// Responsibilities: nearest-station lookup, query resolution, walking route fetch.
(function () {
  var helpers = window.RoutingHelpers || {};
  var distance = helpers.distance || function () { return 0; };

  function straightLineMeters(start, dest) {
    if (
      start &&
      dest &&
      typeof start.lat === "number" &&
      typeof start.lng === "number" &&
      typeof dest.lat === "number" &&
      typeof dest.lng === "number"
    ) {
      return distance(start.lat, start.lng, dest.lat, dest.lng);
    }
    return 0;
  }

  function straightLineGeo(start, dest) {
    if (
      start &&
      dest &&
      typeof start.lat === "number" &&
      typeof start.lng === "number" &&
      typeof dest.lat === "number" &&
      typeof dest.lng === "number"
    ) {
      return {
        type: "LineString",
        coordinates: [
          [start.lng, start.lat],
          [dest.lng, dest.lat],
        ],
      };
    }
    return null;
  }

  function findNearestStation(lat, lng) {
    if (!window.stations || !window.stations.length) return null;
    var best = null;
    var bestDist = Infinity;
    window.stations.forEach(function (station) {
      var d = distance(lat, lng, station.lat, station.lng);
      if (d < bestDist) {
        bestDist = d;
        best = station;
      }
    });
    return best;
  }

  async function resolveQueryToNearestStation(query, geocodeAsync) {
    try {
      if (!query) return null;

      console.log("[Routing] Resolving query:", query);

      if (typeof geocodeAsync === "function") {
        var res = await geocodeAsync(query);
        if (!res) {
          console.warn("[Routing] Resolution failed");
          return null;
        }
        var nearest = findNearestStation(res.lat, res.lng);
        if (nearest)
          return {
            station: nearest,
            source: res.station ? "station" : "geocode",
            coords: { lat: res.lat, lng: res.lng },
          };
        return {
          station: null,
          source: "geocode",
          coords: { lat: res.lat, lng: res.lng },
        };
      }

      console.warn("[Routing] No geocode function available");
      return null;
    } catch (err) {
      console.error("resolveQueryToNearestStation error", err);
      return null;
    }
  }

  function fetchWalkingRoute(start, dest) {
    var url =
      "https://router.project-osrm.org/route/v1/walking/" +
      start.lng +
      "," +
      start.lat +
      ";" +
      dest.lng +
      "," +
      dest.lat +
      "?overview=full&geometries=geojson";
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("OSRM failed");
        return res.json();
      })
      .then(function (data) {
        if (data.code !== "Ok" || !data.routes || !data.routes.length)
          throw new Error("No route found");
        return data.routes[0].geometry;
      })
      .catch(function (err) {
        console.warn("[Geo] OSRM walking route failed; using straight-line fallback:", err.message || err);
        return straightLineGeo(start, dest);
      });
  }

  function fetchWalkingDistance(start, dest) {
    var url =
      "https://router.project-osrm.org/route/v1/walking/" +
      start.lng +
      "," +
      start.lat +
      ";" +
      dest.lng +
      "," +
      dest.lat +
      "?overview=false";
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("OSRM failed");
        return res.json();
      })
      .then(function (data) {
        if (data.code !== "Ok" || !data.routes || !data.routes.length)
          throw new Error("No route found");
        return data.routes[0].distance; // meters
      })
      .catch(function (err) {
        console.warn("[Geo] OSRM walking distance failed; using straight-line fallback:", err.message || err);
        return straightLineMeters(start, dest);
      });
  }

  function fetchDrivingRoute(start, dest) {
    var url =
      "https://router.project-osrm.org/route/v1/driving/" +
      start.lng +
      "," +
      start.lat +
      ";" +
      dest.lng +
      "," +
      dest.lat +
      "?overview=full&geometries=geojson";
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("OSRM failed");
        return res.json();
      })
      .then(function (data) {
        if (data.code !== "Ok" || !data.routes || !data.routes.length)
          throw new Error("No route found");
        return data.routes[0].geometry;
      })
      .catch(function (err) {
        console.warn("[Geo] OSRM driving route failed; using straight-line fallback:", err.message || err);
        return straightLineGeo(start, dest);
      });
  }

  function fetchDrivingDistance(start, dest) {
    var url =
      "https://router.project-osrm.org/route/v1/driving/" +
      start.lng +
      "," +
      start.lat +
      ";" +
      dest.lng +
      "," +
      dest.lat +
      "?overview=false";
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("OSRM failed");
        return res.json();
      })
      .then(function (data) {
        if (data.code !== "Ok" || !data.routes || !data.routes.length)
          throw new Error("No route found");
        return data.routes[0].distance; // meters
      })
      .catch(function (err) {
        console.warn("[Geo] OSRM driving distance failed; using straight-line fallback:", err.message || err);
        return straightLineMeters(start, dest);
      });
  }

  window.findNearestStation = findNearestStation;
  window.resolveQueryToNearestStation = resolveQueryToNearestStation;
  window.fetchWalkingRoute = fetchWalkingRoute;
  window.fetchWalkingDistance = fetchWalkingDistance;
  window.fetchDrivingRoute = fetchDrivingRoute;
  window.fetchDrivingDistance = fetchDrivingDistance;
})();
