// display/icons.js
// Responsibilities: create map marker icons for grab/transit/walk.
(function () {
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
      html: '<div class="transit-icon-circle" data-route="' + routeId + '">🚇</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }

  function createWalkingIconMarker() {
    return L.divIcon({
      className: "walking-icon-marker",
      html: '<div class="walking-icon-circle">🚶</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }

  window.DisplayIcons = {
    createGrabIconMarker: createGrabIconMarker,
    createTransitIconMarker: createTransitIconMarker,
    createWalkingIconMarker: createWalkingIconMarker,
  };
})();
