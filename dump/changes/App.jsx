import { useState, useEffect, useRef, useCallback } from "react";
import SpatialObjectController from "./components/SpatialObjectController";
import { useFaceTracker } from "./utils/useFaceTracker";

// ─── HAND DRAWING ─────────────────────────────────────────────────────────────
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],
];
function drawHand(ctx, lm, w, h) {
  if (!lm?.length) return;
  const pts = lm.map(p => ({ x: p.x*w, y: p.y*h }));
  ctx.shadowColor="#00ffcc"; ctx.shadowBlur=12;
  ctx.strokeStyle="rgba(0,255,204,0.75)"; ctx.lineWidth=2.5;
  CONNECTIONS.forEach(([a,b])=>{ ctx.beginPath();ctx.moveTo(pts[a].x,pts[a].y);ctx.lineTo(pts[b].x,pts[b].y);ctx.stroke(); });
  pts.forEach((pt,i)=>{
    const k=[0,5,9,13,17].includes(i);
    ctx.shadowColor=k?"#ff00aa":"#00ffcc"; ctx.shadowBlur=18;
    ctx.beginPath(); ctx.arc(pt.x,pt.y,k?6:4,0,Math.PI*2);
    ctx.fillStyle=k?"#ff00aa":"#00ffcc"; ctx.fill();
  });
  ctx.shadowBlur=0;
}

// ─── GESTURE DETECTION ────────────────────────────────────────────────────────
function dist2D(a,b){ return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2); }
function getFingerStates(lm) {
  const M=0.04;
  const index=lm[8].y<lm[5].y-M, middle=lm[12].y<lm[9].y-M,
        ring=lm[16].y<lm[13].y-M, pinky=lm[20].y<lm[17].y-M;
  const [t,ti,w,im]=[lm[4],lm[3],lm[0],lm[5]];
  const thumbUp=t.y<w.y-0.1&&t.y<ti.y-0.02;
  const thumbDown=t.y>w.y+0.1&&t.y>ti.y+0.02;
  const thumbOut=!thumbUp&&!thumbDown&&dist2D(t,im)>0.15;
  return {index,middle,ring,pinky,thumbUp,thumbDown,thumbOut};
}
function classifyGesture(lm) {
  if (!lm||lm.length<21) return "none";
  const {index,middle,ring,pinky,thumbUp,thumbDown,thumbOut}=getFingerStates(lm);
  const fold=!index&&!middle&&!ring&&!pinky;
  const all=index&&middle&&ring&&pinky;
  if(thumbUp&&fold)                                        return "thumbs_up";
  if(thumbDown&&fold)                                      return "thumbs_down";
  if(all&&thumbOut)                                        return "open_palm";
  if(fold&&!thumbUp&&!thumbDown)                           return "fist";
  if(index&&middle&&!ring&&!pinky)                         return "victory";
  if(index&&!middle&&!ring&&!pinky&&!thumbUp&&!thumbOut)   return "point";
  if(index&&!middle&&!ring&&pinky)                         return "rock_on";
  if(index&&middle&&ring&&!pinky)                          return "three";
  if(all&&!thumbOut&&!thumbUp)                             return "four";
  if(thumbOut&&!index&&!middle&&!ring&&pinky)              return "call_me";
  if(thumbOut&&index&&!middle&&!ring&&!pinky)              return "ok";
  if(all&&!thumbUp&&!thumbDown)                            return "vulcan";
  if(index&&!middle&&!ring&&!pinky&&(thumbUp||thumbOut))   return "finger_gun";
  return "unknown";
}

// ─── GESTURE CONFIG ───────────────────────────────────────────────────────────
const GC = {
  thumbs_up:   {emoji:"👍",label:"Thumbs Up",  action:"save_note", color:"#ffcc00",desc:"Note saved!"},
  thumbs_down: {emoji:"👎",label:"Thumbs Down",action:"delete",    color:"#ff4444",desc:"Note deleted!"},
  victory:     {emoji:"✌️",label:"Victory",    action:"screenshot",color:"#00ffcc",desc:"Screenshot!"},
  open_palm:   {emoji:"🖐️",label:"Open Palm", action:"confetti",  color:"#ff66ff",desc:"Confetti! 🎉"},
  fist:        {emoji:"✊",label:"Fist",        action:"clear",     color:"#ff4444",desc:"Cleared!"},
  point:       {emoji:"☝️",label:"Point",      action:"draw",      color:"#8888ff",desc:"Draw mode!"},
  rock_on:     {emoji:"🤘",label:"Rock On",    action:"rock",      color:"#ff8800",desc:"Rock on! 🎸"},
  three:       {emoji:"3️⃣",label:"Three",      action:"timer",     color:"#44ccff",desc:"3sec timer!"},
  four:        {emoji:"4️⃣",label:"Four",       action:"notify",    color:"#44ffaa",desc:"Notification!"},
  call_me:     {emoji:"🤙",label:"Call Me",    action:"call",      color:"#ff66aa",desc:"Calling... 📞"},
  ok:          {emoji:"👌",label:"OK",          action:"confirm",   color:"#aaffaa",desc:"Confirmed! ✅"},
  vulcan:      {emoji:"🖖",label:"Vulcan",     action:"starfleet", color:"#8866ff",desc:"Live long! 🖖"},
  finger_gun:  {emoji:"🫵",label:"Finger Gun", action:"shoot",     color:"#ffaa44",desc:"Pew pew! 💥"},
  none:        {emoji:"🤚",label:"No hand",    action:null,        color:"#555",   desc:""},
  unknown:     {emoji:"🤔",label:"Unknown",    action:null,        color:"#444",   desc:"Unrecognized"},
};

// ─── SOUNDS ───────────────────────────────────────────────────────────────────
function beep(freq=440,type="sine",dur=0.15,vol=0.18){
  try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);o.start();o.stop(c.currentTime+dur);}catch(e){}
}

// ─── PARTICLES / EMOJI RAIN ───────────────────────────────────────────────────
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

// ─── COMBOS ───────────────────────────────────────────────────────────────────
const COMBOS = {
  "thumbs_up,victory":"🌟 SUPER SAVE!", "rock_on,fist":"💥 ROCK SMASH!",
  "open_palm,fist":"🤜 HIGH FIVE!", "victory,victory":"✌️✌️ DOUBLE PEACE!",
  "thumbs_up,thumbs_up":"👍👍 DOUBLE YES!", "vulcan,open_palm":"🖖🖐️ GREETINGS!",
  "finger_gun,finger_gun":"💥💥 DOUBLE SHOT!", "ok,thumbs_up":"✅👍 PERFECT!",
  "fist,rock_on":"🤘 UNLEASH THE ROCK!",
};

// ─── THEME ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark:  {bg:"#080c10",panel:"#0c1018",border:"rgba(0,255,204,0.18)",accent:"#00ffcc",dim:"#3a4a3a",text:"#d0e8d0",grid:"rgba(0,255,204,0.04)"},
  neon:  {bg:"#0a0020",panel:"#10002a",border:"rgba(180,0,255,0.25)",accent:"#cc00ff",dim:"#440066",text:"#e0c0ff",grid:"rgba(180,0,255,0.05)"},
};

// ─── BUTTON STYLE HELPER ──────────────────────────────────────────────────────
const btn = (T,active=false,color=null)=>({
  padding:"7px 13px", fontSize:9, letterSpacing:1.5, cursor:"pointer",
  background: active?`${color||T.accent}18`:"transparent",
  border:`1px solid ${active?(color||T.accent):T.border}`,
  color: active?(color||T.accent):T.dim,
  borderRadius:3, fontFamily:"'Courier New',monospace", transition:"all 0.15s",
});

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function EmojiMirror() {
  const {handLandmarkerRef,loadModel,detectFromImage:hookDetect,startDetectionLoop:hookLoop}=useFaceTracker();

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

  // Upload state
  const [modelFile,   setModelFile]   = useState(null);  // GLB/OBJ → 3D scene
  const [imgFile,     setImgFile]     = useState(null);  // custom image for detection
  const [vidSrc,      setVidSrc]      = useState(null);  // blob URL for custom video

  const T = THEMES[theme];
  const fmt = s=>`${String(~~(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

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
    if(speechOn){try{const u=new SpeechSynthesisUtterance(cfg?.label||g);u.rate=1.1;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);}catch(e){}}
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
        if(lm){drawHand(ctx,lm,cv.width,cv.height);triggerAction(classifyGesture(lm),lm);}
        else  {handsRef.current=null;triggerAction("none",null);drawGrid();}
      }catch(e){console.error(e);}
      setScanning(false);
      if(imgFile)URL.revokeObjectURL(src);
    };
    img.onerror=()=>setScanning(false);
  },[modelReady,handLandmarkerRef,hookDetect,triggerAction,drawGrid,imgFile]);

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
        if(lm){drawHand(ctx,lm,canvas.width,canvas.height);updateDraw(lm,canvas.width,canvas.height);triggerAction(classifyGesture(lm),lm);}
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
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}});
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

  useEffect(() => {
  return () => {
    if (vidSrc) {
      URL.revokeObjectURL(vidSrc);
    }
  };
}, [vidSrc]);


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

      {/* Overlays */}
      {particles.map(p=><div key={p.id} style={{position:"fixed",left:`${p.x}%`,top:`${p.y}%`,width:p.size,height:p.size,background:p.color,transform:`rotate(${p.rot}deg)`,pointerEvents:"none",zIndex:60,borderRadius:"50%"}}/>)}
      {rain.map(p=><div key={p.id} style={{position:"fixed",left:`${p.x}%`,top:`${p.y}%`,fontSize:p.size,transform:`rotate(${p.rot}deg)`,pointerEvents:"none",zIndex:61,lineHeight:1}}>{p.emoji}</div>)}
      {cleared&&<div style={{position:"fixed",inset:0,background:"rgba(255,68,68,0.15)",zIndex:55,pointerEvents:"none"}}/>}
      {notif&&<div style={{position:"fixed",top:16,right:16,padding:"11px 18px",background:notif.color+"28",border:`2px solid ${notif.color}`,borderRadius:4,zIndex:200,letterSpacing:2,fontSize:11,color:notif.color,fontFamily:"'Courier New',monospace"}}>{notif.msg}</div>}
      {timerOn&&<div style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,pointerEvents:"none",fontSize:180,fontWeight:"bold",color:"rgba(0,255,204,0.25)"}}>{timerN}</div>}

      <div style={{padding:"16px 20px",maxWidth:1300,margin:"0 auto"}}>

        {/* ── HEADER ── */}
        <div style={{marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:20,fontWeight:"bold",letterSpacing:4,color:T.accent}}>🪞 EMOJI MIRROR</div>
            <div style={{fontSize:8,color:T.dim,letterSpacing:2,marginTop:2}}>Gesture · Hand Tracking · 3D Physics</div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:8,color:modelReady?"#00ffcc":"#ff8800",letterSpacing:1,marginRight:4}}>{modelReady?"● READY":"○ LOADING"}</span>
            {(videoPlay||camActive)&&<span style={{fontSize:8,color:T.dim}}>{fps}fps</span>}
            <button onClick={()=>setTheme(t=>t==="dark"?"neon":"dark")} style={btn(T)}>🎨 THEME</button>
            <button onClick={()=>setSoundOn(s=>!s)} style={btn(T,soundOn)}>🔊 {soundOn?"ON":"OFF"}</button>
            <button onClick={()=>setSpeechOn(s=>!s)} style={btn(T,speechOn)}>🗣 {speechOn?"ON":"OFF"}</button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{display:"flex",gap:4,marginBottom:14,borderBottom:`1px solid ${T.border}`,paddingBottom:8}}>
          {["mirror","upload","log","notes","screenshots","combos"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{...btn(T,tab===t),padding:"6px 14px",fontSize:8,letterSpacing:2}}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ══════════════ MIRROR TAB ══════════════ */}
        {tab==="mirror"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:16}}>

            {/* LEFT: viewport + controls */}
            <div>
              {/* Viewport */}
              <div style={{marginBottom:10,border:`1px solid ${show3D?"rgba(136,0,255,0.5)":T.border}`,borderRadius:4,overflow:"hidden",background:"#050810",position:"relative"}}>
                <canvas ref={canvasRef} width={600} height={380}
                  style={{display:"block",width:"100%",height:"auto",opacity:show3D?0:1,position:show3D?"absolute":"relative",transition:"opacity 0.2s"}}/>
                {show3D&&(
                  <div style={{position:"relative",width:"100%",paddingTop:"63.3%"}}>
                    <div style={{position:"absolute",inset:0}}>
                      <SpatialObjectController handsRef={handsRef} uploadedModelFile={modelFile}/>
                    </div>
                  </div>
                )}
                <div style={{padding:"5px 10px",borderTop:`1px solid ${T.border}`,fontSize:8,color:T.dim,display:"flex",justifyContent:"space-between"}}>
                  <span>{inputMode.toUpperCase()} · {fps} FPS · {fmt(sessTime)}</span>
                  <span style={{color:modelReady?T.accent+"66":"#ff880066"}}>{modelReady?"READY":"LOADING"}</span>
                </div>
              </div>

              {/* Mode row */}
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                {[{k:"image",l:"📷 IMAGE"},{k:"video",l:"🎞 VIDEO"},{k:"webcam",l:"🎥 WEBCAM"}].map(m=>(
                  <button key={m.k} onClick={()=>switchMode(m.k)} style={{flex:1,padding:"9px",background:inputMode===m.k?`${T.accent}18`:"transparent",border:`1px solid ${inputMode===m.k?T.accent:T.border}`,color:inputMode===m.k?T.accent:T.dim,cursor:"pointer",borderRadius:3,fontSize:9,letterSpacing:1,fontFamily:"'Courier New',monospace"}}>
                    {m.l}
                  </button>
                ))}
                <button onClick={()=>setShow3D(s=>!s)} style={{flex:1,padding:"9px",background:show3D?"rgba(136,0,255,0.18)":"transparent",border:`1px solid ${show3D?"#9900ff":T.border}`,color:show3D?"#bb44ff":T.dim,cursor:"pointer",borderRadius:3,fontSize:9,letterSpacing:1,fontFamily:"'Courier New',monospace"}}>
                  ◈ 3D {show3D?"ON":"OFF"}
                </button>
              </div>

              {/* Action buttons */}
              {inputMode==="image"&&(
                <button onClick={detectImg} disabled={!modelReady||scanning} style={{width:"100%",padding:"10px",marginBottom:8,background:modelReady?"#00ffcc1a":"#111",border:`1px solid ${modelReady?"#00ffcc44":"#222"}`,color:modelReady?"#00ffcc":"#333",cursor:modelReady?"pointer":"not-allowed",borderRadius:3,fontSize:10,letterSpacing:2,fontFamily:"'Courier New',monospace"}}>
                  {!modelReady?"⏳ LOADING...":(scanning?"SCANNING...":"▶  RUN DETECTION")}
                </button>
              )}
              {inputMode==="video"&&(
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <button onClick={startVideo} disabled={!modelReady||videoPlay} style={{flex:1,padding:"10px",background:"#44ffaa1a",border:"1px solid #44ffaa44",color:"#44ffaa",cursor:modelReady&&!videoPlay?"pointer":"not-allowed",borderRadius:3,fontSize:9,letterSpacing:2,fontFamily:"'Courier New',monospace"}}>
                    {videoPlay?"● PLAYING":"▶  PLAY VIDEO"}
                  </button>
                  {videoPlay&&<button onClick={stopVideo} style={{padding:"10px 14px",background:"rgba(255,68,68,0.18)",border:"1px solid rgba(255,68,68,0.4)",color:"#ff6666",cursor:"pointer",borderRadius:3,fontSize:9,fontFamily:"'Courier New',monospace"}}>■ STOP</button>}
                </div>
              )}
              {inputMode==="webcam"&&(
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <button onClick={startCam} disabled={!modelReady||camActive} style={{flex:1,padding:"10px",background:"#ff66ff1a",border:"1px solid #ff66ff44",color:"#ff66ff",cursor:modelReady&&!camActive?"pointer":"not-allowed",borderRadius:3,fontSize:9,letterSpacing:2,fontFamily:"'Courier New',monospace"}}>
                    {camActive?"● ACTIVE":"▶  START WEBCAM"}
                  </button>
                  {camActive&&<button onClick={stopCam} style={{padding:"10px 14px",background:"rgba(255,68,68,0.18)",border:"1px solid rgba(255,68,68,0.4)",color:"#ff6666",cursor:"pointer",borderRadius:3,fontSize:9,fontFamily:"'Courier New',monospace"}}>■ STOP</button>}
                </div>
              )}

              {vidErr&&<div style={{marginBottom:8,padding:"7px 10px",background:"rgba(255,68,68,0.1)",border:"1px solid rgba(255,68,68,0.3)",borderRadius:3,fontSize:8,color:"#ff6666"}}>⚠ {vidErr}</div>}

              {/* Current gesture status */}
              <div style={{padding:"10px 14px",border:`1px solid ${cfg.color}33`,background:`${cfg.color}08`,borderRadius:3,display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:34,lineHeight:1}}>{cfg.emoji}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:"bold",color:cfg.color,letterSpacing:2}}>{cfg.label}</div>
                  <div style={{fontSize:8,color:T.dim,marginTop:2}}>{cfg.desc}</div>
                </div>
                {drawMode&&<div style={{marginLeft:"auto",fontSize:8,color:"#8888ff",letterSpacing:1,border:"1px solid #8888ff44",padding:"3px 7px",borderRadius:2}}>✏️ DRAW</div>}
              </div>
            </div>

            {/* RIGHT: gesture reference */}
            <div>
              <div style={{fontSize:7,color:T.dim,letterSpacing:2,marginBottom:8}}>ALL GESTURES</div>
              <div style={{display:"flex",flexDirection:"column",gap:2,maxHeight:560,overflowY:"auto"}}>
                {Object.entries(GC).filter(([k])=>!["none","unknown"].includes(k)).map(([k,c])=>{
                  const active=gesture===k;
                  return (
                    <div key={k} style={{padding:"5px 8px",border:`1px solid ${active?c.color:"rgba(255,255,255,0.04)"}`,background:active?`${c.color}0d`:"transparent",borderRadius:2,display:"flex",alignItems:"center",gap:8,transition:"all 0.15s"}}>
                      <span style={{fontSize:13,lineHeight:1}}>{c.emoji}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:8,color:active?c.color:"#444",letterSpacing:1}}>{c.label}</div>
                        <div style={{fontSize:6,color:"#282828",marginTop:1}}>{c.action}</div>
                      </div>
                      {(gCount[k]||0)>0&&<span style={{fontSize:7,color:c.color+"88"}}>{gCount[k]}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ UPLOAD TAB ══════════════ */}
        {tab==="upload"&&(
          <div>
            <div style={{fontSize:8,color:T.dim,letterSpacing:3,marginBottom:16}}>▸ FILE UPLOADS — load your own content</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>

              {/* 3D Model */}
              <div style={{padding:16,border:"1px solid rgba(136,0,255,0.3)",borderRadius:4,background:"rgba(136,0,255,0.04)"}}>
                <div style={{fontSize:9,color:"#aa66ff",letterSpacing:2,marginBottom:6}}>◈ 3D MODEL</div>
                <div style={{fontSize:7,color:"#444",marginBottom:10,lineHeight:1.6}}>Upload GLB or OBJ/GLTF file.<br/>Enable 3D mode to see it.<br/>Dual hands: scale + rotate.</div>
                <label style={{display:"block",padding:"10px",textAlign:"center",border:"1px dashed rgba(136,0,255,0.35)",borderRadius:3,cursor:"pointer",color:modelFile?"#aa66ff":"#553377",fontSize:8,letterSpacing:1,transition:"all 0.2s"}}>
                  {modelFile?`✓ ${modelFile.name}`:"➕ CHOOSE GLB / OBJ"}
                  <input type="file" accept=".glb,.gltf,.obj" style={{display:"none"}} onChange={e=>{
                    const f=e.target.files[0];if(f){setModelFile(f);if(!show3D)setShow3D(true);setTab("mirror");notify(`Model: ${f.name}`,"#aa66ff");}
                  }}/>
                </label>
                {modelFile&&(
                  <button onClick={()=>setModelFile(null)} style={{marginTop:8,width:"100%",padding:"6px",background:"rgba(255,68,68,0.12)",border:"1px solid rgba(255,68,68,0.3)",color:"#ff6666",cursor:"pointer",borderRadius:2,fontSize:7,fontFamily:"'Courier New',monospace"}}>
                    ✕ REMOVE
                  </button>
                )}
              </div>

              {/* Image */}
              <div style={{padding:16,border:`1px solid ${T.border}`,borderRadius:4,background:`${T.accent}04`}}>
                <div style={{fontSize:9,color:T.accent,letterSpacing:2,marginBottom:6}}>📷 HAND IMAGE</div>
                <div style={{fontSize:7,color:"#444",marginBottom:10,lineHeight:1.6}}>Upload any photo with a hand.<br/>Switch to IMAGE mode,<br/>then click RUN DETECTION.</div>
                <label style={{display:"block",padding:"10px",textAlign:"center",border:`1px dashed ${T.border}`,borderRadius:3,cursor:"pointer",color:imgFile?T.accent:"#2a5a4a",fontSize:8,letterSpacing:1}}>
                  {imgFile?`✓ ${imgFile.name}`:"➕ CHOOSE IMAGE"}
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                    const f=e.target.files[0];if(f){setImgFile(f);notify(`Image: ${f.name}`,"#00ffcc");}
                  }}/>
                </label>
                {imgFile&&(
                  <div style={{marginTop:8,display:"flex",gap:6}}>
                    <button onClick={()=>setImgFile(null)} style={{flex:1,padding:"6px",background:"rgba(255,68,68,0.12)",border:"1px solid rgba(255,68,68,0.3)",color:"#ff6666",cursor:"pointer",borderRadius:2,fontSize:7,fontFamily:"'Courier New',monospace"}}>✕</button>
                    <button onClick={()=>{setTab("mirror");setInputMode("image");setTimeout(detectImg,200);}} style={{flex:3,padding:"6px",background:`${T.accent}18`,border:`1px solid ${T.accent}44`,color:T.accent,cursor:"pointer",borderRadius:2,fontSize:7,fontFamily:"'Courier New',monospace"}}>▶ DETECT NOW</button>
                  </div>
                )}
              </div>

              {/* Video */}
              <div style={{padding:16,border:"1px solid rgba(255,204,0,0.2)",borderRadius:4,background:"rgba(255,204,0,0.03)"}}>
                <div style={{fontSize:9,color:"#ffcc00",letterSpacing:2,marginBottom:6}}>🎞 VIDEO</div>
                <div style={{fontSize:7,color:"#444",marginBottom:10,lineHeight:1.6}}>Upload MP4 or WebM video.<br/>Switch to VIDEO mode,<br/>then click PLAY VIDEO.</div>
                <label style={{display:"block",padding:"10px",textAlign:"center",border:"1px dashed rgba(255,204,0,0.3)",borderRadius:3,cursor:"pointer",color:vidSrc?"#ffcc00":"#554400",fontSize:8,letterSpacing:1}}>
                  {vidSrc?"✓ Video loaded":"➕ CHOOSE VIDEO"}
                  <input type="file" accept="video/*" style={{display:"none"}} onChange={e=>{
                    const f=e.target.files[0];if(f){if(vidSrc)URL.revokeObjectURL(vidSrc);const url=URL.createObjectURL(f);setVidSrc(url);notify(`Video: ${f.name}`,"#ffcc00");}
                  }}/>
                </label>
                {vidSrc&&(
                  <div style={{marginTop:8,display:"flex",gap:6}}>
                    <button onClick={()=>{URL.revokeObjectURL(vidSrc);setVidSrc(null);}} style={{flex:1,padding:"6px",background:"rgba(255,68,68,0.12)",border:"1px solid rgba(255,68,68,0.3)",color:"#ff6666",cursor:"pointer",borderRadius:2,fontSize:7,fontFamily:"'Courier New',monospace"}}>✕</button>
                    <button onClick={()=>{setTab("mirror");setInputMode("video");setTimeout(startVideo,200);}} style={{flex:3,padding:"6px",background:"rgba(255,204,0,0.15)",border:"1px solid rgba(255,204,0,0.35)",color:"#ffcc00",cursor:"pointer",borderRadius:2,fontSize:7,fontFamily:"'Courier New',monospace"}}>▶ PLAY NOW</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ LOG TAB ══════════════ */}
        {tab==="log"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:9,color:T.dim,letterSpacing:2}}>GESTURE LOG ({log.length})</div>
              <button onClick={()=>setLog([])} style={btn(T)}>CLEAR</button>
            </div>
            {log.length===0
              ?<div style={{color:"#1a1a1a",padding:40,textAlign:"center",border:"1px dashed #111",borderRadius:4,fontSize:10}}>No gestures yet. Run detection to see history.</div>
              :<div style={{display:"flex",flexDirection:"column",gap:2,maxHeight:500,overflowY:"auto"}}>
                {log.map((e,i)=>(
                  <div key={i} style={{padding:"5px 10px",border:`1px solid ${e.cfg?.color}18`,background:`${e.cfg?.color}06`,borderRadius:2,display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:16,lineHeight:1}}>{e.cfg?.emoji}</span>
                    <span style={{fontSize:8,color:e.cfg?.color,flex:1,letterSpacing:1}}>{e.g?.replace(/_/g," ").toUpperCase()}</span>
                    <span style={{fontSize:7,color:"#2a2a2a"}}>{e.time}</span>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {/* ══════════════ NOTES TAB ══════════════ */}
        {tab==="notes"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:9,color:T.dim,letterSpacing:2}}>NOTES ({notes.length}) — 👍 save note · 👎 delete last</div>
              <button onClick={()=>setNotes([])} style={btn(T)}>CLEAR ALL</button>
            </div>
            {notes.length===0
              ?<div style={{color:"#1a1a1a",padding:40,textAlign:"center",border:"1px dashed #111",borderRadius:4,fontSize:10}}>No notes. Give a 👍 Thumbs Up gesture to save one.</div>
              :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
                {notes.map((n,i)=>(
                  <div key={i} style={{padding:12,border:"1px solid rgba(255,204,0,0.15)",background:"rgba(255,204,0,0.03)",borderRadius:4}}>
                    <div style={{fontSize:20,marginBottom:6}}>📝</div>
                    <div style={{fontSize:10,color:"#ccc"}}>{n.text}</div>
                    <div style={{fontSize:7,color:"#333",marginTop:6}}>{new Date(n.time).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {/* ══════════════ SCREENSHOTS TAB ══════════════ */}
        {tab==="screenshots"&&(
          <div>
            <div style={{fontSize:9,color:T.dim,letterSpacing:2,marginBottom:12}}>SCREENSHOTS ({shots.length}) — ✌️ Victory to capture</div>
            {shots.length===0
              ?<div style={{color:"#1a1a1a",padding:40,textAlign:"center",border:"1px dashed #111",borderRadius:4,fontSize:10}}>No screenshots. Show a ✌️ Victory gesture.</div>
              :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
                {shots.map((s,i)=>(
                  <div key={i} style={{border:`1px solid ${T.border}`,borderRadius:4,overflow:"hidden"}}>
                    {s.url&&<img src={s.url} alt={s.label} style={{width:"100%",display:"block",opacity:0.85}}/>}
                    <div style={{padding:"7px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${T.border}`}}>
                      <span style={{fontSize:9,color:T.accent}}>{s.label}</span>
                      {s.url&&<a href={s.url} download={`snap-${i+1}.png`} style={{fontSize:8,padding:"3px 8px",border:`1px solid ${T.accent}44`,color:T.accent,borderRadius:2}}>↓ SAVE</a>}
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {/* ══════════════ COMBOS TAB ══════════════ */}
        {tab==="combos"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div>
              <div style={{fontSize:9,color:T.dim,letterSpacing:2,marginBottom:10}}>AVAILABLE COMBOS</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {Object.entries(COMBOS).map(([key,label])=>{
                  const [g1,g2]=key.split(",");
                  return (
                    <div key={key} style={{padding:"7px 10px",border:"1px solid rgba(255,204,0,0.1)",background:"rgba(255,204,0,0.03)",borderRadius:3,display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16}}>{GC[g1]?.emoji}</span>
                      <span style={{fontSize:10,color:"#333"}}>+</span>
                      <span style={{fontSize:16}}>{GC[g2]?.emoji}</span>
                      <span style={{fontSize:9,color:"#ffcc00",flex:1,marginLeft:4}}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{fontSize:9,color:T.dim,letterSpacing:2,marginBottom:10}}>COMBO HISTORY ({comboLog.length})</div>
              {comboLog.length===0
                ?<div style={{color:"#1a1a1a",padding:30,textAlign:"center",border:"1px dashed #111",borderRadius:4,fontSize:10}}>No combos triggered yet.</div>
                :<div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {comboLog.map((c,i)=>(
                    <div key={i} style={{padding:"6px 10px",border:"1px solid rgba(255,204,0,0.15)",background:"rgba(255,204,0,0.04)",borderRadius:3,display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:10,color:"#ffcc00"}}>{c.combo}</span>
                      <span style={{fontSize:8,color:"#333"}}>{c.time}</span>
                    </div>
                  ))}
                </div>
              }
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
