// route-display.js - FIXED to use calc-unified.js with matching numbers

(function () {
  function getWalkThreshold() {
    if (typeof window.getWalkingThreshold === "function") {
      return window.getWalkingThreshold();
    }
    return 300;
  }

  function getRouteColor(routeId) {
    if (window.getRouteColor) return window.getRouteColor(routeId);
    return "#54c1ff";
  }

  function createGrabIconMarker() {
    return L.divIcon({
      className: "grab-icon-marker",
      html: '<div class="grab-icon-circle">🚗</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }

  function createTransitIconMarker(routeId) {
    return L.divIcon({
      className: "transit-icon-marker",
      html:
        '<div class="transit-icon-circle" data-route="' +
        routeId +
        '">🚇</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }

  function createTransitCard(routeId, stationCount, segmentFare, distanceKm) {
    var routeNames = {
      AG: "LRT Ampang Line",
      PH: "LRT Putra Heights Line",
      KJ: "LRT Kelana Jaya Line",
      MR: "Monorail",
      MRT: "MRT Kajang Line",
      PYL: "MRT Putrajaya Line",
      BRT: "BRT Sunway Line",
    };

    var estimatedTime = window.UnifiedCalc.transitTimeMin(stationCount);
    var fareText = segmentFare ? "RM " + segmentFare.toFixed(2) : "N/A";
    var distanceText = distanceKm
      ? distanceKm.toFixed(1) + " km (" + (stationCount - 1) + " stops)"
      : "N/A";

    return (
      '<div class="transit-card-content">' +
      '<div class="transit-card-header">' +
      '<span class="transit-icon">🚇</span>' +
      '<span class="transit-title">' +
      (routeNames[routeId] || routeId) +
      "</span>" +
      "</div>" +
      '<div class="transit-card-body">' +
      '<div class="transit-stat">' +
      '<span class="transit-label">Distance</span>' +
      '<span class="transit-value">' +
      distanceText +
      "</span>" +
      "</div>" +
      '<div class="transit-stat">' +
      '<span class="transit-label">Est. Time</span>' +
      '<span class="transit-value">~' +
      estimatedTime +
      " min</span>" +
      "</div>" +
      '<div class="transit-stat">' +
      '<span class="transit-label">Fare</span>' +
      '<span class="transit-value">' +
      fareText +
      "</span>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function createWalkingIconMarker() {
    return L.divIcon({
      className: "walking-icon-marker",
      html: '<div class="walking-icon-circle">🚶</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }

  function createGrabCard(from, to, distanceMeters) {
    var distKm = window.UnifiedCalc.distanceKm(distanceMeters);
    var estimatedMinutes = window.UnifiedCalc.grabTimeMin(distanceMeters);
    var grabFare = window.UnifiedCalc.grabFare(distanceMeters);

    return (
      '<div class="grab-card-content">' +
      '<div class="grab-card-header">' +
      '<span class="grab-icon">🚗</span>' +
      '<span class="grab-title">Grab Ride</span>' +
      "</div>" +
      '<div class="grab-card-body">' +
      '<div class="grab-stat">' +
      '<span class="grab-label">Distance</span>' +
      '<span class="grab-value">' +
      distKm +
      " km</span>" +
      "</div>" +
      '<div class="grab-stat">' +
      '<span class="grab-label">Est. Time</span>' +
      '<span class="grab-value">~' +
      estimatedMinutes +
      " min</span>" +
      "</div>" +
      '<div class="grab-stat">' +
      '<span class="grab-label">Fare</span>' +
      '<span class="grab-value">RM ' +
      grabFare.toFixed(2) +
      "</span>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function createWalkingCard(from, to, distanceMeters) {
    var distKm = window.UnifiedCalc.distanceKm(distanceMeters);
    var estimatedTime = window.UnifiedCalc.walkingTimeMin(distanceMeters);

    return (
      '<div class="walking-card-content">' +
      '<div class="walking-card-header">' +
      '<span class="walking-icon">🚶</span>' +
      '<span class="walking-title">Walking Route</span>' +
      "</div>" +
      '<div class="walking-card-body">' +
      '<div class="walking-stat">' +
      '<span class="walking-label">Distance</span>' +
      '<span class="walking-value">' +
      distKm +
      " km</span>" +
      "</div>" +
      '<div class="walking-stat">' +
      '<span class="walking-label">Est. Time</span>' +
      '<span class="walking-value">~' +
      estimatedTime +
      " min</span>" +
      "</div>" +
      '<div class="walking-stat">' +
      '<span class="walking-label">Fare</span>' +
      '<span class="walking-value">Free</span>' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  window.drawPublicTransportRoute = function (
    start,
    dest,
    startStation,
    destStation,
    path
  ) {
    console.log(
      "[Route Display] Drawing route from",
      start.name,
      "to",
      dest.name
    );

    var WALK_THRESHOLD = getWalkThreshold();
    console.log(
      "[Route Display] Walking threshold for current mode:",
      WALK_THRESHOLD + "m"
    );

    if (window.startMarker) window.startMarker.remove();
    if (window.destMarker) window.destMarker.remove();
    if (window.routeLayer) window.routeLayer.remove();
    if (!window.stationMarkers) window.stationMarkers = [];
    if (!window.routeLayers) window.routeLayers = [];
    if (!window.grabLayers) window.grabLayers = [];

    window.stationMarkers.forEach(function (m) {
      m.remove();
    });
    window.routeLayers.forEach(function (l) {
      l.remove();
    });
    window.grabLayers.forEach(function (l) {
      l.remove();
    });
    window.stationMarkers = [];
    window.routeLayers = [];
    window.grabLayers = [];

    window.startMarker = L.marker([start.lat, start.lng], {
      icon: window.startIcon,
      interactive: false,
      zIndexOffset: 1000,
    })
      .addTo(map)
      .bindPopup("Start: " + (start.name || ""));

    window.destMarker = L.marker([dest.lat, dest.lng], {
      icon: window.destIcon,
      interactive: false,
      zIndexOffset: 1000,
    })
      .addTo(map)
      .bindPopup("Destination: " + (dest.name || ""));

    var startDist = window.distance(
      start.lat,
      start.lng,
      startStation.lat,
      startStation.lng
    );
    var destDist = window.distance(
      dest.lat,
      dest.lng,
      destStation.lat,
      destStation.lng
    );

    console.log(
      "[Route Display] Start walk:",
      startDist.toFixed(0) + "m, Dest walk:",
      destDist.toFixed(0) + "m"
    );

    // START segment
    if (startDist > 50) {
      if (startDist > WALK_THRESHOLD) {
        console.log(
          "[Route Display] Drawing GRAB for START (>" + WALK_THRESHOLD + "m)"
        );

        window
          .fetchWalkingRoute(start, {
            lat: startStation.lat,
            lng: startStation.lng,
          })
          .then(function (walkingGeom) {
            var grabGlowLayer = L.geoJSON(walkingGeom, {
              style: {
                color: "rgba(139, 92, 246, 0.4)",
                weight: 12,
                opacity: 0.6,
                lineCap: "round",
                lineJoin: "round",
              },
            }).addTo(map);
            window.grabLayers.push(grabGlowLayer);

            var grabLayer = L.geoJSON(walkingGeom, {
              style: {
                color: "#8B5CF6",
                weight: 6,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              },
            }).addTo(map);
            window.grabLayers.push(grabLayer);

            var coords = walkingGeom.coordinates;
            var midIdx = Math.floor(coords.length / 2);
            var midPoint = coords[midIdx];

            var grabMarker = L.marker([midPoint[1], midPoint[0]], {
              icon: createGrabIconMarker(),
              interactive: true,
              zIndexOffset: 2000,
            }).addTo(map);

            grabMarker.bindPopup(
              createGrabCard(start.name, startStation.name, startDist),
              {
                className: "grab-card-popup",
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
              }
            );

            grabMarker.on("mouseover", function () {
              this.openPopup();
            });
            grabMarker.on("mouseout", function () {
              this.closePopup();
            });

            window.grabLayers.push(grabMarker);

            console.log("[Route Display] Grab route START drawn (PURPLE)");
          })
          .catch(function (err) {
            console.warn("[Route Display] Grab route START failed:", err);
          });
      } else {
        console.log(
          "[Route Display] Drawing WALKING for START (<=" +
            WALK_THRESHOLD +
            "m)"
        );
        window
          .fetchWalkingRoute(start, {
            lat: startStation.lat,
            lng: startStation.lng,
          })
          .then(function (walkingGeom) {
            var walkingLayer = L.geoJSON(walkingGeom, {
              style: {
                color: "#54c1ff",
                weight: 6,
                opacity: 0.9,
                dashArray: "2,8",
              },
            }).addTo(map);
            window.routeLayers.push(walkingLayer);

            var coords = walkingGeom.coordinates;
            var midIdx = Math.floor(coords.length / 2);
            var midPoint = coords[midIdx];

            var walkingMarker = L.marker([midPoint[1], midPoint[0]], {
              icon: createWalkingIconMarker(),
              interactive: true,
              zIndexOffset: 2000,
            }).addTo(map);

            walkingMarker.bindPopup(
              createWalkingCard(start.name, startStation.name, startDist),
              {
                className: "walking-card-popup",
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
              }
            );

            walkingMarker.on("mouseover", function () {
              this.openPopup();
            });
            walkingMarker.on("mouseout", function () {
              this.closePopup();
            });

            window.routeLayers.push(walkingMarker);
          })
          .catch(function (err) {
            console.warn("[Route Display] Walking route START failed:", err);
          });
      }
    }

    // TRANSIT segment
    if (path && path.length > 1) {
      console.log(
        "[Route Display] Drawing transit path with",
        path.length,
        "stations"
      );
      var seenStations = new Set();
      var routeSegments = {};

      var currentRoute = path[0].route_id;
      var currentSegment = [path[0]];

      for (var i = 1; i < path.length; i++) {
        if (path[i].route_id === currentRoute) {
          currentSegment.push(path[i]);
        } else {
          if (!routeSegments[currentRoute]) routeSegments[currentRoute] = [];
          routeSegments[currentRoute].push(currentSegment);

          currentRoute = path[i].route_id;
          currentSegment = [path[i]];
        }
      }

      if (!routeSegments[currentRoute]) routeSegments[currentRoute] = [];
      routeSegments[currentRoute].push(currentSegment);

      for (var i = 0; i < path.length - 1; i++) {
        var s1 = path[i];
        var s2 = path[i + 1];
        var routeColor = getRouteColor(s1.route_id);

        var glowLine = L.polyline(
          [
            [s1.lat, s1.lng],
            [s2.lat, s2.lng],
          ],
          {
            color: "rgba(255,255,255,0.3)",
            weight: 11,
            opacity: 0.55,
            lineCap: "round",
            lineJoin: "round",
          }
        ).addTo(map);
        window.routeLayers.push(glowLine);

        var transitLine = L.polyline(
          [
            [s1.lat, s1.lng],
            [s2.lat, s2.lng],
          ],
          {
            color: routeColor,
            weight: 6,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
          }
        ).addTo(map);
        window.routeLayers.push(transitLine);

        if (!seenStations.has(s1.id)) {
          var marker = L.circleMarker([s1.lat, s1.lng], {
            radius: 10,
            color: "#050916",
            fillColor: routeColor,
            fillOpacity: 1,
            weight: 3,
            className: "route-station",
          })
            .addTo(map)
            .bindPopup(
              '<div class="station-card-content">' +
                '<div class="station-card-header">' +
                '<span class="station-icon">🚉</span>' +
                '<span class="station-name">' +
                s1.name +
                "</span>" +
                "</div>" +
                '<div class="station-card-body">' +
                '<div class="station-stat">' +
                '<span class="station-label">Crowd Level</span>' +
                '<span class="station-value">' +
                ((s1.crowd || 0) * 100).toFixed(1) +
                "%</span>" +
                "</div>" +
                '<div class="station-stat">' +
                '<span class="station-label">Line</span>' +
                '<span class="station-value">' +
                s1.route_id +
                "</span>" +
                "</div>" +
                "</div>" +
                "</div>",
              {
                className: "station-card-popup",
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
              }
            );

          marker.on("mouseover", function () {
            this.openPopup();
          });
          marker.on("mouseout", function () {
            this.closePopup();
          });

          window.stationMarkers.push(marker);
          seenStations.add(s1.id);
        }
      }

      Object.keys(routeSegments).forEach(function (routeId) {
        routeSegments[routeId].forEach(function (segment) {
          if (segment.length > 1) {
            var midIdx = Math.floor(segment.length / 2);
            var midStation = segment[midIdx];

            var segmentDistanceMeters = 0;
            for (var i = 0; i < segment.length - 1; i++) {
              segmentDistanceMeters += window.distance(
                segment[i].lat,
                segment[i].lng,
                segment[i + 1].lat,
                segment[i + 1].lng
              );
            }
            var segmentDistanceKm = window.UnifiedCalc.distanceKm(segmentDistanceMeters);
            var segmentFare = window.UnifiedCalc.transitFare(segment.length);

            var transitMarker = L.marker([midStation.lat, midStation.lng], {
              icon: createTransitIconMarker(routeId),
              interactive: true,
              zIndexOffset: 1500,
            }).addTo(map);

            transitMarker.bindPopup(
              createTransitCard(
                routeId,
                segment.length,
                segmentFare,
                segmentDistanceKm
              ),
              {
                className: "transit-card-popup",
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
              }
            );

            transitMarker.on("mouseover", function () {
              this.openPopup();
            });
            transitMarker.on("mouseout", function () {
              this.closePopup();
            });

            window.routeLayers.push(transitMarker);
          }
        });
      });

      var lastStation = path[path.length - 1];
      if (!seenStations.has(lastStation.id)) {
        var marker = L.circleMarker([lastStation.lat, lastStation.lng], {
          radius: 10,
          color: "#050916",
          fillColor: getRouteColor(lastStation.route_id),
          fillOpacity: 1,
          weight: 3,
          className: "route-station",
        })
          .addTo(map)
          .bindPopup(
            '<div class="station-card-content">' +
              '<div class="station-card-header">' +
              '<span class="station-icon">🚉</span>' +
              '<span class="station-name">' +
              lastStation.name +
              "</span>" +
              "</div>" +
              '<div class="station-card-body">' +
              '<div class="station-stat">' +
              '<span class="station-label">Crowd Level</span>' +
              '<span class="station-value">' +
              ((lastStation.crowd || 0) * 100).toFixed(1) +
              "%</span>" +
              "</div>" +
              '<div class="station-stat">' +
              '<span class="station-label">Line</span>' +
              '<span class="station-value">' +
              lastStation.route_id +
              "</span>" +
              "</div>" +
              "</div>" +
              "</div>",
            {
              className: "station-card-popup",
              closeButton: false,
              autoClose: false,
              closeOnClick: false,
            }
          );

        marker.on("mouseover", function () {
          this.openPopup();
        });
        marker.on("mouseout", function () {
          this.closePopup();
        });

        window.stationMarkers.push(marker);
        seenStations.add(lastStation.id);
      }
    }

    // END segment
    if (destDist > 50) {
      if (destDist > WALK_THRESHOLD) {
        console.log(
          "[Route Display] Drawing GRAB for DESTINATION (>" +
            WALK_THRESHOLD +
            "m)"
        );

        window
          .fetchWalkingRoute(
            { lat: destStation.lat, lng: destStation.lng },
            dest
          )
          .then(function (walkingGeom) {
            var grabGlowLayer = L.geoJSON(walkingGeom, {
              style: {
                color: "rgba(139, 92, 246, 0.4)",
                weight: 12,
                opacity: 0.6,
                lineCap: "round",
                lineJoin: "round",
              },
            }).addTo(map);
            window.grabLayers.push(grabGlowLayer);

            var grabLayer = L.geoJSON(walkingGeom, {
              style: {
                color: "#8B5CF6",
                weight: 6,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              },
            }).addTo(map);
            window.grabLayers.push(grabLayer);

            var coords = walkingGeom.coordinates;
            var midIdx = Math.floor(coords.length / 2);
            var midPoint = coords[midIdx];

            var grabMarker = L.marker([midPoint[1], midPoint[0]], {
              icon: createGrabIconMarker(),
              interactive: true,
              zIndexOffset: 2000,
            }).addTo(map);

            grabMarker.bindPopup(
              createGrabCard(destStation.name, dest.name, destDist),
              {
                className: "grab-card-popup",
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
              }
            );

            grabMarker.on("mouseover", function () {
              this.openPopup();
            });
            grabMarker.on("mouseout", function () {
              this.closePopup();
            });

            window.grabLayers.push(grabMarker);

            console.log(
              "[Route Display] Grab route DESTINATION drawn (PURPLE)"
            );
          })
          .catch(function (err) {
            console.warn("[Route Display] Grab route DESTINATION failed:", err);
          });
      } else {
        console.log(
          "[Route Display] Drawing WALKING for DESTINATION (<=" +
            WALK_THRESHOLD +
            "m)"
        );
        window
          .fetchWalkingRoute(
            { lat: destStation.lat, lng: destStation.lng },
            dest
          )
          .then(function (walkingGeom) {
            var walkingLayer = L.geoJSON(walkingGeom, {
              style: {
                color: "#54c1ff",
                weight: 6,
                opacity: 0.9,
                dashArray: "2,8",
              },
            }).addTo(map);
            window.routeLayers.push(walkingLayer);

            var coords = walkingGeom.coordinates;
            var midIdx = Math.floor(coords.length / 2);
            var midPoint = coords[midIdx];

            var walkingMarker = L.marker([midPoint[1], midPoint[0]], {
              icon: createWalkingIconMarker(),
              interactive: true,
              zIndexOffset: 2000,
            }).addTo(map);

            walkingMarker.bindPopup(
              createWalkingCard(destStation.name, dest.name, destDist),
              {
                className: "walking-card-popup",
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
              }
            );

            walkingMarker.on("mouseover", function () {
              this.openPopup();
            });
            walkingMarker.on("mouseout", function () {
              this.closePopup();
            });

            window.routeLayers.push(walkingMarker);
          })
          .catch(function (err) {
            console.warn(
              "[Route Display] Walking route DESTINATION failed:",
              err
            );
          });
      }
    }

    var bounds = L.latLngBounds([start.lat, start.lng], [dest.lat, dest.lng]);
    window.stationMarkers.forEach(function (m) {
      bounds.extend(m.getLatLng());
    });
    map.fitBounds(bounds, { padding: [40, 40] });
  };

  console.log("[Route Display] Module initialized - using calc-unified.js");
})();