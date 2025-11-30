// calc-unified.js - FIXED with consistent calculations (ES5 compatible)

(function () {
    var WALKING_SPEED_KMH = 5;
    var TRANSIT_TIME_PER_STOP_MIN = 3;
    var TRANSIT_FARE_PER_STOP = 0.3;
  
    var GRAB_BASE_FARE = 2.0;
    var GRAB_PER_KM = 0.65;
    var GRAB_PER_MIN = 0.3;
    var GRAB_BOOKING_FEE = 1.0;
    var GRAB_SPEED_KMH = 30;
  
    window.UnifiedCalc = {
      distanceKm: function (meters) {
        return parseFloat((meters / 1000).toFixed(2));
      },
  
      walkingTimeMin: function (meters) {
        var km = meters / 1000;
        var hours = km / WALKING_SPEED_KMH;
        return Math.ceil(hours * 60);
      },
  
      transitTimeMin: function (stopCount) {
        if (stopCount <= 1) return 0;
        return (stopCount - 1) * TRANSIT_TIME_PER_STOP_MIN;
      },
  
      grabTimeMin: function (meters) {
        var km = meters / 1000;
        var hours = km / GRAB_SPEED_KMH;
        return Math.ceil(hours * 60);
      },
  
      transitFare: function (stopCount) {
        if (stopCount <= 1) return 0;
        var fare = (stopCount - 1) * TRANSIT_FARE_PER_STOP;
        return Math.round(fare * 100) / 100;
      },
  
      grabFare: function (meters) {
        var km = meters / 1000;
        var timeMin = this.grabTimeMin(meters);
  
        var fare =
          GRAB_BASE_FARE +
          km * GRAB_PER_KM +
          timeMin * GRAB_PER_MIN +
          GRAB_BOOKING_FEE;
  
        return Math.round(fare * 100) / 100;
      },
  
      // NEW: Calculate transit distance from path
      transitDistance: function (path) {
        if (!path || path.length < 2) return 0;
        
        var totalDist = 0;
        for (var i = 0; i < path.length - 1; i++) {
          totalDist += window.distance(
            path[i].lat,
            path[i].lng,
            path[i + 1].lat,
            path[i + 1].lng
          );
        }
        return totalDist;
      },
  
      // NEW: Complete route calculation with all segments
      completeRoute: function (startDist, path, destDist, threshold) {
        var segments = [];
        var totals = { distance: 0, time: 0, fare: 0 };
  
        // START segment
        if (startDist > 50) {
          var startSeg = this.segmentStartEnd(startDist, threshold);
          segments.push({
            position: 'start',
            type: startSeg.type,
            distance: startSeg.distance,
            time: startSeg.time,
            fare: startSeg.fare
          });
          totals.distance += startSeg.distance;
          totals.time += startSeg.time;
          totals.fare += startSeg.fare;
        }
  
        // TRANSIT segment
        if (path && path.length > 1) {
          var transitDist = this.transitDistance(path);
          var transitSeg = {
            position: 'transit',
            type: "transit",
            distance: this.distanceKm(transitDist),
            time: this.transitTimeMin(path.length),
            fare: this.transitFare(path.length),
            stopCount: path.length
          };
          segments.push(transitSeg);
          totals.distance += transitSeg.distance;
          totals.time += transitSeg.time;
          totals.fare += transitSeg.fare;
        }
  
        // END segment
        if (destDist > 50) {
          var endSeg = this.segmentStartEnd(destDist, threshold);
          segments.push({
            position: 'end',
            type: endSeg.type,
            distance: endSeg.distance,
            time: endSeg.time,
            fare: endSeg.fare
          });
          totals.distance += endSeg.distance;
          totals.time += endSeg.time;
          totals.fare += endSeg.fare;
        }
  
        totals.distance = parseFloat(totals.distance.toFixed(2));
        totals.time = Math.round(totals.time);
        totals.fare = Math.round(totals.fare * 100) / 100;
  
        return { segments: segments, totals: totals };
      },
  
      segmentStartEnd: function (meters, threshold) {
        if (meters > threshold) {
          return {
            type: "grab",
            distance: this.distanceKm(meters),
            time: this.grabTimeMin(meters),
            fare: this.grabFare(meters),
          };
        } else {
          return {
            type: "walk",
            distance: this.distanceKm(meters),
            time: this.walkingTimeMin(meters),
            fare: 0,
          };
        }
      },
    };
  
    console.log("[Calc Unified] Module ready - Consistent calculations enabled");
  })();