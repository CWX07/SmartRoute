// input/comfort.js
// Responsibilities: compute comfort baselines and apply AI adjustments.
(function () {
  var utils = window.InputUtils || {};

  function applyComfortAdjustments(routeData) {
    return _apply(routeData);
  }

  async function _apply(routeData) {
    if (!routeData || !routeData.segments || !routeData.segments.length) {
      return null;
    }

    var baselineComfort = utils.computeComfortBaselineTotal(routeData.segments);
    if (baselineComfort === 0 && typeof window.computeComfortScore === "function") {
      var ridershipData = window.RIDERSHIP_DATA || {};
      var hour = typeof window.currentComfortHour === "number" ? window.currentComfortHour : new Date().getHours();
      routeData.segments.forEach(function (segment) {
        if (segment.comfort) return;
        var normalized = {
          route_id: segment.route_id || segment.routeId || null,
          stops: segment.stopCount || segment.stops || 1,
          type: segment.type,
          distance_km: typeof segment.distance === "number" ? segment.distance : segment.distance_km || 0,
          isTransfer: !!segment.isTransfer,
          transferCount: typeof segment.transferCount === "number" ? segment.transferCount : segment.transfers || 0,
        };
        var baselineValue = window.computeComfortScore(normalized, hour, ridershipData);
        segment.comfort = { baseline: baselineValue, aiAdjusted: null };
      });
      baselineComfort = utils.computeComfortBaselineTotal(routeData.segments);
    }

    var baselinePayload = {
      transit_time: utils.sumSegmentMetric(routeData.segments, "transit", "time"),
      transit_fare: utils.sumSegmentMetric(routeData.segments, "transit", "fare"),
      grab_time: utils.sumSegmentMetric(routeData.segments, "grab", "time"),
      grab_fare: utils.sumSegmentMetric(routeData.segments, "grab", "fare"),
      walk_time: utils.sumSegmentMetric(routeData.segments, "walk", "time"),
      comfort_score: baselineComfort,
    };

    var aiResult = baselinePayload;
    if (window.AIEstimator && typeof window.AIEstimator.correct === "function") {
      aiResult = await window.AIEstimator.correct(baselinePayload);
    }

    var finalComfort = typeof aiResult.comfort_score === "number" ? aiResult.comfort_score : baselineComfort;
    finalComfort = Math.max(0, Math.min(finalComfort, 3));

    var comfortDelta = finalComfort - baselineComfort;
    var denominator = baselineComfort || 1;

    routeData.segments.forEach(function (segment) {
      if (!segment.comfort) return;
      var weight = segment.comfort.baseline / denominator;
      if (!isFinite(weight)) weight = 0;
      var adjusted = segment.comfort.baseline + comfortDelta * weight;
      segment.comfort.aiAdjusted = Math.max(0, Math.min(adjusted, 3));
    });

    routeData.comfortScore = finalComfort;
    window.currentComfortScore = finalComfort;
    window.currentComfortBaseline = baselinePayload;
    window.currentComfortAIResult = aiResult;

    return { baseline: baselinePayload, ai: aiResult, comfortScore: finalComfort };
  }

  window.InputComfort = { applyComfortAdjustments: applyComfortAdjustments };
})();
