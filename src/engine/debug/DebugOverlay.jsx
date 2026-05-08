import EngineState from "../state/EngineState";

export default function DebugOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        left: 10,
        padding: "12px",
        background: "rgba(0,0,0,0.7)",
        color: "#00ffff",
        fontFamily: "monospace",
        fontSize: "12px",
        zIndex: 9999,
        border: "1px solid #00ffff",
        borderRadius: "8px",
        pointerEvents: "none",
      }}
    >
      <div>FPS: {EngineState.performance.fps}</div>
      
      <div>
        Frame: {EngineState.performance.frameTime.toFixed(2)}ms
      </div>

      <div>Mode: {EngineState.mode}</div>

      <div>
        Interaction: {EngineState.interaction.state}
      </div>

      <div>
        Gesture: {EngineState.gestures.current || "NONE"}
      </div>

      <div>
        Command: {EngineState.inputCommand}
      </div>

      <div>
        Confidence: {EngineState.gestures.confidence}
      </div>
    </div>
  );
}