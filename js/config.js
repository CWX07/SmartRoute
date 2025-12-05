// config.js - shared configuration for API/static endpoints + aliases

(function () {
  var primary = window.API_BASE || "https://smartroute-server.onrender.com";

  window.API_BASE = primary;
  window.API_BASES = [primary];
  window.STATIC_BASE = primary;

  // Simple fetch helper (kept for callers), uses only primary host
  window.fetchWithApiFallback = function (path, options) {
    if (path && /^https?:\/\//i.test(path)) {
      return fetch(path, options);
    }
    var url = primary.replace(/\/+$/, "") + path;
    return fetch(url, options);
  };
})();

// Include shared route aliases/normalization
// (order: config.js is loaded before config/aliases.js via index.html)
