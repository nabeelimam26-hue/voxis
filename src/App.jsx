import { useState, useEffect, useRef, useCallback, memo } from "react";
import SpatialObjectController from "./components/SpatialObjectController";
import { useFaceTracker } from "./utils/useFaceTracker";
import DebugOverlayBase from "./engine/debug/DebugOverlay";
import interactionMachine from "./engine/interaction/InteractionMachine";
import inputManager from "./engine/input/InputManager";

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17],
];

const GESTURE_META = {
  thumbs_up: { label: "Thumbs up", color: "#ffcc00", intent: "affirm" },
  thumbs_down: { label: "Thumbs down", color: "#ff4444", intent: "reject" },
  victory: { label: "Victory", color: "#00ffcc", intent: "secondary" },
  open_palm: { label: "Open palm", color: "#ff66ff", intent: "open" },
  fist: { label: "Fist", color: "#ff4444", intent: "grab" },
  point: { label: "Point", color: "#8888ff", intent: "trace" },
  rock_on: { label: "Rock on", color: "#ff8800", intent: "variant" },
  three: { label: "Three", color: "#44ccff", intent: "count" },
  four: { label: "Four", color: "#44ffaa", intent: "count" },
  call_me: { label: "Call me", color: "#ff66aa", intent: "variant" },
  ok: { label: "OK", color: "#aaffaa", intent: "pinch" },
  vulcan: { label: "Vulcan", color: "#8866ff", intent: "variant" },
  finger_gun: { label: "Finger gun", color: "#ffaa44", intent: "point" },
  none: { label: "No hand", color: "#555", intent: "idle" },
  unknown: { label: "Unknown", color: "#444", intent: "unmapped" },
};

const THEMES = {
  dark: { bg: "#080c10", panel: "#0c1018", border: "rgba(0,255,204,0.18)", accent: "#00ffcc", dim: "#3a4a3a", text: "#d0e8d0", grid: "rgba(0,255,204,0.04)" },
  neon: { bg: "#0a0020", panel: "#10002a", border: "rgba(180,0,255,0.25)", accent: "#cc00ff", dim: "#440066", text: "#e0c0ff", grid: "rgba(180,0,255,0.05)" },
};

const btn = (T, active = false, color = null) => ({
  padding: "7px 13px",
  fontSize: 9,
  letterSpacing: 1.5,
  cursor: "pointer",
  background: active ? `${color || T.accent}18` : "transparent",
  border: `1px solid ${active ? (color || T.accent) : T.border}`,
  color: active ? (color || T.accent) : T.dim,
  borderRadius: 3,
  fontFamily: "'Courier New',monospace",
  transition: "all 0.15s",
});

function dist2D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getFingerStates(lm) {
  const M = 0.04;
  const index = lm[8].y < lm[5].y - M;
  const middle = lm[12].y < lm[9].y - M;
  const ring = lm[16].y < lm[13].y - M;
  const pinky = lm[20].y < lm[17].y - M;
  const [thumb, thumbIp, wrist, indexBase] = [lm[4], lm[3], lm[0], lm[5]];
  const thumbUp = thumb.y < wrist.y - 0.1 && thumb.y < thumbIp.y - 0.02;
  const thumbDown = thumb.y > wrist.y + 0.1 && thumb.y > thumbIp.y + 0.02;
  const thumbOut = !thumbUp && !thumbDown && dist2D(thumb, indexBase) > 0.15;
  return { index, middle, ring, pinky, thumbUp, thumbDown, thumbOut };
}

function classifyGesture(lm) {
  if (!lm || lm.length < 21) return "none";
  const { index, middle, ring, pinky, thumbUp, thumbDown, thumbOut } = getFingerStates(lm);
  const fold = !index && !middle && !ring && !pinky;
  const all = index && middle && ring && pinky;
  if (thumbUp && fold) return "thumbs_up";
  if (thumbDown && fold) return "thumbs_down";
  if (all && thumbOut) return "open_palm";
  if (fold && !thumbUp && !thumbDown) return "fist";
  if (index && middle && !ring && !pinky) return "victory";
  if (index && !middle && !ring && !pinky && !thumbUp && !thumbOut) return "point";
  if (index && !middle && !ring && pinky) return "rock_on";
  if (index && middle && ring && !pinky) return "three";
  if (all && !thumbOut && !thumbUp) return "four";
  if (thumbOut && !index && !middle && !ring && pinky) return "call_me";
  if (thumbOut && index && !middle && !ring && !pinky) return "ok";
  if (all && !thumbUp && !thumbDown) return "vulcan";
  if (index && !middle && !ring && !pinky && (thumbUp || thumbOut)) return "finger_gun";
  return "unknown";
}

function drawHand(ctx, lm, w, h) {
  if (!lm?.length) return;
  const pts = lm.map((p) => ({ x: p.x * w, y: p.y * h }));
  ctx.shadowColor = "#00ffcc";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "rgba(0,255,204,0.75)";
  ctx.lineWidth = 2.5;
  CONNECTIONS.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y);
    ctx.stroke();
  });
  pts.forEach((pt, i) => {
    const keyPoint = [0, 5, 9, 13, 17].includes(i);
    ctx.shadowColor = keyPoint ? "#ff00aa" : "#00ffcc";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, keyPoint ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = keyPoint ? "#ff00aa" : "#00ffcc";
    ctx.fill();
  });
  ctx.shadowBlur = 0;
}

const DebugOverlay = memo(DebugOverlayBase);

export default function Voxis() {
  const { handLandmarkerRef, loadModel, detectFromImage: hookDetect, startDetectionLoop: hookLoop, stopDetectionLoop } = useFaceTracker();

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const loopRef = useRef(null);
  const streamRef = useRef(null);
  const fpsRef = useRef({ frames: 0, last: Date.now() });
  const drawRef = useRef(false);
  const pathRef = useRef([]);
  const handsRef = useRef(null);
  const gestureStateRef = useRef({ gesture: "none", trackedHands: 0, lastLoggedGesture: "none", lastLogAt: 0 });

  const [renderMode, setRenderMode] = useState("luxury");
  const [theme, setTheme] = useState("dark");
  const [tab, setTab] = useState("mirror");
  const [inputMode, setInputMode] = useState("image");
  const [modelReady, setModelReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [videoPlay, setVideoPlay] = useState(false);
  const [camActive, setCamActive] = useState(false);
  const [vidErr, setVidErr] = useState(null);
  const [gesture, setGesture] = useState("none");
  const [log, setLog] = useState([]);
  const [show3D, setShow3D] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [fps, setFps] = useState(0);
  const [sessTime, setSessTime] = useState(0);
  const [gCount, setGCount] = useState({});
  const [trackedHands, setTrackedHands] = useState(0);
  const [notif, setNotif] = useState(null);
  const [sessStart] = useState(Date.now());

  const [modelFile, setModelFile] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [vidSrc, setVidSrc] = useState(null);

  const T = THEMES[theme];
  const cfg = GESTURE_META[gesture] || GESTURE_META.none;
  const fmt = (s) => `${String(Math.trunc(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    const t = setInterval(() => setSessTime(Math.trunc((Date.now() - sessStart) / 1000)), 1000);
    return () => clearInterval(t);
  }, [sessStart]);

  const notify = useCallback((msg, color = T.accent) => {
    setNotif({ msg, color });
    setTimeout(() => setNotif(null), 2200);
  }, [T.accent]);

  const drawGrid = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = T.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x < cv.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cv.height);
      ctx.stroke();
    }
    for (let y = 0; y < cv.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cv.width, y);
      ctx.stroke();
    }
    if (pathRef.current.length > 1) {
      ctx.strokeStyle = "#ff66ff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#ff66ff";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(pathRef.current[0].x, pathRef.current[0].y);
      pathRef.current.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [T.grid]);

  const stopAll = useCallback(() => {
    if (loopRef.current) {
      stopDetectionLoop(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
    }
    setVideoPlay(false);
    setCamActive(false);
    setVidErr(null);
    setGesture("none");
    setFps(0);
    handsRef.current = null;
    gestureStateRef.current = { gesture: "none", trackedHands: 0, lastLoggedGesture: "none", lastLogAt: 0 };
  }, [stopDetectionLoop]);

  const loadMPModel = useCallback(async (mode) => {
    setModelReady(false);
    const ok = await loadModel(mode);
    if (ok) setModelReady(true);
  }, [loadModel]);

  useEffect(() => {
    drawGrid();
    loadMPModel("image");
  }, [drawGrid, loadMPModel]);

  const triggerAction = useCallback((g, lm, handCount = lm ? 1 : 0) => {
    if (!lm) {
      handsRef.current = null;
    } else if (handCount <= 1) {
      handsRef.current = { hands: [{ landmarks: lm, handedness: "Right" }], count: handCount };
    }

    const state = gestureStateRef.current;
    const gestureChanged = state.gesture !== g;
    const handCountChanged = state.trackedHands !== handCount;

    if (handCountChanged) {
      state.trackedHands = handCount;
      setTrackedHands(handCount);
    }

    if (!gestureChanged) return;

    state.gesture = g;
    setGesture(g);
    inputManager.processGesture(g);
    interactionMachine.update(g);

    if (g === "none" || g === "unknown") return;

    const now = performance.now();
    if (state.lastLoggedGesture !== g || now - state.lastLogAt > 1200) {
      state.lastLoggedGesture = g;
      state.lastLogAt = now;
      setGCount((p) => ({ ...p, [g]: (p[g] || 0) + 1 }));
      setLog((p) => [{ gesture: g, meta: GESTURE_META[g], time: new Date().toLocaleTimeString() }, ...p.slice(0, 49)]);
    }

    if (g === "point") {
      setDrawMode((m) => {
        const next = !m;
        drawRef.current = next;
        notify(next ? "TRACE MODE ACTIVE" : "TRACE MODE IDLE", "#8888ff");
        return next;
      });
    }
    if (g === "fist") {
      pathRef.current = [];
      drawGrid();
      notify("TRACE CLEARED", "#ff4444");
    }
  }, [drawGrid, notify]);

  const updateDraw = useCallback((lm, w, h) => {
    if (!drawRef.current || !lm) return;
    const tip = lm[8];
    pathRef.current.push({ x: tip.x * w, y: tip.y * h });
    if (pathRef.current.length > 200) pathRef.current = pathRef.current.slice(-200);
  }, []);

  const tickFps = useCallback(() => {
    const now = Date.now();
    fpsRef.current.frames++;
    if (now - fpsRef.current.last >= 1000) {
      setFps(fpsRef.current.frames);
      fpsRef.current = { frames: 0, last: now };
    }
  }, []);

  const switchMode = useCallback((mode) => {
    stopAll();
    setInputMode(mode);
    setDrawMode(false);
    drawRef.current = false;
    pathRef.current = [];
    gestureStateRef.current = { gesture: "none", trackedHands: 0, lastLoggedGesture: "none", lastLogAt: 0 };
    drawGrid();
    loadMPModel(mode);
  }, [stopAll, drawGrid, loadMPModel]);

  const detectImg = useCallback(() => {
    if (!handLandmarkerRef.current || !modelReady) return;
    setScanning(true);
    const src = imgFile ? URL.createObjectURL(imgFile) : "/images/hand.jpg";
    const img = new Image();
    img.src = src;
    img.onload = () => {
      try {
        const cv = canvasRef.current;
        const ctx = cv.getContext("2d");
        cv.width = img.width;
        cv.height = img.height;
        ctx.drawImage(img, 0, 0);
        const res = hookDetect(img);
        const lm = res?.hands ? res.hands[0]?.landmarks : res;
        if (lm) {
          drawHand(ctx, lm, cv.width, cv.height);
          triggerAction(classifyGesture(lm), lm, 1);
        } else {
          handsRef.current = null;
          triggerAction("none", null);
          drawGrid();
        }
      } catch (e) {
        console.error(e);
      }
      setScanning(false);
      if (imgFile) URL.revokeObjectURL(src);
    };
    img.onerror = () => setScanning(false);
  }, [modelReady, handLandmarkerRef, hookDetect, triggerAction, drawGrid, imgFile]);

  const startLoop = useCallback((videoEl, mirror = false) => {
    const onFrame = (handsData, canvas) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.strokeStyle = T.grid;
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      if (mirror) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(videoEl, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
      } else {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      }
      if (pathRef.current.length > 1) {
        ctx.strokeStyle = "#ff66ff";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#ff66ff";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(pathRef.current[0].x, pathRef.current[0].y);
        pathRef.current.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      if (handsData) {
        const lm = handsData.hands ? handsData.hands[0]?.landmarks : handsData;
        handsRef.current = handsData;
        if (lm) {
          drawHand(ctx, lm, canvas.width, canvas.height);
          updateDraw(lm, canvas.width, canvas.height);
          triggerAction(classifyGesture(lm), lm, handsData.count || handsData.hands?.length || 1);
        }
      } else {
        handsRef.current = null;
        triggerAction("none", null, 0);
      }
      tickFps();
    };
    if (loopRef.current) {
      stopDetectionLoop(loopRef.current);
    }
    loopRef.current = hookLoop(videoEl, canvasRef, onFrame, mirror, {
      targetFps: renderMode === "safe" ? 24 : 30,
    });
  }, [T.grid, hookLoop, triggerAction, updateDraw, tickFps, stopDetectionLoop, renderMode]);

  const startVideo = useCallback(() => {
    if (!handLandmarkerRef.current || !modelReady) return;
    setVidErr(null);
    const v = videoRef.current;
    v.src = vidSrc || "/videos/hand.mp4";
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.onloadeddata = () => v.play().then(() => {
      setVideoPlay(true);
      startLoop(v, false);
    }).catch((e) => setVidErr(e.message));
    v.onerror = () => setVidErr("Could not load video");
    v.load();
  }, [modelReady, startLoop, vidSrc, handLandmarkerRef]);

  const stopVideo = useCallback(() => {
    if (loopRef.current) {
      stopDetectionLoop(loopRef.current);
      loopRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
    setVideoPlay(false);
    setGesture("none");
    setFps(0);
    handsRef.current = null;
    gestureStateRef.current = { gesture: "none", trackedHands: 0, lastLoggedGesture: "none", lastLogAt: 0 };
    drawGrid();
  }, [drawGrid, stopDetectionLoop]);

  const startCam = useCallback(async () => {
    if (!handLandmarkerRef.current || !modelReady) return;
    setVidErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: renderMode === "safe" ? 320 : 640,
          height: renderMode === "safe" ? 240 : 480,
          facingMode: "user",
        },
      });
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream;
      v.muted = true;
      v.playsInline = true;
      await v.play();
      setCamActive(true);
      setShow3D(true);
      startLoop(v, true);
    } catch (err) {
      setVidErr(err.name === "NotAllowedError" ? "Camera access denied." : `Camera error: ${err.message}`);
    }
  }, [modelReady, startLoop, renderMode, handLandmarkerRef]);

  const stopCam = useCallback(() => {
    if (loopRef.current) {
      stopDetectionLoop(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setCamActive(false);
    setGesture("none");
    setFps(0);
    handsRef.current = null;
    gestureStateRef.current = { gesture: "none", trackedHands: 0, lastLoggedGesture: "none", lastLogAt: 0 };
    drawGrid();
  }, [drawGrid, stopDetectionLoop]);

  useEffect(() => () => stopAll(), [stopAll]);

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: "'Courier New',monospace", minHeight: "100vh", padding: 0, margin: 0 }}>
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
      <DebugOverlay />
      {notif && (
        <div style={{ position: "fixed", top: 16, right: 16, padding: "11px 18px", background: `${notif.color}28`, border: `2px solid ${notif.color}`, borderRadius: 4, zIndex: 200, letterSpacing: 2, fontSize: 11, color: notif.color, fontFamily: "'Courier New',monospace" }}>
          {notif.msg}
        </div>
      )}

      <div style={{ padding: "16px 20px", maxWidth: 1300, margin: "0 auto" }}>
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/voxis-logo.png" alt="VOXIS" style={{ width: 32, height: 32, objectFit: "contain", filter: "drop-shadow(0 0 8px #00ffcc)" }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: 4, color: T.accent }}>VOXIS</div>
              <div style={{ fontSize: 8, color: T.dim, letterSpacing: 2, marginTop: 2 }}>Spatial Interaction Engine</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 8, color: modelReady ? "#00ffcc" : "#ff8800", letterSpacing: 1, marginRight: 4 }}>{modelReady ? "● READY" : "○ LOADING"}</span>
            {(videoPlay || camActive) && <span style={{ fontSize: 8, color: T.dim }}>{fps}fps</span>}
            <button onClick={() => setTheme((t) => (t === "dark" ? "neon" : "dark"))} style={btn(T)}>THEME</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
          {["mirror", "upload", "log"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ ...btn(T, tab === t), padding: "6px 14px", fontSize: 8, letterSpacing: 2 }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === "mirror" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
            <div>
              <div style={{ marginBottom: 10, border: `1px solid ${show3D ? "rgba(136,0,255,0.5)" : T.border}`, borderRadius: 4, overflow: "hidden", background: "#050810", position: "relative" }}>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={380}
                  style={{ display: "block", width: "100%", height: "auto", opacity: show3D ? 0 : 1, position: show3D ? "absolute" : "relative", transition: "opacity 0.2s" }}
                />
                {show3D && (
                  <div style={{ position: "relative", width: "100%", paddingTop: "63.3%" }}>
                    <div style={{ position: "absolute", inset: 0 }}>
                      <SpatialObjectController
                        handsRef={handsRef}
                        renderMode={renderMode}
                        uploadedModelFile={modelFile}
                        videoRef={videoRef}
                        useVideoBackground={camActive}
                      />
                    </div>
                  </div>
                )}
                <div style={{ padding: "5px 10px", borderTop: `1px solid ${T.border}`, fontSize: 8, color: T.dim, display: "flex", justifyContent: "space-between" }}>
                  <span>{inputMode.toUpperCase()} · {fps} FPS · {fmt(sessTime)}</span>
                  <span style={{ color: modelReady ? `${T.accent}66` : "#ff880066" }}>{modelReady ? "READY" : "LOADING"}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {[{ k: "image", l: "IMAGE" }, { k: "video", l: "VIDEO" }, { k: "webcam", l: "WEBCAM" }].map((m) => (
                  <button key={m.k} onClick={() => switchMode(m.k)} style={{ flex: 1, padding: "9px", background: inputMode === m.k ? `${T.accent}18` : "transparent", border: `1px solid ${inputMode === m.k ? T.accent : T.border}`, color: inputMode === m.k ? T.accent : T.dim, cursor: "pointer", borderRadius: 3, fontSize: 9, letterSpacing: 1, fontFamily: "'Courier New',monospace" }}>
                    {m.l}
                  </button>
                ))}
                <button onClick={() => setShow3D((s) => !s)} style={{ flex: 1, padding: "9px", background: show3D ? "rgba(136,0,255,0.18)" : "transparent", border: `1px solid ${show3D ? "#9900ff" : T.border}`, color: show3D ? "#bb44ff" : T.dim, cursor: "pointer", borderRadius: 3, fontSize: 9, letterSpacing: 1, fontFamily: "'Courier New',monospace" }}>
                  3D {show3D ? "ON" : "OFF"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button onClick={() => setRenderMode("safe")} style={{ ...btn(T, renderMode === "safe", "#00ffcc"), flex: 1, padding: "9px" }}>SAFE</button>
                <button onClick={() => setRenderMode("luxury")} style={{ ...btn(T, renderMode === "luxury", "#aa66ff"), flex: 1, padding: "9px" }}>LUXURY</button>
              </div>

              {inputMode === "image" && (
                <button onClick={detectImg} disabled={!modelReady || scanning} style={{ width: "100%", padding: "10px", marginBottom: 8, background: modelReady ? "#00ffcc1a" : "#111", border: `1px solid ${modelReady ? "#00ffcc44" : "#222"}`, color: modelReady ? "#00ffcc" : "#333", cursor: modelReady ? "pointer" : "not-allowed", borderRadius: 3, fontSize: 10, letterSpacing: 2, fontFamily: "'Courier New',monospace" }}>
                  {!modelReady ? "LOADING..." : (scanning ? "SCANNING..." : "RUN DETECTION")}
                </button>
              )}

              {inputMode === "video" && (
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <button onClick={startVideo} disabled={!modelReady || videoPlay} style={{ flex: 1, padding: "10px", background: "#44ffaa1a", border: "1px solid #44ffaa44", color: "#44ffaa", cursor: modelReady && !videoPlay ? "pointer" : "not-allowed", borderRadius: 3, fontSize: 9, letterSpacing: 2, fontFamily: "'Courier New',monospace" }}>
                    {videoPlay ? "PLAYING" : "PLAY VIDEO"}
                  </button>
                  {videoPlay && <button onClick={stopVideo} style={{ padding: "10px 14px", background: "rgba(255,68,68,0.18)", border: "1px solid rgba(255,68,68,0.4)", color: "#ff6666", cursor: "pointer", borderRadius: 3, fontSize: 9, fontFamily: "'Courier New',monospace" }}>STOP</button>}
                </div>
              )}

              {inputMode === "webcam" && (
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <button onClick={startCam} disabled={!modelReady || camActive} style={{ flex: 1, padding: "10px", background: "#ff66ff1a", border: "1px solid #ff66ff44", color: "#ff66ff", cursor: modelReady && !camActive ? "pointer" : "not-allowed", borderRadius: 3, fontSize: 9, letterSpacing: 2, fontFamily: "'Courier New',monospace" }}>
                    {camActive ? "ACTIVE" : "START WEBCAM"}
                  </button>
                  {camActive && <button onClick={stopCam} style={{ padding: "10px 14px", background: "rgba(255,68,68,0.18)", border: "1px solid rgba(255,68,68,0.4)", color: "#ff6666", cursor: "pointer", borderRadius: 3, fontSize: 9, fontFamily: "'Courier New',monospace" }}>STOP</button>}
                </div>
              )}

              {vidErr && <div style={{ marginBottom: 8, padding: "7px 10px", background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: 3, fontSize: 8, color: "#ff6666" }}>{vidErr}</div>}

              <div style={{ padding: "10px 14px", border: `1px solid ${cfg.color}33`, background: `${cfg.color}08`, borderRadius: 3, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.color, boxShadow: `0 0 12px ${cfg.color}` }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: "bold", color: cfg.color, letterSpacing: 2 }}>{cfg.label}</div>
                  <div style={{ fontSize: 8, color: T.dim, marginTop: 2 }}>{cfg.intent.toUpperCase()}</div>
                </div>
                {drawMode && <div style={{ marginLeft: "auto", fontSize: 8, color: "#8888ff", letterSpacing: 1, border: "1px solid #8888ff44", padding: "3px 7px", borderRadius: 2 }}>TRACE</div>}
              </div>
            </div>

            <aside style={{ padding: 14, border: `1px solid ${T.border}`, borderRadius: 4, background: `${T.panel}cc`, minHeight: 360 }}>
              <div style={{ fontSize: 8, color: T.dim, letterSpacing: 3, marginBottom: 14 }}>SPATIAL DEBUG</div>
              {[
                ["input", inputMode],
                ["gesture", gesture.replace(/_/g, " ")],
                ["intent", cfg.intent],
                ["hands", trackedHands],
                ["fps", fps],
                ["session", fmt(sessTime)],
                ["render", renderMode],
                ["3d", show3D ? "enabled" : "disabled"],
                ["webcam bg", camActive && show3D ? "live" : "inactive"],
                ["model", modelFile?.name || "default"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 8, color: "#435", letterSpacing: 1 }}>{label.toUpperCase()}</span>
                  <span style={{ fontSize: 9, color: T.accent, textAlign: "right", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
                </div>
              ))}
              <div style={{ fontSize: 8, color: T.dim, letterSpacing: 2, margin: "16px 0 8px" }}>GESTURE COUNTS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {Object.entries(gCount).slice(0, 8).map(([key, count]) => (
                  <div key={key} style={{ border: "1px solid rgba(0,255,204,0.08)", padding: 7, borderRadius: 2 }}>
                    <div style={{ fontSize: 7, color: "#465", textTransform: "uppercase" }}>{key.replace(/_/g, " ")}</div>
                    <div style={{ fontSize: 13, color: T.accent }}>{count}</div>
                  </div>
                ))}
                {Object.keys(gCount).length === 0 && <div style={{ gridColumn: "1 / -1", fontSize: 8, color: "#293", padding: 8, border: "1px dashed rgba(0,255,204,0.08)" }}>No gesture samples yet.</div>}
              </div>
            </aside>
          </div>
        )}

        {tab === "upload" && (
          <div>
            <div style={{ fontSize: 8, color: T.dim, letterSpacing: 3, marginBottom: 16 }}>FILE INPUTS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              <div style={{ padding: 16, border: "1px solid rgba(136,0,255,0.3)", borderRadius: 4, background: "rgba(136,0,255,0.04)" }}>
                <div style={{ fontSize: 9, color: "#aa66ff", letterSpacing: 2, marginBottom: 6 }}>3D MODEL</div>
                <div style={{ fontSize: 7, color: "#444", marginBottom: 10, lineHeight: 1.6 }}>Upload GLB, GLTF, or OBJ. Enable 3D mode to inspect it.</div>
                <label style={{ display: "block", padding: "10px", textAlign: "center", border: "1px dashed rgba(136,0,255,0.35)", borderRadius: 3, cursor: "pointer", color: modelFile ? "#aa66ff" : "#553377", fontSize: 8, letterSpacing: 1, transition: "all 0.2s" }}>
                  {modelFile ? `LOADED ${modelFile.name}` : "CHOOSE MODEL"}
                  <input type="file" accept=".glb,.gltf,.obj" style={{ display: "none" }} onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setModelFile(f);
                      if (!show3D) setShow3D(true);
                      setTab("mirror");
                      notify(`MODEL ${f.name}`, "#aa66ff");
                    }
                  }} />
                </label>
                {modelFile && <button onClick={() => setModelFile(null)} style={{ marginTop: 8, width: "100%", padding: "6px", background: "rgba(255,68,68,0.12)", border: "1px solid rgba(255,68,68,0.3)", color: "#ff6666", cursor: "pointer", borderRadius: 2, fontSize: 7, fontFamily: "'Courier New',monospace" }}>REMOVE</button>}
              </div>

              <div style={{ padding: 16, border: `1px solid ${T.border}`, borderRadius: 4, background: `${T.accent}04` }}>
                <div style={{ fontSize: 9, color: T.accent, letterSpacing: 2, marginBottom: 6 }}>HAND IMAGE</div>
                <div style={{ fontSize: 7, color: "#444", marginBottom: 10, lineHeight: 1.6 }}>Upload a hand image, switch to IMAGE mode, then run detection.</div>
                <label style={{ display: "block", padding: "10px", textAlign: "center", border: `1px dashed ${T.border}`, borderRadius: 3, cursor: "pointer", color: imgFile ? T.accent : "#2a5a4a", fontSize: 8, letterSpacing: 1 }}>
                  {imgFile ? `LOADED ${imgFile.name}` : "CHOOSE IMAGE"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setImgFile(f);
                      notify(`IMAGE ${f.name}`, "#00ffcc");
                    }
                  }} />
                </label>
              </div>

              <div style={{ padding: 16, border: "1px solid rgba(255,204,0,0.2)", borderRadius: 4, background: "rgba(255,204,0,0.03)" }}>
                <div style={{ fontSize: 9, color: "#ffcc00", letterSpacing: 2, marginBottom: 6 }}>VIDEO</div>
                <div style={{ fontSize: 7, color: "#444", marginBottom: 10, lineHeight: 1.6 }}>Upload MP4 or WebM, switch to VIDEO mode, then play.</div>
                <label style={{ display: "block", padding: "10px", textAlign: "center", border: "1px dashed rgba(255,204,0,0.3)", borderRadius: 3, cursor: "pointer", color: vidSrc ? "#ffcc00" : "#554400", fontSize: 8, letterSpacing: 1 }}>
                  {vidSrc ? "VIDEO LOADED" : "CHOOSE VIDEO"}
                  <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      if (vidSrc) URL.revokeObjectURL(vidSrc);
                      setVidSrc(URL.createObjectURL(f));
                      notify(`VIDEO ${f.name}`, "#ffcc00");
                    }
                  }} />
                </label>
              </div>
            </div>
          </div>
        )}

        {tab === "log" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: T.dim, letterSpacing: 2 }}>GESTURE LOG ({log.length})</div>
              <button onClick={() => setLog([])} style={btn(T)}>CLEAR</button>
            </div>
            {log.length === 0 ? (
              <div style={{ color: "#1a1a1a", padding: 40, textAlign: "center", border: "1px dashed #111", borderRadius: 4, fontSize: 10 }}>No gestures yet. Run detection to inspect input events.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 500, overflowY: "auto" }}>
                {log.map((e, i) => (
                  <div key={i} style={{ padding: "5px 10px", border: `1px solid ${e.meta?.color}18`, background: `${e.meta?.color}06`, borderRadius: 2, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.meta?.color }} />
                    <span style={{ fontSize: 8, color: e.meta?.color, flex: 1, letterSpacing: 1 }}>{e.gesture?.replace(/_/g, " ").toUpperCase()}</span>
                    <span style={{ fontSize: 7, color: "#2a2a2a" }}>{e.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
