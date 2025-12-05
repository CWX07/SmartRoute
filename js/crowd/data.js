// crowd/data.js
// Responsibilities: load ridership data (with mock fallback).
(function () {
  function generateMockData() {
    return [
      {
        date: new Date().toISOString().split("T")[0],
        rail_lrt_ampang: "50000",
        rail_mrt_kajang: "80000",
        rail_lrt_kj: "60000",
        rail_monorail: "30000",
        rail_mrt_pjy: "70000",
      },
    ];
  }

  function loadPassengerData() {
    // Use backend proxy path (served from smartroute-server)
    var urlPath = "/data.gov.my/ridership-headline.json";
    var fetchFn =
      (typeof window !== "undefined" && window.fetchWithApiFallback) || fetch;

    return fetchFn(urlPath)
      .then(function (res) {
        if (!res.ok) throw new Error("Ridership data not found");
        return res.json();
      })
      .then(function (data) {
        window.RIDERSHIP_DATA = data;
        return data;
      })
      .catch(function () {
        var mock = generateMockData();
        window.RIDERSHIP_DATA = mock;
        return mock;
      });
  }

  window.CrowdData = {
    loadPassengerData: loadPassengerData,
  };
})();
