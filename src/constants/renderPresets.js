export const RENDER_PRESETS = {
  safe: {
    shadows: false,
    fog: false,
    pixelRatio: 1,
    torusSegments: 48,
    tubularSegments: 8,
    uiThrottle: 500,
    pointLights: 1,
  },

  luxury: {
    shadows: true,
    fog: true,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    torusSegments: 128,
    tubularSegments: 16,
    uiThrottle: 250,
    pointLights: 3,
  },
};
