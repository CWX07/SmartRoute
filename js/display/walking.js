// display/walking.js
// Responsibilities: draw start/end walking or grab segments with popups.
(function () {
  var icons = window.DisplayIcons || {};
  var cards = window.DisplayCards || {};

  function drawWalkingOrGrab(start, dest, threshold, isStart) {
    var from = isStart ? start : { lat: start.lat, lng: start.lng };
    var to = isStart ? dest : { lat: dest.lat, lng: dest.lng };

    var useDrive = false;
    if (!window.fetchWalkingDistance || !window.fetchDrivingDistance || !window.fetchWalkingRoute || !window.fetchDrivingRoute) {
      console.warn("[Route Display] Routing fetch unavailable for walking/grab segment");
      return;
    }

    window.fetchWalkingDistance(from, to)
      .then(function (walkDist) {
        if (walkDist > threshold) {
          useDrive = true;
          return Promise.all([walkDist, window.fetchDrivingRoute(from, to)]);
        } else {
          return Promise.all([walkDist, window.fetchWalkingRoute(from, to)]);
        }
      })
      .then(function (results) {
        var distanceMeters = results[0];
        var geom = results[1];
        var overThreshold = distanceMeters > threshold;

        if (overThreshold) {
          var glow = L.geoJSON(geom, {
            style: {
              color: "rgba(139, 92, 246, 0.4)",
              weight: 12,
              opacity: 0.6,
              lineCap: "round",
              lineJoin: "round",
            },
          }).addTo(map);
          window.grabLayers.push(glow);

          var layer = L.geoJSON(geom, {
            style: {
              color: "#8B5CF6",
              weight: 6,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            },
          }).addTo(map);
          window.grabLayers.push(layer);

          var coords = geom.coordinates;
          var midIdx = Math.floor(coords.length / 2);
          var midPoint = coords[midIdx];

          var marker = L.marker([midPoint[1], midPoint[0]], {
            icon: icons.createGrabIconMarker(),
            interactive: true,
            zIndexOffset: 2000,
          }).addTo(map);

          marker.bindPopup(cards.createGrabCard(start.name, dest.name, distanceMeters), {
            className: "grab-card-popup",
            closeButton: false,
            autoClose: false,
            closeOnClick: false,
          });

          marker.on("mouseover", function () {
            this.openPopup();
          });
          marker.on("mouseout", function () {
            this.closePopup();
          });

          window.grabLayers.push(marker);
        } else {
          var layerWalk = L.geoJSON(geom, {
            style: {
              color: "#54c1ff",
              weight: 6,
              opacity: 0.9,
              dashArray: "2,8",
            },
          }).addTo(map);
          window.routeLayers.push(layerWalk);

          var coordsWalk = geom.coordinates;
          var midIdxWalk = Math.floor(coordsWalk.length / 2);
          var midPointWalk = coordsWalk[midIdxWalk];

          var markerWalk = L.marker([midPointWalk[1], midPointWalk[0]], {
            icon: icons.createWalkingIconMarker(),
            interactive: true,
            zIndexOffset: 2000,
          }).addTo(map);

          markerWalk.bindPopup(cards.createWalkingCard(start.name, dest.name, distanceMeters), {
            className: "walking-card-popup",
            closeButton: false,
            autoClose: false,
            closeOnClick: false,
          });

          markerWalk.on("mouseover", function () {
            this.openPopup();
          });
          markerWalk.on("mouseout", function () {
            this.closePopup();
          });

          window.routeLayers.push(markerWalk);
        }
      })
      .catch(function (err) {
        console.warn("[Route Display] Route segment failed:", err);
      });
  }

  window.DisplayWalking = { drawWalkingOrGrab: drawWalkingOrGrab };
})();
