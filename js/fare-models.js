export const FareModels = {
  lines: {},

  async load() {
    try {
      const res = await fetch(`${window.API_BASE}/fare-model`);
      const data = await res.json();

      if (data.ok && data.model && data.model.lines) {
        this.lines = data.model.lines;
        console.log("[FareModels] Loaded model:", Object.keys(this.lines));
      } else {
        console.warn("[FareModels] No AI fare model available.");
      }
    } catch (err) {
      console.error("[FareModels] Error loading fare model:", err);
    }
  },

  get(lineId) {
    if (!lineId) return null;
    return this.lines[lineId.toUpperCase()] || null;
  }
};