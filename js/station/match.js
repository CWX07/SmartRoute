// station/match.js
// Responsibilities: station name matching with typo tolerance.
(function () {
  var transitKeywords = window.STATION_KEYWORDS || [];

  function similarity(a, b) {
    if (!a || !b) return 0;
    var d = levenshtein(a, b);
    return 1 - d / Math.max(a.length, b.length);
  }

  function levenshtein(a, b) {
    var m = [],
      i,
      j;
    for (i = 0; i <= b.length; i++) m[i] = [i];
    for (j = 0; j <= a.length; j++) m[0][j] = j;

    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        m[i][j] = Math.min(
          m[i - 1][j] + 1,
          m[i][j - 1] + 1,
          m[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1)
        );
      }
    }
    return m[b.length][a.length];
  }

  function findStationByName(query) {
    if (!query || !window.stations || window.stations.length === 0) return null;

    var raw = query.toLowerCase().trim();
    if (!raw) return null;
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(raw)) return null;

    var userWantsTransit = transitKeywords.some(function (k) {
      return raw.includes(k);
    });

    var q = raw.replace(/\b(station|stesen|stn|lrt|mrt|brt|monorail|komuter|rapid|ktm)\b/g, "").trim();
    if (!q) q = raw;

    var best = null;
    var bestScore = 0;

    window.stations.forEach(function (st) {
      var name = (st.name || "").toLowerCase();
      name = name.replace(/[()!-]/g, " ").replace(/\s+/g, " ").trim();
      if (!name) return;

      if (name === q) {
        if (bestScore < 1.0) {
          best = st;
          bestScore = 1.0;
        }
        return;
      }

      if (name.includes(q) || q.includes(name)) {
        var score = Math.max(q.length / name.length, name.length / q.length);
        if (score > bestScore) {
          bestScore = score;
          best = st;
        }
        return;
      }

      var score = similarity(q, name);
      if (score > bestScore) {
        bestScore = score;
        best = st;
      }
    });

    var threshold = userWantsTransit ? 0.75 : 0.6;

    if (best && bestScore >= threshold) {
      console.log("[StationMatch] Matched:", best.name, "score:", bestScore.toFixed(2));
      return best;
    }

    console.log("[StationMatch] No match for:", query, "best score:", bestScore.toFixed(2));
    return null;
  }

  window.findStationByName = findStationByName;
})();
