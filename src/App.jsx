import { useState, useEffect, useRef, useCallback } from "react";
import TopBar from "./components/layout/TopBar";
import BottomNav from "./components/layout/BottomNav";
import GestureOverlay from "./components/mirror/GestureOverlay";
import MirrorViewport from "./components/mirror/MirrorViewport";
import UploadPanel from "./components/panels/UploadPanel";
import DebugPanel from "./components/panels/DebugPanel";
import NotesPanel from "./components/panels/NotesPanel";
import ScreenshotsPanel from "./components/panels/ScreenshotsPanel";
import CombosPanel from "./components/panels/CombosPanel";
import { useMediaPipe } from "./hooks/useMediaPipe";
import { useRenderMode } from "./hooks/useRenderMode";
import { THEMES } from "./constants/themes";
import { COMBOS } from "./utils/combos";
import { GC, classifyGesture, drawHand } from "./utils/gestures";

// ─── SOUNDS / EFFECT FACTORIES ───────────────────────────────────────────────
function beep(freq=440,type="sine",dur=0.15,vol=0.18){
  try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);o.start();o.stop(c.currentTime+dur);}catch{void 0;}
}

const mkParticles = (n=80)=>Array.from({length:n},(_,i)=>({
  id:Date.now()+i, x:Math.random()*100, y:-10-Math.random()*20,
  vx:(Math.random()-.5)*3, vy:2+Math.random()*3,
  color:["#ff00aa","#00ffcc","#ffcc00","#ff8800","#8888ff","#44ccff"][~~(Math.random()*6)],
  size:6+Math.random()*8, rot:Math.random()*360,
}));
const mkRain = emoji=>Array.from({length:30},(_,i)=>({
  id:Date.now()+i+1000, emoji, x:Math.random()*100, y:-5-Math.random()*10,
  vx:(Math.random()-.5), vy:1.5+Math.random()*2, rot:Math.random()*30-15, size:20+Math.random()*20,
}));

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function EmojiMirror() {
  const {handLandmarkerRef,loadModel,detectFromImage:hookDetect,startDetectionLoop:hookLoop}=useMediaPipe();

  // Refs
  const canvasRef    = useRef(null);
  const videoRef     = useRef(null);
  const cooldownRef  = useRef(false);
  const lastGestRef  = useRef("none");
  const loopRef      = useRef(null);
  const streamRef    = useRef(null);
  const fpsRef       = useRef({frames:0,last:Date.now()});
  const drawRef      = useRef(false);
  const pathRef      = useRef([]);
  const comboRef     = useRef([]);
  const comboTRef    = useRef(null);
  const handsRef     = useRef(null);

  // Core state
  const { renderMode, setRenderMode } = useRenderMode("luxury");
  const [theme,       setTheme]       = useState("dark");
  const [tab,         setTab]         = useState("mirror");
  const [inputMode,   setInputMode]   = useState("image");
  const [modelReady,  setModelReady]  = useState(false);
  const [scanning,    setScanning]    = useState(false);
  const [videoPlay,   setVideoPlay]   = useState(false);
  const [camActive,   setCamActive]   = useState(false);
  const [vidErr,      setVidErr]      = useState(null);
  const [gesture,     setGesture]     = useState("none");
  const [log,         setLog]         = useState([]);
  const [notes,       setNotes]       = useState([]);
  const [shots,       setShots]       = useState([]);
  const [comboLog,    setComboLog]    = useState([]);
  const [particles,   setParticles]   = useState([]);
  const [rain,        setRain]        = useState([]);
  const [cleared,     setCleared]     = useState(false);
  const [show3D,      setShow3D]      = useState(false);
  const [drawMode,    setDrawMode]    = useState(false);
  const [soundOn,     setSoundOn]     = useState(true);
  const [speechOn,    setSpeechOn]    = useState(false);
  const [fps,         setFps]         = useState(0);
  const [sessTime,    setSessTime]    = useState(0);
  const [gCount,      setGCount]      = useState({});
  const [notif,       setNotif]       = useState(null);
  const [timerOn,     setTimerOn]     = useState(false);
  const [timerN,      setTimerN]      = useState(0);
  const [sessStart]                   = useState(Date.now());
  const [isMobile,    setIsMobile]    = useState(()=>typeof window !== "undefined" && window.innerWidth < 820);

  // Upload state
  const [modelFile,   setModelFile]   = useState(null);  // GLB/OBJ → 3D scene
  const [imgFile,     setImgFile]     = useState(null);  // custom image for detection
  const [vidSrc,      setVidSrc]      = useState(null);  // blob URL for custom video

  const T = THEMES[theme];
  const fmt = s=>`${String(~~(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  // Mobile breakpoint listener keeps the inline cyberpunk layout responsive.
  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth < 820);
    window.addEventListener("resize",onResize);
    return()=>window.removeEventListener("resize",onResize);
  },[]);

  // Session clock
  useEffect(()=>{
    const t=setInterval(()=>setSessTime(~~((Date.now()-sessStart)/1000)),1000);
    return()=>clearInterval(t);
  },[]);

  const notify = useCallback((msg,color=T.accent)=>{
    setNotif({msg,color}); setTimeout(()=>setNotif(null),2500);
  },[T.accent]);

  // ── Stop everything ────────────────────────────────────────────────────────
  const stopAll = useCallback(()=>{
    if(loopRef.current){cancelAnimationFrame(loopRef.current.id);loopRef.current=null;}
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}
    if(videoRef.current){videoRef.current.pause();videoRef.current.srcObject=null;videoRef.current.src="";}
    setVideoPlay(false);setCamActive(false);setVidErr(null);setGesture("none");setFps(0);handsRef.current=null;
  },[]);

  // ── Load MediaPipe model ───────────────────────────────────────────────────
  const loadMPModel = useCallback(async(mode)=>{
    setModelReady(false); const ok=await loadModel(mode); if(ok)setModelReady(true);
  },[loadModel]);

  // ── Grid ──────────────────────────────────────────────────────────────────
  const drawGrid = useCallback(()=>{
    const cv=canvasRef.current; if(!cv)return;
    const ctx=cv.getContext("2d");
    ctx.clearRect(0,0,cv.width,cv.height);
    ctx.strokeStyle=T.grid; ctx.lineWidth=1;
    for(let x=0;x<cv.width;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,cv.height);ctx.stroke();}
    for(let y=0;y<cv.height;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cv.width,y);ctx.stroke();}
    if(pathRef.current.length>1){
      ctx.strokeStyle="#ff66ff";ctx.lineWidth=3;ctx.shadowColor="#ff66ff";ctx.shadowBlur=8;
      ctx.beginPath();ctx.moveTo(pathRef.current[0].x,pathRef.current[0].y);
      pathRef.current.forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();ctx.shadowBlur=0;
    }
  },[T.grid]);

  useEffect(()=>{drawGrid();loadMPModel("image");},[]);

  // ── Combo check ───────────────────────────────────────────────────────────
  const checkCombo = useCallback((g)=>{
    const c=comboRef.current; c.push(g); if(c.length>2)c.shift();
    if(comboTRef.current)clearTimeout(comboTRef.current);
    comboTRef.current=setTimeout(()=>{comboRef.current=[];},2500);
    const key=c.join(",");
    if(COMBOS[key]){
      notify("COMBO: "+COMBOS[key],"#ffcc00");
      if(soundOn){beep(880,"sine",0.05,0.3);setTimeout(()=>beep(1047,"sine",0.1,0.3),100);setTimeout(()=>beep(1319,"sine",0.2,0.3),200);}
      setComboLog(p=>[{combo:COMBOS[key],time:new Date().toLocaleTimeString()},...p.slice(0,9)]);
      comboRef.current=[];
    }
  },[soundOn,notify]);

  // ── Action trigger ────────────────────────────────────────────────────────
  const triggerAction = useCallback((g,lm)=>{
    if(lm) handsRef.current={hands:[{landmarks:lm,handedness:"Right"}],count:1};
    else   handsRef.current=null;
    setGesture(g);
    if(g==="none"||g==="unknown")return;
    if(cooldownRef.current)return;
    if(g===lastGestRef.current)return;
    cooldownRef.current=true; lastGestRef.current=g;
    setGCount(p=>({...p,[g]:(p[g]||0)+1}));
    const cfg=GC[g]; const act=cfg?.action;
    if(soundOn){const s={thumbs_up:()=>beep(660),thumbs_down:()=>beep(220,"sawtooth",0.3),victory:()=>{beep(523);setTimeout(()=>beep(659),100);setTimeout(()=>beep(784),200);},open_palm:()=>beep(440,"sine",0.4),fist:()=>beep(120,"square"),point:()=>beep(880,"sine",0.1),rock_on:()=>{beep(110,"sawtooth");setTimeout(()=>beep(165,"sawtooth"),100);},ok:()=>beep(1047,"sine",0.2),four:()=>beep(587),call_me:()=>{beep(700);setTimeout(()=>beep(600),200);setTimeout(()=>beep(700),400);}};s[g]&&s[g]();}
    if(speechOn){try{const u=new SpeechSynthesisUtterance(cfg?.label||g);u.rate=1.1;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);}catch{void 0;}}
    setLog(p=>[{g,cfg,time:new Date().toLocaleTimeString()},...p.slice(0,49)]);
    if(act==="confetti")  setParticles(mkParticles());
    if(act==="clear")     {setCleared(true);setTimeout(()=>setCleared(false),800);pathRef.current=[];drawGrid();}
    if(act==="save_note") setNotes(p=>[{text:"Note @ "+new Date().toLocaleTimeString(),time:Date.now()},...p]);
    if(act==="delete")    setNotes(p=>p.slice(1));
    if(act==="draw")      {setDrawMode(m=>!m);drawRef.current=!drawRef.current;notify(drawRef.current?"✏️ Draw ON":"✏️ Draw OFF","#8888ff");}
    if(act==="rock")      setRain(mkRain("🎸"));
    if(act==="call")      setRain(mkRain("📞"));
    if(act==="starfleet") setRain(mkRain("🖖"));
    if(act==="shoot")     setRain(mkRain("💥"));
    if(act==="confirm")   notify("✅ Confirmed!","#aaffaa");
    if(act==="notify")    notify("🔔 Notification!","#44ffaa");
    if(act==="timer"){
      setTimerOn(true);setTimerN(3);let c=3;
      const t=setInterval(()=>{c--;setTimerN(c);if(c<=0){clearInterval(t);setTimerOn(false);notify("⏱ Time's up!","#44ccff");}},1000);
    }
    if(act==="screenshot"){
      const cv=canvasRef.current;
      if(cv){const url=cv.toDataURL("image/png");setShots(p=>[{label:`Shot ${p.length+1}`,time:new Date().toLocaleTimeString(),url},...p]);notify("📸 Screenshot!","#00ffcc");const a=document.createElement("a");a.href=url;a.download=`snap-${Date.now()}.png`;a.click();}
    }
    checkCombo(g);
    setTimeout(()=>{cooldownRef.current=false;lastGestRef.current="none";},1500);
  },[soundOn,speechOn,checkCombo,drawGrid,notify]);

  // ── Draw mode ────────────────────────────────────────────────────────────
  const updateDraw = useCallback((lm,w,h)=>{
    if(!drawRef.current||!lm)return;
    const tip=lm[8]; pathRef.current.push({x:tip.x*w,y:tip.y*h});
    if(pathRef.current.length>200)pathRef.current=pathRef.current.slice(-200);
  },[]);

  // ── FPS ──────────────────────────────────────────────────────────────────
  const tickFps = useCallback(()=>{
    const now=Date.now(); fpsRef.current.frames++;
    if(now-fpsRef.current.last>=1000){setFps(fpsRef.current.frames);fpsRef.current={frames:0,last:now};}
  },[]);

  // ── Switch mode ───────────────────────────────────────────────────────────
  const switchMode = useCallback((mode)=>{
    stopAll();setInputMode(mode);setDrawMode(false);pathRef.current=[];drawGrid();loadMPModel(mode);
  },[stopAll,drawGrid,loadMPModel]);

  // ── Image detection ───────────────────────────────────────────────────────
  const detectImg = useCallback(()=>{
    if(!handLandmarkerRef.current||!modelReady)return;
    setScanning(true);
    const src=imgFile?URL.createObjectURL(imgFile):"/images/hand.jpg";
    const img=new Image(); img.src=src;
    img.onload=()=>{
      try{
        const cv=canvasRef.current,ctx=cv.getContext("2d");
        cv.width=img.width; cv.height=img.height; ctx.drawImage(img,0,0);
        const res=hookDetect(img);
        const lm=res?.hands?res.hands[0]?.landmarks:res;
        if(lm){drawHand(ctx,lm,cv.width,cv.height);const detectedGesture = classifyGesture(lm || []);
triggerAction(detectedGesture, lm);}
        else  {handsRef.current=null;triggerAction("none",null);drawGrid();}
      }catch(e){console.error(e);}
      setScanning(false);
      if(imgFile)URL.revokeObjectURL(src);
    };
    img.onerror=()=>setScanning(false);
  },[modelReady,handLandmarkerRef,hookDetect,triggerAction,drawGrid,imgFile]);


  <div
  style={{
    display: "flex",
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  }}
>
  <button
    onClick={() => setRenderMode("safe")}
    style={{
      background:
        renderMode === "safe" ? "#00ffcc" : "#111",
      color:
        renderMode === "safe" ? "#000" : "#00ffcc",
      border: "1px solid #00ffcc",
      padding: "6px 12px",
      cursor: "pointer",
    }}
  >
    ⚡ SAFE
  </button>

  <button
    onClick={() => setRenderMode("luxury")}
    style={{
      background:
        renderMode === "luxury" ? "#00ffcc" : "#111",
      color:
        renderMode === "luxury" ? "#000" : "#00ffcc",
      border: "1px solid #00ffcc",
      padding: "6px 12px",
      cursor: "pointer",
    }}
  >
    💎 LUXURY
  </button>
</div>


  // ── Video/webcam loop ─────────────────────────────────────────────────────
  const startLoop = useCallback((videoEl,mirror=false)=>{
    const onFrame=(handsData,canvas)=>{
      if(!canvas)return;
      const ctx=canvas.getContext("2d");
      // Grid
      ctx.strokeStyle=T.grid;ctx.lineWidth=1;
      for(let x=0;x<canvas.width;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
      for(let y=0;y<canvas.height;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
      // Video frame
      if(mirror){ctx.save();ctx.scale(-1,1);ctx.drawImage(videoEl,-canvas.width,0,canvas.width,canvas.height);ctx.restore();}
      else ctx.drawImage(videoEl,0,0,canvas.width,canvas.height);
      // Draw path
      if(pathRef.current.length>1){ctx.strokeStyle="#ff66ff";ctx.lineWidth=3;ctx.shadowColor="#ff66ff";ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(pathRef.current[0].x,pathRef.current[0].y);pathRef.current.forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();ctx.shadowBlur=0;}
      // Hand data
      if(handsData){
        const lm=handsData.hands?handsData.hands[0]?.landmarks:handsData;
        handsRef.current=handsData;
        if(lm){drawHand(ctx,lm,canvas.width,canvas.height);updateDraw(lm,canvas.width,canvas.height);const detectedGesture = classifyGesture(lm || []);
triggerAction(detectedGesture, lm);}
      }else{handsRef.current=null;triggerAction("none",null);}
      tickFps();
    };
    loopRef.current=hookLoop(videoEl,canvasRef,onFrame,mirror);
  },[T.grid,hookLoop,triggerAction,updateDraw,tickFps]);

  // ── Start video ───────────────────────────────────────────────────────────
  const startVideo = useCallback(()=>{
    if(!handLandmarkerRef.current||!modelReady)return;
    setVidErr(null);
    const v=videoRef.current;
    v.src=vidSrc||"/videos/hand.mp4"; v.loop=true; v.muted=true; v.playsInline=true;
    v.onloadeddata=()=>v.play().then(()=>{setVideoPlay(true);startLoop(v,false);}).catch(e=>setVidErr(e.message));
    v.onerror=()=>setVidErr("Could not load video");
    v.load();
  },[modelReady,startLoop,vidSrc]);

  const stopVideo = useCallback(()=>{
    if(loopRef.current){cancelAnimationFrame(loopRef.current.id);loopRef.current=null;}
    if(videoRef.current){videoRef.current.pause();videoRef.current.src="";}
    setVideoPlay(false);setGesture("none");setFps(0);handsRef.current=null;drawGrid();
  },[drawGrid]);

  // ── Webcam ────────────────────────────────────────────────────────────────
  const startCam = useCallback(async()=>{
    if(!handLandmarkerRef.current||!modelReady)return;
    setVidErr(null);
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video: {
  width: renderMode === "safe" ? 320 : 640,
  height: renderMode === "safe" ? 240 : 480,
  facingMode: "user",
}});
      streamRef.current=stream;
      const v=videoRef.current;
      v.srcObject=stream;v.muted=true;v.playsInline=true;await v.play();
      setCamActive(true);startLoop(v,true);
    }catch(err){setVidErr(err.name==="NotAllowedError"?"Camera access denied.":"Camera error: "+err.message);}
  },[modelReady,startLoop]);

  const stopCam = useCallback(()=>{
    if(loopRef.current){cancelAnimationFrame(loopRef.current.id);loopRef.current=null;}
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}
    if(videoRef.current){videoRef.current.pause();videoRef.current.srcObject=null;}
    setCamActive(false);setGesture("none");setFps(0);handsRef.current=null;drawGrid();
  },[drawGrid]);

  useEffect(()=>()=>stopAll(),[stopAll]);

  // ── Particle animations ───────────────────────────────────────────────────
  useEffect(()=>{
    if(!particles.length)return;
    let local=[...particles],f;
    const tick=()=>{local=local.map(p=>({...p,x:p.x+p.vx,y:p.y+p.vy,rot:p.rot+3,vy:p.vy+0.08})).filter(p=>p.y<120);setParticles([...local]);if(local.length)f=requestAnimationFrame(tick);};
    f=requestAnimationFrame(tick);return()=>cancelAnimationFrame(f);
  },[particles.length>0&&particles[0]?.id]);

  useEffect(()=>{
    if(!rain.length)return;
    let local=[...rain],f;
    const tick=()=>{local=local.map(p=>({...p,x:p.x+p.vx,y:p.y+p.vy,rot:p.rot+2})).filter(p=>p.y<120);setRain([...local]);if(local.length)f=requestAnimationFrame(tick);};
    f=requestAnimationFrame(tick);return()=>cancelAnimationFrame(f);
  },[rain.length>0&&rain[0]?.id]);

  const cfg = GC[gesture]||GC.none;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{background:T.bg,color:T.text,fontFamily:"'Courier New',monospace",minHeight:"100vh",padding:0,margin:0}}>
      <video ref={videoRef} style={{display:"none"}} playsInline muted />

      <GestureOverlay particles={particles} rain={rain} cleared={cleared} notif={notif} timerOn={timerOn} timerN={timerN} />

      <div style={{padding:isMobile?"12px":"16px 20px",maxWidth:1300,margin:"0 auto"}}>
        <TopBar
          T={T}
          modelReady={modelReady}
          videoPlay={videoPlay}
          camActive={camActive}
          fps={fps}
          soundOn={soundOn}
          speechOn={speechOn}
          onToggleTheme={()=>setTheme(t=>t==="dark"?"neon":"dark")}
          onToggleSound={()=>setSoundOn(s=>!s)}
          onToggleSpeech={()=>setSpeechOn(s=>!s)}
        />

        <BottomNav T={T} tab={tab} setTab={setTab} />

        {tab==="mirror"&&(
          <MirrorViewport
            T={T}
            isMobile={isMobile}
            canvasRef={canvasRef}
            show3D={show3D}
            handsRef={handsRef}
            renderMode={renderMode}
            modelFile={modelFile}
            inputMode={inputMode}
            fps={fps}
            sessTime={sessTime}
            fmt={fmt}
            modelReady={modelReady}
            switchMode={switchMode}
            setShow3D={setShow3D}
            setRenderMode={setRenderMode}
            detectImg={detectImg}
            scanning={scanning}
            videoPlay={videoPlay}
            startVideo={startVideo}
            stopVideo={stopVideo}
            camActive={camActive}
            startCam={startCam}
            stopCam={stopCam}
            vidErr={vidErr}
            cfg={cfg}
            drawMode={drawMode}
            gesture={gesture}
            gCount={gCount}
          />
        )}

        {tab==="upload"&&(
          <UploadPanel
            T={T}
            isMobile={isMobile}
            modelFile={modelFile}
            setModelFile={setModelFile}
            imgFile={imgFile}
            setImgFile={setImgFile}
            vidSrc={vidSrc}
            setVidSrc={setVidSrc}
            show3D={show3D}
            setShow3D={setShow3D}
            setTab={setTab}
            setInputMode={setInputMode}
            notify={notify}
            detectImg={detectImg}
            startVideo={startVideo}
          />
        )}

        {tab==="log"&&<DebugPanel T={T} log={log} setLog={setLog} />}
        {tab==="notes"&&<NotesPanel T={T} notes={notes} setNotes={setNotes} />}
        {tab==="screenshots"&&<ScreenshotsPanel T={T} shots={shots} />}
        {tab==="combos"&&<CombosPanel comboLog={comboLog} isMobile={isMobile} />}
      </div>
    </div>
  );
}
