// main/loaders.js
// Responsibilities: CSV parsing + loading GTFS, stations, fares, and fare model.
(function () {
  var ui = window.MainUI || {};
  var setInfo = ui.setInfo || function () {};
  var toggleAllLines = ui.toggleAllLines || function () {};

  function parseCSV(text) {
    var lines = text.split(/\r?\n/).filter(function (l) {
      return l.trim().length > 0;
    });
    if (lines.length === 0) return { headers: [], rows: [] };

    var headers = lines[0].split(",").map(function (h) {
      return h.trim();
    });

    var rows = lines.slice(1).map(function (line) {
      return line.split(",").map(function (v) {
        return v.trim();
      });
    });

    return { headers: headers, rows: rows };
  }

  function loadGTFSShapes() {
    if (!window.API_BASE) {
      console.warn("[GTFS] API_BASE not defined; cannot load shapes");
      return Promise.resolve();
    }

    console.log("[GTFS] Loading shapes.txt from server...");

    return window.fetchWithApiFallback("/gtfs/shapes.txt")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load shapes.txt");
        return res.text();
      })
      .then(function (text) {
        var parsed = parseCSV(text);
        var h = parsed.headers;
        var rows = parsed.rows;

        var idxShapeId = h.indexOf("shape_id");
        var idxLat = h.indexOf("shape_pt_lat");
        var idxLon = h.indexOf("shape_pt_lon");
        var idxSeq = h.indexOf("shape_pt_sequence");

        if (idxShapeId === -1 || idxLat === -1 || idxLon === -1 || idxSeq === -1) {
          console.error("[GTFS] shapes.txt missing required columns");
          return;
        }

        var shapes = {};

        rows.forEach(function (row) {
          var shapeId = row[idxShapeId];
          var lat = parseFloat(row[idxLat]);
          var lon = parseFloat(row[idxLon]);
          var seq = parseInt(row[idxSeq], 10);
          if (!shapeId || isNaN(lat) || isNaN(lon) || isNaN(seq)) return;

          if (!shapes[shapeId]) shapes[shapeId] = [];
          shapes[shapeId].push({ lat: lat, lon: lon, seq: seq });
        });

        Object.keys(shapes).forEach(function (id) {
          shapes[id].sort(function (a, b) {
            return a.seq - b.seq;
          });
        });

        window.GTFSShapes = shapes;
        console.log("[GTFS] Loaded", Object.keys(shapes).length, "shapes from shapes.txt");
      })
      .catch(function (err) {
        console.error("[GTFS] Failed to load shapes.txt:", err);
      });
  }

  function loadGTFSTripShapes() {
    if (!window.API_BASE) {
      console.warn("[GTFS] API_BASE not defined; cannot load trips");
      return Promise.resolve();
    }

    console.log("[GTFS] Loading trips.txt from server...");

    return window.fetchWithApiFallback("/gtfs/trips.txt")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load trips.txt");
        return res.text();
      })
      .then(function (text) {
        var parsed = parseCSV(text);
        var h = parsed.headers;
        var rows = parsed.rows;

        var idxRouteId = h.indexOf("route_id");
        var idxShapeId = h.indexOf("shape_id");
        if (idxRouteId === -1 || idxShapeId === -1) {
          console.error("[GTFS] trips.txt missing route_id/shape_id");
          return;
        }

        var routeShapes = {};
        rows.forEach(function (row) {
          var routeId = row[idxRouteId];
          var shapeId = row[idxShapeId];
          if (!routeId || !shapeId) return;

          if (!routeShapes[routeId]) routeShapes[routeId] = shapeId;

          // If multiple shapes per route, keep the first one we see
          if (!routeShapes[routeId]) {
            routeShapes[routeId] = shapeId;
          }
        });

        window.RouteShapes = routeShapes;
        console.log("[GTFS] Mapped", Object.keys(routeShapes).length, "routes to shapes from trips.txt");
      })
      .catch(function (err) {
        console.error("[GTFS] Failed to load trips.txt:", err);
      });
  }

  function loadGTFSData() {
    return Promise.all([loadGTFSShapes(), loadGTFSTripShapes()]);
  }

  function loadStations() {
    setInfo("Loading stations...");

    window.fetchWithApiFallback("/output/station.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load station data");
        return res.json();
      })
      .then(function (data) {
        window.stations = data;
        setInfo("Stations loaded (" + data.length + " stations)");

        window.stationMarkersByRoute = {};
        window.routeLines = {};
        window.activeLineRoutes = new Set();

        if (typeof window.buildStationGraph === "function") {
          window.buildStationGraph(window.stations);
          console.log("[Main] Station graph built");
        }

        var routeGroups = {};

        data.forEach(function (station) {
          if (typeof station.lat !== "number" || typeof station.lng !== "number") return;

          var routeId = station.route_id || "OTHER";
          if (!routeGroups[routeId]) routeGroups[routeId] = [];
          routeGroups[routeId].push(station);

          var crowdLevel = station.crowd || 0;
          var color = typeof window.getRouteColor === "function" ? window.getRouteColor(routeId) : "#54c1ff";
          var radius = 4 + Math.min(crowdLevel * 10, 6);

          var marker = L.circleMarker([station.lat, station.lng], {
            radius: radius,
            color: color,
            fillColor: color,
            fillOpacity: 0.6,
            weight: 2,
          }).bindPopup(
            (station.name || station.id) +
              "<br>Crowd: " +
              ((crowdLevel || 0) * 100).toFixed(1) +
              "%" +
              "<br>Route: " +
              (station.route_id || "N/A")
          );

          if (!window.stationMarkersByRoute[routeId]) {
            window.stationMarkersByRoute[routeId] = [];
          }
          window.stationMarkersByRoute[routeId].push(marker);
        });

        Object.keys(routeGroups).forEach(function (routeId) {
          var stations = routeGroups[routeId].slice().sort(function (a, b) {
            var ma = a.id && a.id.match(/\d+/);
            var mb = b.id && b.id.match(/\d+/);
            var numA = ma ? parseInt(ma[0], 10) : NaN;
            var numB = mb ? parseInt(mb[0], 10) : NaN;
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return (a.id || "").localeCompare(b.id || "");
          });
          if (stations.length < 2) return;

          var lineLatLngs = null;

          if (window.GTFSShapes && window.RouteShapes) {
            var gtfsRouteId = (window.ROUTE_ID_ALIAS && window.ROUTE_ID_ALIAS[routeId]) || routeId;
            var shapeId = window.RouteShapes[gtfsRouteId];

            if (!shapeId && window.GTFSShapes) {
              for (var sid in window.GTFSShapes) {
                if (sid.startsWith("shp_PH_") && gtfsRouteId === "SP") {
                  shapeId = sid;
                  break;
                }
                if (
                  (sid.startsWith("shp_MRT_") || sid.startsWith("MRT") || sid.includes("KGL") || sid.includes("SBK")) &&
                  gtfsRouteId === "MRT"
                ) {
                  shapeId = sid;
                  break;
                }
              }
            }

            if (!shapeId) {
              console.warn("[GTFS] Shape missing for route:", gtfsRouteId, "→ using fallback");
            }

            if (shapeId && window.GTFSShapes[shapeId]) {
              var shapePoints = window.GTFSShapes[shapeId];
              if (shapePoints && shapePoints.length > 1) {
                lineLatLngs = shapePoints.map(function (p) {
                  return [p.lat, p.lon];
                });
              }
            }
          }

          if (!lineLatLngs || lineLatLngs.length < 5) {
            console.warn("[GTFS] Shape missing for route:", routeId, "→ using fallback");
            lineLatLngs = stations.map(function (s) {
              return [s.lat, s.lng];
            });
          }

          var polyline = L.polyline(lineLatLngs, {
            color: typeof window.getRouteColor === "function" ? window.getRouteColor(routeId) : "#54c1ff",
            weight: 5,
            opacity: 0.85,
            dashArray: "12,8",
            lineJoin: "round",
            lineCap: "round",
          });

          window.routeLines[routeId] = polyline;
        });

        toggleAllLines(true);
        console.log("[Main] Station markers rendered");

        if (window.Crowd) {
          window.Crowd.startHourlyUpdates();
        }

        if (window.InputHandler && typeof window.InputHandler.init === "function") {
          window.InputHandler.init();
        } else {
          console.warn("[Main] InputHandler not available");
        }
      })
      .catch(function (err) {
        console.error("[Main] Error loading stations:", err);
        setInfo("Failed to load stations");
      });
  }

  function loadFareTable() {
    if (!window.API_BASE) {
      console.warn("[Fare] API_BASE not defined; skipping fare table load");
      return Promise.resolve();
    }

    console.log("[Fare] Loading fare table from server...");

    return window.fetchWithApiFallback("/fare/fares.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load fares.json");
        return res.json();
      })
      .then(function (data) {
        var lineData = data.lines || data;
        var crossData = data.cross_lines || data.crossLines || {};

        var lineLookup = {};
        Object.keys(lineData).forEach(function (group) {
          var groupId = group.toUpperCase();
          var raw = lineData[group];
          var table = {};
          Object.keys(raw || {}).forEach(function (key) {
            table[key.toUpperCase()] = raw[key];
          });
          lineLookup[groupId] = table;
        });

        var crossLookup = {};
        Object.keys(crossData || {}).forEach(function (pairKey) {
          var upperKey = pairKey.toUpperCase();
          var rawPair = crossData[pairKey];
          var table = {};
          Object.keys(rawPair || {}).forEach(function (key) {
            table[key.toUpperCase()] = rawPair[key];
          });
          crossLookup[upperKey] = table;
        });

        window.FARE_TABLE = lineLookup;
        window.FareLookup = lineLookup;
        window.FARE_TABLE_CROSS = crossLookup;
        window.FareLookupCross = crossLookup;

        console.log("[Fare] Loaded fare table for", {
          lines: Object.keys(lineLookup).length,
          cross_lines: Object.keys(crossLookup).length,
        });
      })
      .catch(function (err) {
        console.warn("[Fare] Failed to load fare table:", err);
      });
  }

  function loadFareModel() {
    if (!window.API_BASE) {
      console.warn("[FareModel] API_BASE not defined; skipping model load");
      return Promise.resolve();
    }

    console.log("[FareModel] Loading fare model from server...");

    return window.fetchWithApiFallback("/fare-model")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load fare model");
        return res.json();
      })
      .then(function (payload) {
        if (payload && payload.ok && payload.model) {
          window.FareModel = payload.model;
          console.log("[FareModel] Loaded model for lines:", Object.keys(payload.model.lines || {}));
        } else {
          console.warn("[FareModel] No model in response payload");
        }
      })
      .catch(function (err) {
        console.warn("[FareModel] Failed to load fare model:", err);
      });
  }

  window.MainLoaders = {
    parseCSV: parseCSV,
    loadGTFSShapes: loadGTFSShapes,
    loadGTFSTripShapes: loadGTFSTripShapes,
    loadGTFSData: loadGTFSData,
    loadStations: loadStations,
    loadFareTable: loadFareTable,
    loadFareModel: loadFareModel,
  };
})();
