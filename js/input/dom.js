// input/dom.js
// Responsibilities: centralize DOM element references for input flow.
(function () {
  window.InputDom = {
    startInput: document.getElementById("start"),
    destInput: document.getElementById("dest"),
    routeBtn: document.getElementById("routeBtn"),
    infoEl: document.getElementById("info"),
    insightsList: document.getElementById("insightsList"),
    insightsEmpty: document.getElementById("insightsEmpty"),
    routeSummaryPanel: document.getElementById("routeSummaryPanel"),
    insightsPanel: document.getElementById("insightsPanel"),
    summaryContent: document.getElementById("routeSummaryContent"),
  };
})();
