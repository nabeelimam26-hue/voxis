const EngineState = {
  mode: "SAFE",
  inputCommand: "NONE",
  interaction: {
    state: "IDLE",
    selectedObject: null,
    hoveredObject: null,
  },

  performance: {
    fps: 0,
    frameTime: 0,
    updateFps: 0,
    updateFrameTime: 0,
    renderFps: 0,
    renderFrameTime: 0,
    renderWorkTime: 0,
    renderCount: 0,
    renderCallsThisFrame: 0,
    inferenceFps: 0,
    inferenceFrameTime: 0,
    inferenceTargetFps: 0,
  },

  gestures: {
    current: null,
    confidence: 0,
  },
};

export default EngineState;
