// ai/comfort-estimator.js
// Responsibilities: call backend AI estimator to adjust comfort score. If unavailable, return baseline unchanged.

(function () {
  var DEFAULT_API = "https://smartroute-server.onrender.com";

  function getApiBase() {
    if (typeof window === "undefined") return DEFAULT_API;
    return window.API_BASE || DEFAULT_API;
  }

  function isNumber(val) {
    return typeof val === "number" && !isNaN(val);
  }

  async function requestCorrection(baseline) {
    var res = await fetch(getApiBase() + "/ai/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baseline),
    });
    return res.json();
  }

  async function correct(baseline) {
    try {
      var data = await requestCorrection(baseline);

      if (!data || !data.ok || !data.correction) {
        console.warn("[AI Estimator] Using baseline (fallback)");
        return baseline;
      }

      var adjust = isNumber(data.correction.comfort_adjust)
        ? data.correction.comfort_adjust
        : 0;

      return Object.assign({}, baseline, {
        comfort_score: baseline.comfort_score + adjust,
      });
    } catch (e) {
      console.error("[AI Estimator] Error:", e);
      return baseline;
    }
  }

  window.AIEstimator = { correct: correct };
})();
