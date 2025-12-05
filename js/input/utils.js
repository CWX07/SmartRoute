// input/utils.js
// Responsibilities: shared helpers for input handling.
(function () {
  var dom = window.InputDom || {};

  function setInfo(msg) {
    if (dom.infoEl) dom.infoEl.textContent = msg;
    if (dom.infoEl) {
      var isError = /error|fail/i.test(String(msg || ""));
      dom.infoEl.classList.toggle("is-error", isError);
    }
    console.log("[Input]", msg);
  }

  function formatKm(meters) {
    if (!meters) return "0 km";
    if (meters < 1000) return meters.toFixed(0) + " m";
    return (meters / 1000).toFixed(2) + " km";
  }

  function capitalizeName(name) {
    if (!name) return "";
    return name
      .split(" ")
      .map(function (word) {
        var lower = word.toLowerCase();
        if (lower === "and" || lower === "of" || lower === "the" || lower === "at") {
          return lower;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  }

  function renderInsights(insights) {
    if (!dom.insightsList) return;

    dom.insightsList.innerHTML = "";

    if (!insights || !insights.length) {
      if (dom.insightsEmpty) dom.insightsEmpty.classList.remove("hidden");
      dom.insightsList.classList.add("hidden");
      return;
    }

    if (dom.insightsEmpty) dom.insightsEmpty.classList.add("hidden");
    dom.insightsList.classList.remove("hidden");
    if (dom.insightsPanel) dom.insightsPanel.classList.remove("hidden");

    insights.forEach(function (text) {
      var li = document.createElement("li");
      li.textContent = text;
      dom.insightsList.appendChild(li);
    });
  }

  function sumSegmentMetric(segments, type, field) {
    if (!segments || !segments.length) return 0;
    var total = 0;
    segments.forEach(function (segment) {
      if (segment.type !== type) return;
      var value = typeof segment[field] === "number" ? segment[field] : 0;
      total += value;
    });
    return Math.round(total * 1000) / 1000;
  }

  function computeComfortBaselineTotal(segments) {
    if (!segments || !segments.length) return 0;
    var total = 0;
    segments.forEach(function (segment) {
      if (!segment.comfort || typeof segment.comfort.baseline !== "number") return;
      total += segment.comfort.baseline;
    });
    return Math.round(total * 1000) / 1000;
  }

  window.InputUtils = {
    setInfo: setInfo,
    formatKm: formatKm,
    capitalizeName: capitalizeName,
    renderInsights: renderInsights,
    sumSegmentMetric: sumSegmentMetric,
    computeComfortBaselineTotal: computeComfortBaselineTotal,
  };
})();
