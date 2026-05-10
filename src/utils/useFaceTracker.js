import { useRef, useCallback } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import EngineState from "../engine/state/EngineState";

/**
 * useFaceTracker - Custom hook for MediaPipe Hand Landmarker
 * Manages: initialization, video/webcam detection, raw hand landmark streaming
 * Optimized for: real-time 3D object control with dual-hand support
 * 
 * Returns: { handLandmarkerRef, loadModel, detectFromImage, startDetectionLoop, stopDetectionLoop, cleanup }
 */

// ─── LOAD HANDLANDMARKER ──────────────────────────────────────────────────────
async function loadHandLandmarkerModel(runningMode) {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  return await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "CPU",
    },
    runningMode,
    numHands: 2, // ← Support dual-hand tracking for physics simulation
  });
}

export function useFaceTracker() {
  const handLandmarkerRef = useRef(null);
  
  // ── Load MediaPipe model ───────────────────────────────────────────────────
  const loadModel = useCallback(async (mode = "IMAGE") => {
    try {
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
      const runningMode = mode === "image" ? "IMAGE" : "VIDEO";
      handLandmarkerRef.current = await loadHandLandmarkerModel(runningMode);
      return true;
    } catch (err) {
      console.error("MediaPipe load failed:", err);
      return false;
    }
  }, []);

  // ── Detect from static image (returns all detected hands) ────────────────────
  const detectFromImage = useCallback((img) => {
    if (!handLandmarkerRef.current) return null;
    try {
      const result = handLandmarkerRef.current.detect(img);
      // Return all hands with handedness (Left/Right) and landmarks
      return result.landmarks?.length > 0 
        ? {
            hands: result.landmarks.map((lm, i) => ({
              landmarks: lm,
              handedness: result.handedness?.[i]?.displayName || "Unknown",
            })),
            count: result.landmarks.length,
          }
        : null;
    } catch (err) {
      console.error("Detection error:", err);
      return null;
    }
  }, []);

  // ── Start detection loop for video/webcam (streams all detected hands) ────
  const startDetectionLoop = useCallback((videoEl, canvasRef, onLandmarks, mirror = false, options = {}) => {
    const targetFps = options.targetFps ?? 30;
    const minFrameMs = 1000 / targetFps;
    const loopRef = {
      id: null,
      stopped: false,
      lastInferenceAt: 0,
      inferenceFrames: 0,
      fpsWindowStart: performance.now(),
    };

    EngineState.performance.inferenceTargetFps = targetFps;

    const loop = (rafTime) => {
      if (loopRef.stopped || !videoEl || videoEl.paused || videoEl.ended || !handLandmarkerRef.current) {
        return;
      }

      loopRef.id = requestAnimationFrame(loop);

      if (videoEl.readyState < 2 || rafTime - loopRef.lastInferenceAt < minFrameMs) {
        return;
      }

      loopRef.lastInferenceAt = rafTime;

      // Update canvas dimensions only when the source dimensions change.
      const canvas = canvasRef.current;
      if (canvas) {
        const width = videoEl.videoWidth || 640;
        const height = videoEl.videoHeight || 480;
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
      }

      try {
        const inferenceStart = performance.now();
        const result = handLandmarkerRef.current.detectForVideo(videoEl, inferenceStart);
        EngineState.performance.inferenceFrameTime = performance.now() - inferenceStart;
        loopRef.inferenceFrames += 1;

        if (rafTime - loopRef.fpsWindowStart >= 1000) {
          EngineState.performance.inferenceFps = loopRef.inferenceFrames;
          loopRef.inferenceFrames = 0;
          loopRef.fpsWindowStart = rafTime;
        }

        // Process all detected hands with mirror if needed
        let handsData = null;
        if (result.landmarks?.length > 0) {
          handsData = {
            hands: result.landmarks.map((lm, i) => {
              const landmarks = mirror ? lm.map(p => ({ ...p, x: 1 - p.x })) : lm;
              return {
                landmarks,
                handedness: result.handedness?.[i]?.displayName || "Unknown",
              };
            }),
            count: result.landmarks.length,
          };
        }

        // Call callback with all hands data and canvas
        onLandmarks(handsData, canvas);
      } catch {
        // Skip frame silently
      }
    };

    loopRef.id = requestAnimationFrame(loop);
    return loopRef;
  }, []);

  // ── Stop detection loop ────────────────────────────────────────────────────
  const stopDetectionLoop = useCallback((loopRef) => {
    if (loopRef) {
      loopRef.stopped = true;
    }
    if (loopRef?.id) {
      cancelAnimationFrame(loopRef.id);
      loopRef.id = null;
    }
    EngineState.performance.inferenceFps = 0;
    EngineState.performance.inferenceFrameTime = 0;
    EngineState.performance.inferenceTargetFps = 0;
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (handLandmarkerRef.current) {
      handLandmarkerRef.current.close();
      handLandmarkerRef.current = null;
    }
  }, []);

  return {
    handLandmarkerRef,
    loadModel,
    detectFromImage,
    startDetectionLoop,
    stopDetectionLoop,
    cleanup,
  };
}
