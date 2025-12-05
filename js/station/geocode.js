// station/geocode.js
// Responsibilities: geocode with station-first logic, fallback to Nominatim.
(function () {
  var transitKeywords = window.STATION_KEYWORDS || [];

  function geocodeWithFallback(query) {
    return new Promise(function (resolve) {
      if (!query) return resolve(null);

      var raw = (query || "").toLowerCase().trim();
      var hasTransitKeyword = transitKeywords.some(function (k) {
        return raw.includes(k);
      });

      if (hasTransitKeyword && typeof window.findStationByName === "function") {
        var station = window.findStationByName(query);
        if (station) {
          console.log("[Geocode] Station matched:", station.name);
          return resolve({
            lat: station.lat,
            lng: station.lng,
            name: station.name,
            station: station,
          });
        }
      }

      console.log("[Geocode] No station match, using Nominatim for:", query);
      var url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
        encodeURIComponent(query);

      fetch(url)
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (data) {
          if (!data || !data.length) {
            console.log("[Geocode] Nominatim found nothing");
            return resolve(null);
          }

          var loc = data[0];
          console.log("[Geocode] Nominatim result:", loc.display_name);
          resolve({
            lat: parseFloat(loc.lat),
            lng: parseFloat(loc.lon),
            name: loc.display_name,
          });
        })
        .catch(function (err) {
          console.error("[Geocode] Error:", err);
          resolve(null);
        });
    });
  }

  window.geocodeWithFallback = geocodeWithFallback;
})();
