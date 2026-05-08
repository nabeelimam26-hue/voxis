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
    },
  
    gestures: {
      current: null,
      confidence: 0,
    },
  };
  
  export default EngineState;