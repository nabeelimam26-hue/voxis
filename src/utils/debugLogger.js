// Debug-safe logging gate for realtime paths. Disabled by default to protect FPS.
export const debugLogger = {
  enabled: false,
  log(...args) {
    if (this.enabled) console.log("[emoji-mirror]", ...args);
  },
  warn(...args) {
    if (this.enabled) console.warn("[emoji-mirror]", ...args);
  },
};
