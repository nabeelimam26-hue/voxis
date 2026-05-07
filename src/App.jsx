import { useState, useEffect, useRef, useCallback } from "react";
import SpatialObjectController from "./components/SpatialObjectController";
import { useFaceTracker } from "./utils/useFaceTracker";

export default function App() {
  const { handLandmarkerRef, loadModel, startDetectionLoop } = useFaceTracker();

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const loopRef = useRef(null);
  const streamRef = useRef(null);
  const handsRef = useRef(null);

  // ─── STATUS SYSTEM ─────────────────────────────
  const [status, setStatus] = useState({
    model: "loading...",
    video: "idle",
    webcam: "idle",
    detection: "idle",
    fps: 0,
  });

  const [errors, setErrors] = useState([]);

  const logError = (msg) => {
    console.error("❌", msg);
    setErrors((prev) => [msg, ...prev.slice(0, 5)]);
  };

  const markStatus = (key, value) => {
    setStatus((s) => ({ ...s, [key]: value }));
  };

  // ─── LOAD MODEL ─────────────────────────────
  useEffect(() => {
    loadModel("image")
      .then(() => {
        markStatus("model", "loaded ✓");
        console.log("✅ Model loaded");
      })
      .catch((e) => {
        markStatus("model", "failed ❌");
        logError("Model failed: " + e.message);
      });
  }, [loadModel]);

  // ─── FPS TRACKER ─────────────────────────────
  const fpsRef = useRef({ frames: 0, last: Date.now() });

  const updateFps = () => {
    const now = Date.now();
    fpsRef.current.frames++;

    if (now - fpsRef.current.last >= 1000) {
      markStatus("fps", fpsRef.current.frames);
      fpsRef.current = { frames: 0, last: now };
    }
  };

  // ─── STOP EVERYTHING ─────────────────────────────
  const stopAll = () => {
    try {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current.src = "";
      }

      handsRef.current = null;

      markStatus("video", "stopped");
      markStatus("webcam", "stopped");
      markStatus("detection", "stopped");

      console.log("🛑 System stopped");
    } catch (e) {
      logError("Stop error: " + e.message);
    }
  };

  // ─── DETECTION LOOP ─────────────────────────────
  const startLoop = (video, mirror = false) => {
    try {
      loopRef.current = startDetectionLoop(
        video,
        canvasRef,
        (handsData) => {
          handsRef.current = handsData;

          if (!handsData) {
            console.warn("⚠ No hands detected");
          }

          markStatus("detection", "running ✓");
          updateFps();
        },
        mirror
      );

      console.log("🎯 Detection loop started");
    } catch (e) {
      markStatus("detection", "failed ❌");
      logError("Detection loop failed: " + e.message);
    }
  };

  // ─── VIDEO MODE ─────────────────────────────
  const startVideo = () => {
    try {
      const video = videoRef.current;
      if (!video) return logError("Video element missing");

      video.src = "/videos/hand.mp4";
      video.loop = true;
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        video.play()
          .then(() => {
            markStatus("video", "playing ✓");
            startLoop(video);
          })
          .catch((e) => logError("Video play failed: " + e.message));
      };

      video.onerror = () => {
        markStatus("video", "failed ❌");
        logError("Video file missing (/public/videos/hand.mp4)");
      };

      video.load();
    } catch (e) {
      logError("Video error: " + e.message);
    }
  };

  // ─── WEBCAM MODE (SAFE + FALLBACK) ─────────────────────────────
  const startWebcam = async () => {
    try {
      if (!navigator.mediaDevices) {
        throw new Error("MediaDevices not supported");
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log("📷 Devices:", devices);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await video.play();

      markStatus("webcam", "running ✓");
      console.log("📷 Webcam started");

      startLoop(video, true);
    } catch (e) {
      markStatus("webcam", "failed ❌");
      logError("Webcam error: " + e.message);

      console.warn("➡ Falling back to video mode");
      startVideo();
    }
  };

  // ─── AUTO START (IMPORTANT) ─────────────────────────────
  useEffect(() => {
    if (status.model.includes("loaded")) {
      console.log("🚀 Auto starting webcam...");
      startWebcam();
    }
  }, [status.model]);

  // ─── UI ─────────────────────────────
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#050810" }}>
      
      {/* CONTROLS */}
      <div style={{ padding: 10 }}>
        <button onClick={startVideo}>VIDEO</button>
        <button onClick={startWebcam}>WEBCAM</button>
        <button onClick={stopAll}>STOP</button>
      </div>

      {/* 3D */}
      <div style={{ height: "40%" }}>
        <SpatialObjectController handsRef={handsRef} />
      </div>

      {/* CANVAS */}
      <canvas ref={canvasRef} width={640} height={400} style={{ flex: 1 }} />

      {/* HIDDEN VIDEO */}
      <video
        ref={videoRef}
        muted
        playsInline
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          opacity: 0,
        }}
      />

      {/* STATUS PANEL */}
      <div style={{ color: "#00ffcc", padding: 10 }}>
        <div>MODEL: {status.model}</div>
        <div>VIDEO: {status.video}</div>
        <div>WEBCAM: {status.webcam}</div>
        <div>DETECTION: {status.detection}</div>
        <div>FPS: {status.fps}</div>
      </div>

      {/* ERROR LOG */}
      <div style={{ color: "red", padding: 10 }}>
        {errors.map((e, i) => (
          <div key={i}>❌ {e}</div>
        ))}
      </div>

      {/* HAND STATUS */}
      <div style={{ position: "absolute", top: 10, right: 10, color: "#0f0" }}>
        {handsRef.current ? "🟢 HAND DETECTED" : "🔴 NO HAND"}
      </div>
    </div>
  );
}