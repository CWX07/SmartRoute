// calc/comfort.js
// Responsibilities: compute comfort score.
(function () {
  var roundToTwo = (window.CalcHelpers && window.CalcHelpers.roundToTwo) || function (n) { return Math.round(n * 100) / 100; };

  function computeComfortScore(segment, hour, ridershipData) {
    var seg = segment || {};
    var ridership = ridershipData || {};
    var type = seg.type || "transit";
    var line = seg.route_id || seg.routeId || null;
    var daily = ridership[line] || 100000;
    var baselineCrowd = daily / 300000;
    var h = typeof hour === "number" ? hour : new Date().getHours();
    var peakFactor = 1;
    if (h >= 7 && h <= 9) peakFactor = 1.4;
    if (h >= 17 && h <= 19) peakFactor = 1.5;

    var isTransit = type === "transit";
    var stationCount = seg.stops || seg.stopCount || (isTransit ? 8 : 1);

    var liveCrowd = 0;
    if (typeof seg.crowdFrom === "number") liveCrowd += seg.crowdFrom;
    if (typeof seg.crowdTo === "number") liveCrowd += seg.crowdTo;
    var liveAvg = liveCrowd > 0 ? liveCrowd / 2 : 0;

    var perStationCrowd =
      stationCount > 0 && isTransit
        ? (baselineCrowd / stationCount + liveAvg) / 2
        : isTransit
        ? baselineCrowd
        : 0;

    var distanceKm = seg.distance_km || seg.distanceKm || seg.distance || seg.distanceKM || 0;
    var walkingPenalty = 0;
    if (type === "walk") walkingPenalty = distanceKm * 0.15;

    var transferCount =
      typeof seg.transferCount === "number"
        ? seg.transferCount
        : seg.transfers || 0;
    var transferPenalty = seg.isTransfer ? 0.3 * Math.max(transferCount, 1) : 0;

    var score = perStationCrowd * peakFactor + walkingPenalty + transferPenalty;

    return Math.max(0, Math.min(score, 3));
  }

  window.computeComfortScore = computeComfortScore;
})();
