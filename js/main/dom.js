// main/dom.js
// Responsibilities: centralize DOM element references used by main bootstrap.
(function () {
  window.MainDom = {
    infoEl: document.getElementById("info"),
    lineButtonsContainer: document.getElementById("lineButtons"),
    modeButtonsContainer: document.getElementById("modeButtons"),
  };
})();
