// routing.js

(function () {
  var stationGraph = new Map();
  var stationIndex = new Map();

  window.routingMode = window.routingMode || "fastest";

  function distance(lat1, lng1, lat2, lng2) {
    var R = 6371e3;
    var φ1 = (lat1 * Math.PI) / 180;
    var φ2 = (lat2 * Math.PI) / 180;
    var Δφ = ((lat2 - lat1) * Math.PI) / 180;
    var Δλ = ((lng2 - lng1) * Math.PI) / 180;
    var a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function calculateEdgeCost(fromStation, toStation, mode) {
    var baseCost = 1.0;
    var dist = distance(
      fromStation.lat,
      fromStation.lng,
      toStation.lat,
      toStation.lng
    );
    var distKm = dist / 1000;

    switch (mode) {
      case "fastest":
        // Minimize time: distance + base time per stop
        // Assumes 3 min per stop + travel time based on 60km/h average speed
        var travelTimeMinutes = (distKm / 60) * 60; // hours to minutes
        var stopTime = 3; // 3 minutes per stop
        return travelTimeMinutes + stopTime;

      case "shortest":
        // Minimize distance
        return distKm;

      case "cheapest":
        return baseCost + distKm * 0.1;

      case "comfort":
        var currentStation = null;
        if (window.stations && window.stations.length > 0) {
          currentStation = window.stations.find(function (s) {
            return s.id === toStation.id;
          });
        }
        var crowdLevel = currentStation ? currentStation.crowd || 0 : 0;
        var crowdPenalty = crowdLevel * distKm * 15.0;

        if (crowdLevel > 0.3) {
          console.log(
            "[Routing] " +
              toStation.name +
              " - Crowd: " +
              (crowdLevel * 100).toFixed(1) +
              "%, Dist: " +
              distKm.toFixed(2) +
              "km, Penalty: " +
              crowdPenalty.toFixed(2)
          );
        }

        return distKm + crowdPenalty;

      case "eco-friendly":
        return baseCost * 0.3;

      default:
        return distKm;
    }
  }

  function findNearestStation(lat, lng, maxDistance) {
    if (!window.stations || window.stations.length === 0) {
      console.warn("[Routing] No stations available for findNearestStation");
      return null;
    }

    var nearest = null;
    var minDist = Infinity;
    window.stations.forEach(function (station) {
      var dist = distance(lat, lng, station.lat, station.lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = station;
      }
    });

    if (!nearest) {
      console.log("[Routing] No stations available");
    } else {
      console.log(
        "[Routing] Found nearest station:",
        nearest.name,
        "at",
        minDist.toFixed(0) + "m"
      );
    }

    return nearest;
  }
  window.findNearestStation = findNearestStation;
  window.distance = distance;

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
    console.log(
      "[Routing] Station graph built with",
      stationGraph.size,
      "nodes"
    );
  }
  window.buildStationGraph = buildStationGraph;

  function findPathBetweenStations(startStation, destStation) {
    if (!startStation || !destStation) {
      console.warn("[Routing] Missing start or dest station");
      return null;
    }

    if ((!stationGraph || stationGraph.size === 0) && window.stations) {
      console.log("[Routing] Building station graph...");
      buildStationGraph(window.stations);
    }

    if (
      !stationGraph.has(startStation.id) ||
      !stationGraph.has(destStation.id)
    ) {
      console.warn(
        "[Routing] Station not found in graph:",
        startStation.id,
        destStation.id
      );
      return null;
    }

    if (startStation.id === destStation.id) return [startStation];

    var mode = window.routingMode || "fastest";
    console.log(
      "[Routing] Using mode:",
      mode,
      "from",
      startStation.name,
      "to",
      destStation.name
    );

    if (mode === "comfort") {
      if (!window.stations || window.stations.length === 0) {
        console.error("[Routing] No stations loaded for comfort mode");
        return null;
      }

      var hasCrowdData = window.stations.some(function (s) {
        return s.crowd !== undefined && s.crowd > 0;
      });
      if (!hasCrowdData) {
        console.warn("[Routing] No crowd data available, updating now...");
        if (
          window.Crowd &&
          typeof window.Crowd.updateCrowdLevels === "function"
        ) {
          window.Crowd.updateCrowdLevels();
        }
      } else {
        console.log(
          "[Routing] Crowd data available, proceeding with comfort routing"
        );
      }
    }

    var distances = {};
    var previous = {};
    var unvisited = new Set();

    window.stations.forEach(function (station) {
      distances[station.id] = Infinity;
      previous[station.id] = null;
      unvisited.add(station.id);
    });

    distances[startStation.id] = 0;

    while (unvisited.size > 0) {
      var currentId = null;
      var minDist = Infinity;
      unvisited.forEach(function (id) {
        if (distances[id] < minDist) {
          minDist = distances[id];
          currentId = id;
        }
      });

      if (currentId === null || minDist === Infinity) break;
      if (currentId === destStation.id) break;

      unvisited.delete(currentId);
      var neighbors = stationGraph.get(currentId);
      if (!neighbors) continue;

      neighbors.forEach(function (neighborId) {
        if (!unvisited.has(neighborId)) return;

        var neighbor = stationIndex.get(neighborId);
        if (!neighbor) return;

        var current = stationIndex.get(currentId);
        var edgeCost = calculateEdgeCost(current, neighbor, mode);
        var altDistance = distances[currentId] + edgeCost;

        if (altDistance < distances[neighborId]) {
          distances[neighborId] = altDistance;
          previous[neighborId] = currentId;
        }
      });
    }

    var path = [];
    var currentId = destStation.id;
    while (currentId !== null) {
      path.unshift(stationIndex.get(currentId));
      currentId = previous[currentId];
    }

    if (path.length === 0 || path[0].id !== startStation.id) {
      console.warn("[Routing] Could not find path");
      return null;
    }

    console.log("[Routing] Found path with", path.length, "stations");

    if (mode === "comfort") {
      console.log("[Routing] Comfort Route Analysis:");
      var totalCrowdPenalty = 0;
      path.forEach(function (station) {
        var currentStation = window.stations.find(function (s) {
          return s.id === station.id;
        });
        var crowdLevel = currentStation ? currentStation.crowd || 0 : 0;
        totalCrowdPenalty += crowdLevel;
        console.log(
          "  - " +
            station.name +
            ": " +
            (crowdLevel * 100).toFixed(1) +
            "% crowded"
        );
      });
      console.log(
        "[Routing] Average crowd level:",
        ((totalCrowdPenalty / path.length) * 100).toFixed(1) + "%"
      );
    } else if (mode === "fastest") {
      var totalTime = 0;
      for (var i = 0; i < path.length - 1; i++) {
        var dist =
          distance(path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng) /
          1000;
        totalTime += (dist / 60) * 60 + 3; // travel time + stop time
      }
      console.log(
        "[Routing] Fastest Route: " +
          path.length +
          " stations (~" +
          Math.round(totalTime) +
          " minutes)"
      );
    } else if (mode === "shortest") {
      var totalDist = 0;
      for (var i = 0; i < path.length - 1; i++) {
        totalDist += distance(
          path[i].lat,
          path[i].lng,
          path[i + 1].lat,
          path[i + 1].lng
        );
      }
      console.log(
        "[Routing] Shortest Route: " +
          (totalDist / 1000).toFixed(2) +
          "km, " +
          path.length +
          " stations"
      );
    } else if (mode === "cheapest") {
      console.log(
        "[Routing] Cheapest Route: " +
          path.length +
          " stations (RM " +
          ((path.length - 1) * 0.3).toFixed(2) +
          " transit fare)"
      );
    } else if (mode === "eco-friendly") {
      console.log(
        "[Routing] Eco-Friendly Route: Optimized for walking and minimal transit"
      );
    }

    return path;
  }
  window.findPathBetweenStations = findPathBetweenStations;

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
      });
  }
  window.fetchWalkingRoute = fetchWalkingRoute;

  var transitKeywords = [
    "lrt",
    "mrt",
    "brt",
    "monorail",
    "komuter",
    "ktm",
    "rapid",
    "station",
    "stesen",
    "stn",
  ];

  function hasTransitKeywords(query) {
    var lower = (query || "").toLowerCase().trim();
    return transitKeywords.some(function (k) {
      return lower.includes(k);
    });
  }

  function levenshtein(a, b) {
    var m = [],
      i,
      j;
    for (i = 0; i <= b.length; i++) m[i] = [i];
    for (j = 0; j <= a.length; j++) m[0][j] = j;

    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        m[i][j] = Math.min(
          m[i - 1][j] + 1,
          m[i][j - 1] + 1,
          m[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1)
        );
      }
    }
    return m[b.length][a.length];
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    var d = levenshtein(a, b);
    return 1 - d / Math.max(a.length, b.length);
  }

  window.findStationByName = function (query) {
    if (!query || !window.stations || window.stations.length === 0) return null;

    var raw = query.toLowerCase().trim();
    if (!raw) return null;

    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(raw)) return null;

    var userWantsTransit = hasTransitKeywords(query);
    if (!userWantsTransit) {
      console.log(
        "[StationMatch] No transit keywords found, skipping station match for:",
        query
      );
      return null;
    }

    var q = raw
      .replace(
        /\b(station|stesen|stn|lrt|mrt|brt|monorail|komuter|rapid|ktm)\b/g,
        ""
      )
      .trim();

    if (!q) q = raw;

    var best = null;
    var bestScore = 0;

    window.stations.forEach(function (st) {
      var name = (st.name || "").toLowerCase();
      if (!name) return;

      if (name === q) {
        best = st;
        bestScore = 1.0;
        return;
      }

      if (name.includes(q) || q.includes(name)) {
        var score = Math.max(q.length / name.length, name.length / q.length);
        if (score > bestScore) {
          bestScore = score;
          best = st;
        }
        return;
      }

      var score = similarity(q, name);
      if (score > bestScore) {
        bestScore = score;
        best = st;
      }
    });

    var threshold = 0.75;
    if (best && bestScore >= threshold) {
      console.log(
        "[StationMatch] Matched:",
        best.name,
        "score:",
        bestScore.toFixed(2)
      );
      return best;
    }

    console.log(
      "[StationMatch] No match for:",
      query,
      "best score:",
      bestScore.toFixed(2)
    );
    return null;
  };

  window.geocodeWithFallback = function (query) {
    return new Promise(function (resolve) {
      if (!query) return resolve(null);

      var userWantsTransit = hasTransitKeywords(query);
      if (userWantsTransit) {
        var station = window.findStationByName(query);
        if (station) {
          console.log("[Geocode] Station matched:", station.name);
          return resolve({
            lat: station.lat,
            lng: station.lng,
            name: station.name,
            station: station,
          });
        }
      }

      console.log("[Geocode] Geocoding location (no transit keywords):", query);
      var url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
        encodeURIComponent(query);

      fetch(url)
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (data) {
          if (!data || !data.length) {
            console.log("[Geocode] Nominatim found nothing");
            return resolve(null);
          }

          var loc = data[0];
          console.log("[Geocode] Nominatim result:", loc.display_name);
          resolve({
            lat: parseFloat(loc.lat),
            lng: parseFloat(loc.lon),
            name: loc.display_name,
          });
        })
        .catch(function (err) {
          console.error("[Geocode] Error:", err);
          resolve(null);
        });
    });
  };

  window.resolveQueryToNearestStation = async function (query, geocodeAsync) {
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
  };

  var FARE_CONFIG = {
    TRANSIT_PER_STATION: 0.3,
    GRAB: {
      baseFare: 2.0,
      perKmRate: 0.65,
      perMinuteRate: 0.3,
      bookingFee: 1.0,
      surgeMultiplier: 1.0,
    },
  };

  window.calculateFare = function (path, startWalkDist, destWalkDist) {
    var mode = window.routingMode || "fastest";
    var walkThreshold =
      mode === "eco-friendly" ? 2000 : mode === "cheapest" ? 1000 : 300;

    var breakdown = {
      total: 0,
      transit: 0,
      startTransport: 0,
      endTransport: 0,
      startType: "Walk",
      endType: "Walk",
    };

    if (startWalkDist > walkThreshold) {
      var distKm = startWalkDist / 1000;
      var estimatedMinutes = (distKm / 30) * 60;

      var grab = FARE_CONFIG.GRAB;
      breakdown.startTransport =
        (grab.baseFare +
          distKm * grab.perKmRate +
          estimatedMinutes * grab.perMinuteRate +
          grab.bookingFee) *
        grab.surgeMultiplier;
      breakdown.startType = "Grab";
    }

    if (path && path.length > 1) {
      var stops = path.length - 1;
      breakdown.transit = stops * FARE_CONFIG.TRANSIT_PER_STATION;
    }

    if (destWalkDist > walkThreshold) {
      var distKm = destWalkDist / 1000;
      var estimatedMinutes = (distKm / 30) * 60;

      var grab = FARE_CONFIG.GRAB;
      breakdown.endTransport =
        (grab.baseFare +
          distKm * grab.perKmRate +
          estimatedMinutes * grab.perMinuteRate +
          grab.bookingFee) *
        grab.surgeMultiplier;
      breakdown.endType = "Grab";
    }

    breakdown.total =
      breakdown.transit + breakdown.startTransport + breakdown.endTransport;

    breakdown.total = Math.round(breakdown.total * 100) / 100;
    breakdown.startTransport = Math.round(breakdown.startTransport * 100) / 100;
    breakdown.endTransport = Math.round(breakdown.endTransport * 100) / 100;
    breakdown.transit = Math.round(breakdown.transit * 100) / 100;

    return breakdown;
  };

  window.getWalkingThreshold = function () {
    var mode = window.routingMode || "fastest";
    if (mode === "eco-friendly") return 2000;
    if (mode === "cheapest") return 1000;
    if (mode === "comfort") return 300;
    return 300;
  };

  console.log("[Routing] Module initialized");
})();
