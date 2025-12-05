// calc/path.js
// Responsibilities: transit distance/metrics and complete route assembly.
(function () {
  var helpers = window.CalcHelpers || {};
  var roundToTwo = helpers.roundToTwo || function (n) { return Math.round(n * 100) / 100; };
  var normalizeRouteId = helpers.normalizeRouteId || function (rid) { return rid ? String(rid).toUpperCase() : null; };
  var getTransferFee = helpers.getTransferFee || function () { return 0; };
  var legDistanceKm = helpers.legDistanceKm || function () { return 0; };
  var normalizeLinePairKey = helpers.normalizeLinePairKey || function () { return null; };
  var lookupCrossFareByStations = helpers.lookupCrossFareByStations || function () { return null; };
  var fareFromCrossModel = helpers.fareFromCrossModel || function () { return null; };

  var time = window.CalcTime || {};
  var fareCalc = window.CalcFare || {};

  function distanceKm(meters) {
    return parseFloat((meters / 1000).toFixed(2));
  }

  function transitDistance(path) {
    if (!path || path.length < 2) return 0;
    var totalDist = 0;
    for (var i = 0; i < path.length - 1; i++) {
      totalDist += legDistanceKm(path[i], path[i + 1]) * 1000; // convert km to meters for consistency
    }
    return totalDist;
  }

  function transitMetricsFromPath(path) {
    if (!path || path.length < 2) {
      return {
        distanceKm: 0,
        timeMin: 0,
        fare: 0,
        stopCount: path && path.length ? path.length : 0,
        routeId: null,
      };
    }

    var totalMeters = 0;
      var runningMinutes = 0;
      var stopCount = path.length;
    var dominantRoute = path[0].route_id || null;
    var routeSet = {};
    var uniqueRoutes = [];

    for (var r = 0; r < path.length; r++) {
      var rid = normalizeRouteId(path[r].route_id || dominantRoute);
      if (rid && !routeSet[rid]) {
        routeSet[rid] = true;
        uniqueRoutes.push(rid);
      }
    }

    for (var i = 0; i < path.length - 1; i++) {
      var s1 = path[i];
      var s2 = path[i + 1];

        var legKm = legDistanceKm(s1, s2);
        totalMeters += legKm * 1000;

        var routeId = s1.route_id || dominantRoute;
        if (time && typeof time.transitTimeFromDistance === "function") {
          runningMinutes += time.transitTimeFromDistance(routeId, legKm, 2);
        } else {
          var runningSpeed = (window.CalcHelpers && window.CalcHelpers.getRouteSpeed)
            ? window.CalcHelpers.getRouteSpeed(routeId)
            : 30;
          runningMinutes += (legKm / runningSpeed) * 60;
        }
      }

    var transferCount = 0;
    for (var t = 1; t < path.length; t++) {
      var prevRoute = normalizeRouteId(path[t - 1].route_id);
      var currRoute = normalizeRouteId(path[t].route_id);
      if (prevRoute && currRoute && prevRoute !== currRoute) {
        transferCount++;
      }
    }

    var dwellMinutes = Math.max(stopCount - 1, 0) * ((window.CalcConstants && window.CalcConstants.DWELL_TIME_PER_STOP_MIN) || 0.5);
    var totalMinutes = runningMinutes + dwellMinutes;

    var distanceKmVal = parseFloat((totalMeters / 1000).toFixed(2));

    var first = path[0];
    var last = path[path.length - 1];

    var fare = null;

    if (uniqueRoutes.length > 1) {
      var pairKey = normalizeLinePairKey([uniqueRoutes[0], uniqueRoutes[uniqueRoutes.length - 1]]);
      if (pairKey) {
        var lookupFare = lookupCrossFareByStations(
          pairKey,
          (first.name || first.station_name || "").toUpperCase(),
          (last.name || last.station_name || "").toUpperCase()
        );
        if (typeof lookupFare === "number") {
          fare = lookupFare;
        } else {
          fare = fareFromCrossModel(pairKey, distanceKmVal, transferCount);
        }
      }
    }

    if (fare === null && fareCalc.transitFareFromDistance) {
      fare = fareCalc.transitFareFromDistance(
        distanceKmVal,
        dominantRoute,
        (first.name || first.station_name || "").toUpperCase(),
        (last.name || last.station_name || "").toUpperCase()
      );
    }

    return {
      distanceKm: distanceKmVal,
      timeMin: Math.round(totalMinutes),
      fare: fare,
      stopCount: stopCount,
      routeId: dominantRoute,
      transferCount: transferCount,
      uniqueRoutes: uniqueRoutes,
      totalMeters: totalMeters,
      runningMinutes: runningMinutes,
    };
  }

  function completeRoute(startDist, path, destDist, threshold) {
    var segments = [];
    var totals = { distance: 0, time: 0, fare: 0 };
    var transitLines = null;

    var comfortHour =
      typeof window !== "undefined" && typeof window.currentComfortHour === "number"
        ? window.currentComfortHour
        : new Date().getHours();

    var ridershipData = (typeof window !== "undefined" && window.RIDERSHIP_DATA) || {};

    var computeComfort = typeof window !== "undefined" ? window.computeComfortScore : null;

    function annotateComfort(segment) {
      if (typeof computeComfort !== "function" || !segment) return;
      var stops = segment.stopCount || segment.stops;
      if (!stops) {
        stops = segment.type === "transit" ? (path ? path.length : 0) : 1;
      }
      var normalized = {
        route_id:
          segment.route_id ||
          segment.routeId ||
          (segment.type === "transit" && segment.routeId) ||
          null,
        stops: stops,
        type: segment.type,
        distance_km:
          typeof segment.distance === "number" ? segment.distance : segment.distance_km || 0,
        isTransfer: !!segment.isTransfer,
        transferCount:
          typeof segment.transferCount === "number" ? segment.transferCount : segment.transfers || 0,
      };
      var baseline = computeComfort(normalized, comfortHour, ridershipData);
      segment.comfort = {
        baseline: baseline,
        aiAdjusted: null,
      };
    }

    var transferCount = 0;
    if (path && path.length > 1) {
      for (var ti = 1; ti < path.length; ti++) {
        var prev = path[ti - 1];
        var curr = path[ti];
        if (prev.route_id && curr.route_id && prev.route_id !== curr.route_id) {
          transferCount++;
        }
      }
    }

    if (startDist > 50) {
      var startSeg = segmentStartEnd(startDist, threshold);
      var startSegment = {
        position: "start",
        type: startSeg.type,
        distance: startSeg.distance,
        time: startSeg.time,
        fare: startSeg.fare,
        route_id: null,
        stopCount: 1,
      };
      segments.push(startSegment);
      annotateComfort(startSegment);
      totals.distance += startSeg.distance;
      totals.time += startSeg.time;
      totals.fare += startSeg.fare;
    }

    if (path && path.length > 1) {
      var metrics = transitMetricsFromPath(path);

      var perRouteFare = {};
      var totalTransitFare = 0;
      var segStartIdx = 0;
      var segRoute = path[0].route_id;
      var transferFees = 0;

      var addSegmentFare = function (endIdx) {
        if (endIdx <= segStartIdx) return;
        var startSt = path[segStartIdx];
        var endSt = path[endIdx];
        var routeIdSeg = segRoute;
        var distKmSeg = 0;
        for (var si = segStartIdx; si < endIdx; si++) {
          distKmSeg += legDistanceKm(path[si], path[si + 1]);
        }
        var fareSeg = fareCalc.transitFareFromDistance(
          distKmSeg,
          routeIdSeg,
          startSt.name || startSt.station_name || "",
          endSt.name || endSt.station_name || ""
        );
        if (!perRouteFare[routeIdSeg]) perRouteFare[routeIdSeg] = 0;
        perRouteFare[routeIdSeg] += fareSeg;
        totalTransitFare += fareSeg;
      };

      for (var si = 1; si < path.length; si++) {
        var prevRoute = path[si - 1].route_id;
        var currRoute = path[si].route_id;
        if (currRoute !== prevRoute) {
          addSegmentFare(si - 1);
          transferFees += getTransferFee(prevRoute, currRoute);
          segStartIdx = si;
          segRoute = currRoute;
        }
      }
      addSegmentFare(path.length - 1);
      totalTransitFare += transferFees;

      var perRouteMeters = {};
      var perRouteStops = {};
      var perRouteRunningMinutes = {};

      var totalTransitMeters = 0;
      for (var li = 0; li < path.length - 1; li++) {
        var s1 = path[li];
        var s2 = path[li + 1];

        var routeIdLeg = s1.route_id || s2.route_id || null;
        if (!routeIdLeg) continue;

        var legKmRoute = legDistanceKm(s1, s2);
        var legMeters = legKmRoute * 1000;
        totalTransitMeters += legMeters;

        if (!perRouteMeters[routeIdLeg]) perRouteMeters[routeIdLeg] = 0;
        perRouteMeters[routeIdLeg] += legMeters;

        var speedKmhLeg = (window.CalcHelpers && window.CalcHelpers.getRouteSpeed)
          ? window.CalcHelpers.getRouteSpeed(routeIdLeg)
          : 30;
        var legKm = legMeters / 1000;
        if (!perRouteRunningMinutes[routeIdLeg]) {
          perRouteRunningMinutes[routeIdLeg] = 0;
        }
        perRouteRunningMinutes[routeIdLeg] += (legKm / speedKmhLeg) * 60;
      }

      for (var siStops = 0; siStops < path.length; siStops++) {
        var st = path[siStops];
        var ridStops = st.route_id;
        if (!ridStops) continue;
        if (!perRouteStops[ridStops]) perRouteStops[ridStops] = 0;
        perRouteStops[ridStops]++;
      }

      var routeIds = [];
      var totalRunningMinutes = 0;
      for (var ridRun in perRouteRunningMinutes) {
        if (!perRouteRunningMinutes.hasOwnProperty(ridRun)) continue;
        totalRunningMinutes += perRouteRunningMinutes[ridRun];
      }

      var transitLines = {};
      for (var rid in perRouteMeters) {
        if (!perRouteMeters.hasOwnProperty(rid)) continue;
        routeIds.push(rid);

        var metersForLine = perRouteMeters[rid] || 0;
        var distanceKmLine = parseFloat((metersForLine / 1000).toFixed(2));
        var runningMinLine = perRouteRunningMinutes[rid] || 0;
        var stopsForLine = perRouteStops[rid] || 0;

        transitLines[rid] = {
          routeId: rid,
          distanceKm: distanceKmLine,
          timeMin: 0,
          stopCount: stopsForLine,
          _runningMin: runningMinLine,
          fare: 0,
        };
      }

      var dwellTotal = metrics.timeMin - Math.round(totalRunningMinutes);
      if (dwellTotal < 0) dwellTotal = 0;

      var remainingDwell = dwellTotal;
      var totalRunForShare = totalRunningMinutes > 0 ? totalRunningMinutes : routeIds.length;

      for (var idxD = 0; idxD < routeIds.length; idxD++) {
        var ridD = routeIds[idxD];
        var lineD = transitLines[ridD];
        if (!lineD) continue;

        var dwellForLine;
        if (idxD === routeIds.length - 1) {
          dwellForLine = remainingDwell;
        } else if (totalRunningMinutes <= 0) {
          dwellForLine = dwellTotal / routeIds.length;
          remainingDwell = roundToTwo(remainingDwell - dwellForLine);
        } else {
          var runLine = perRouteRunningMinutes[ridD] || 0;
          var share = runLine / totalRunForShare;
          dwellForLine = roundToTwo(dwellTotal * share);
          remainingDwell = roundToTwo(remainingDwell - dwellForLine);
        }

        lineD.timeMin = Math.round(lineD._runningMin + dwellForLine);
      }

      var sumLineTime = 0;
      for (var iT = 0; iT < routeIds.length; iT++) {
        var lt = transitLines[routeIds[iT]];
        if (!lt) continue;
        sumLineTime += lt.timeMin;
      }
      var diffTime = metrics.timeMin - sumLineTime;
      if (diffTime !== 0 && routeIds.length > 0) {
        var lastLine = transitLines[routeIds[routeIds.length - 1]];
        if (lastLine) {
          lastLine.timeMin = Math.max(0, lastLine.timeMin + diffTime);
        }
      }

      for (var iC = 0; iC < routeIds.length; iC++) {
        var ridC = routeIds[iC];
        if (transitLines[ridC]) {
          delete transitLines[ridC]._runningMin;
        }
      }

      var totalFare = typeof totalTransitFare === "number" ? totalTransitFare : metrics.fare || 0;
      var remainingFare = totalFare;
      var totalMetersForAllocation = totalTransitMeters || 0;

      for (var idx = 0; idx < routeIds.length; idx++) {
        var ridAlloc = routeIds[idx];
        var line = transitLines[ridAlloc];
        if (!line) continue;

        var shareFare;
        if (perRouteFare && typeof perRouteFare[ridAlloc] === "number") {
          shareFare = perRouteFare[ridAlloc];
        } else if (idx === routeIds.length - 1 || totalMetersForAllocation === 0) {
          shareFare = remainingFare;
        } else {
          var metersLine = perRouteMeters[ridAlloc] || 0;
          var share = metersLine / totalMetersForAllocation;
          shareFare = roundToTwo(totalFare * share);
          remainingFare = roundToTwo(remainingFare - shareFare);
        }

        line.fare = roundToTwo(shareFare);
      }

      var transitSeg = {
        position: "transit",
        type: "transit",
        routeId: metrics.routeId,
        route_id: metrics.routeId,
        distance: metrics.distanceKm,
        time: metrics.timeMin,
        fare: typeof totalTransitFare === "number" ? roundToTwo(totalTransitFare) : metrics.fare,
        stopCount: metrics.stopCount,
        transferCount: metrics.transferCount,
        isTransfer: metrics.transferCount > 0,
        transitLines: transitLines,
      };

      segments.push(transitSeg);
      annotateComfort(transitSeg);
      totals.distance += metrics.distanceKm;
      totals.time += metrics.timeMin;
      totals.fare += metrics.fare;
    }

    if (destDist > 50) {
      var endSeg = segmentStartEnd(destDist, threshold);
      var endSegment = {
        position: "end",
        type: endSeg.type,
        distance: endSeg.distance,
        time: endSeg.time,
        fare: endSeg.fare,
        route_id: null,
        stopCount: 1,
      };
      segments.push(endSegment);
      annotateComfort(endSegment);
      totals.distance += endSeg.distance;
      totals.time += endSeg.time;
      totals.fare += endSeg.fare;
    }

    totals.distance = parseFloat(totals.distance.toFixed(2));
    totals.time = Math.round(totals.time);
    totals.fare = roundToTwo(totals.fare);

    return { segments: segments, totals: totals, transitLines: transitLines };
  }

  function segmentStartEnd(meters, threshold) {
    if (meters > threshold) {
      return {
        type: "grab",
        distance: distanceKm(meters),
        time: time.grabTimeMin ? time.grabTimeMin(meters) : 0,
        fare: fareCalc.grabFare ? fareCalc.grabFare(meters) : 0,
      };
    } else {
      return {
        type: "walk",
        distance: distanceKm(meters),
        time: time.walkingTimeMin ? time.walkingTimeMin(meters) : 0,
        fare: 0,
      };
    }
  }

  window.CalcPath = {
    distanceKm: distanceKm,
    transitDistance: transitDistance,
    transitMetricsFromPath: transitMetricsFromPath,
    completeRoute: completeRoute,
    segmentStartEnd: segmentStartEnd,
  };
})();
