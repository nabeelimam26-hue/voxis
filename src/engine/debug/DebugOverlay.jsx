import { useEffect, useState } from "react";
import EngineState from "../state/EngineState";

export default function DebugOverlay() {
  const [, refresh] = useState(0);

  useEffect(() => {
    const id = setInterval(() => refresh((value) => value + 1), 250);
    return () => clearInterval(id);
  }, []);

  const { performance } = EngineState;

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
      <div>Render FPS: {performance.renderFps || performance.fps}</div>
      <div>Render frame: {performance.renderFrameTime.toFixed(2)}ms</div>
      <div>Render work: {performance.renderWorkTime.toFixed(2)}ms</div>
      <div>Render calls/frame: {performance.renderCallsThisFrame}</div>
      <div>Inference FPS: {performance.inferenceFps}/{performance.inferenceTargetFps || "idle"}</div>
      <div>Inference: {performance.inferenceFrameTime.toFixed(2)}ms</div>
      <div>Update FPS: {performance.updateFps}</div>
      <div>Mode: {EngineState.mode}</div>
      <div>Interaction: {EngineState.interaction.state}</div>
      <div>Gesture: {EngineState.gestures.current || "NONE"}</div>
      <div>Command: {EngineState.inputCommand}</div>
      <div>Confidence: {EngineState.gestures.confidence}</div>
    </div>
  );
}
