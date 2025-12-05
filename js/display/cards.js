// display/cards.js
// Responsibilities: build popup card HTML for transit, grab, and walking.
(function () {
  function createTransitCard(routeId, metrics) {
    var routeNames = {
      AG: "LRT Ampang Line",
      PH: "LRT Putra Heights Line",
      KJ: "LRT Kelana Jaya Line",
      MR: "Monorail",
      MRT: "MRT Kajang Line",
      PYL: "MRT Putrajaya Line",
      BRT: "BRT Sunway Line",
    };

    var safeMetrics = metrics || {};
    var stationCount = safeMetrics.stopCount || 0;
    var distanceKm =
      typeof safeMetrics.distanceKm === "number" ? safeMetrics.distanceKm : safeMetrics.distance || 0;

    var estimatedTime;
    if (typeof safeMetrics.timeMin === "number") {
      estimatedTime = safeMetrics.timeMin;
    } else if (distanceKm && window.UnifiedCalc && typeof window.UnifiedCalc.transitTimeFromDistance === "function") {
      estimatedTime = window.UnifiedCalc.transitTimeFromDistance(routeId, distanceKm, stationCount);
    } else if (window.UnifiedCalc && typeof window.UnifiedCalc.transitTimeMin === "function") {
      estimatedTime = window.UnifiedCalc.transitTimeMin(stationCount);
    } else {
      estimatedTime = 0;
    }

    var segmentFare = null;
    if (safeMetrics && typeof safeMetrics.fare === "number") {
      segmentFare = safeMetrics.fare; // use precomputed (cross-line aware) fare
    } else if (safeMetrics && typeof safeMetrics.distanceKm === "number" && window.UnifiedCalc) {
      var normalizedRoute = window.normalizeRouteId(routeId);
      segmentFare = window.UnifiedCalc.transitFareFromDistance(
        safeMetrics.distanceKm,
        normalizedRoute,
        safeMetrics.from || "",
        safeMetrics.to || ""
      );
    }

    var fareText = typeof segmentFare === "number" ? "RM " + segmentFare.toFixed(2) : "N/A";

    var distanceText = distanceKm
      ? distanceKm.toFixed(2) + " km" + (stationCount > 1 ? " (" + Math.max(stationCount - 1, 0) + " stops)" : "")
      : "N/A";

    return (
      '<div class="transit-card-content">' +
      '<div class="transit-card-header">' +
      '<span class="transit-icon">🚇</span>' +
      '<span class="transit-title">' +
      (routeNames[window.normalizeRouteId(routeId)] || window.normalizeRouteId(routeId)) +
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

  window.DisplayCards = {
    createTransitCard: createTransitCard,
    createGrabCard: createGrabCard,
    createWalkingCard: createWalkingCard,
  };
})();
