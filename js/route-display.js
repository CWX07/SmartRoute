// route-display.js
// Responsibilities: orchestrate map rendering using display/* modules.
(function () {
  var icons = window.DisplayIcons || {};
  var cards = window.DisplayCards || {};
  var walking = window.DisplayWalking || {};

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

  window.drawPublicTransportRoute = function (start, dest, startStation, destStation, path, routeData) {
    if (window.mapReady === false) {
      console.error("[Route Display] Map not ready (Leaflet missing)");
      return;
    }

    console.log("[Route Display] Drawing route from", start.name, "to", dest.name);

    var WALK_THRESHOLD = getWalkThreshold();
    console.log("[Route Display] Walking threshold for current mode:", WALK_THRESHOLD + "m");

    if (window.startMarker) window.startMarker.remove();
    if (window.destMarker) window.destMarker.remove();
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

    var startDist = window.distance(start.lat, start.lng, startStation.lat, startStation.lng);
    var destDist = window.distance(dest.lat, dest.lng, destStation.lat, destStation.lng);

    console.log("[Route Display] Start walk:", startDist.toFixed(0) + "m, Dest walk:", destDist.toFixed(0) + "m");

    if (startDist > 50) {
      var startFrom = { lat: start.lat, lng: start.lng, name: start.name };
      var startTo = { lat: startStation.lat, lng: startStation.lng, name: startStation.name };
      walking.drawWalkingOrGrab(startFrom, startTo, WALK_THRESHOLD, true);
    }

    if (path && path.length > 1) {
      console.log("[Route Display] Drawing transit path with", path.length, "stations");
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

      for (var j = 0; j < path.length - 1; j++) {
        var s1 = path[j];
        var s2 = path[j + 1];
        var routeId = (s1.route_id || "").toUpperCase();
        var routeColor = getRouteColor(routeId);

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
          var stationMarker = L.circleMarker([s1.lat, s1.lng], {
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

          stationMarker.on("mouseover", function () {
            this.openPopup();
          });
          stationMarker.on("mouseout", function () {
            this.closePopup();
          });

          window.stationMarkers.push(stationMarker);
          seenStations.add(s1.id);
        }
      }

      Object.keys(routeSegments).forEach(function (routeId) {
        routeSegments[routeId].forEach(function (segment) {
          if (segment.length > 1) {
            var midIdxSeg = Math.floor(segment.length / 2);
            var midStation = segment[midIdxSeg];

            var metrics =
              routeData && routeData.transitLines && routeData.transitLines[routeId]
                ? routeData.transitLines[routeId]
                : null;

            var transitMarker = L.marker([midStation.lat, midStation.lng], {
              icon: icons.createTransitIconMarker(routeId),
              interactive: true,
              zIndexOffset: 1500,
            }).addTo(map);

            transitMarker.bindPopup(cards.createTransitCard(routeId, metrics), {
              className: "transit-card-popup",
              closeButton: false,
              autoClose: false,
              closeOnClick: false,
            });

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
        var lastMarker = L.circleMarker([lastStation.lat, lastStation.lng], {
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

        lastMarker.on("mouseover", function () {
          this.openPopup();
        });
        lastMarker.on("mouseout", function () {
          this.closePopup();
        });

        window.stationMarkers.push(lastMarker);
        seenStations.add(lastStation.id);
      }
    }

    if (destDist > 50) {
      var destFrom = { lat: destStation.lat, lng: destStation.lng, name: destStation.name };
      var destTo = { lat: dest.lat, lng: dest.lng, name: dest.name };
      walking.drawWalkingOrGrab(destFrom, destTo, WALK_THRESHOLD, false);
    }

    var bounds = L.latLngBounds([start.lat, start.lng], [dest.lat, dest.lng]);
    window.stationMarkers.forEach(function (m) {
      bounds.extend(m.getLatLng());
    });
    map.fitBounds(bounds, { padding: [40, 40] });
  };

  console.log("[Route Display] Module initialized - using UnifiedCalc per-line fares");
})();
