/* eslint-disable react-hooks/set-state-in-effect */
/**
 * SpatialObjectController.jsx
 * FIX: rotation.setFromEuler removed — direct euler property assignment used instead
 * FIX: no setState inside animation loop — uses refs + 250ms throttle
 * ADD: uploadedModelFile prop → loads GLB or OBJ via blob URL
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { RENDER_PRESETS } from "./RenderPresets";
import { createLightingSystem, animateLighting } from "./LightingSystem";
import { CAM_Z, D_MAX, D_MIN, LP, LR, LS, applyTwoHandTargets, fitAndCenter, lerp3, lmW } from "./HandPhysics";
export default function SpatialObjectController({
  handsRef,
  uploadedModelFile,
  renderMode = "luxury",
}) {
  const CONFIG = RENDER_PRESETS[renderMode];
  const mountRef   = useRef(null);
  const stateRef   = useRef(null);
  const rafRef     = useRef(null);

  // Smooth targets — all refs, no setState in rAF loop
  const tPos    = useRef(new THREE.Vector3());
  const cPos    = useRef(new THREE.Vector3());
  const tRY     = useRef(0);
  const tRZ     = useRef(0);
  const tScale  = useRef(1);
  const cScale  = useRef(1);
  const hcRef   = useRef(0);
  const hdRef   = useRef(1);
  const uiTimer = useRef(0);

  const [status,    setStatus]    = useState("initializing…");
  const [handCount, setHandCount] = useState(0);
  const [modelInfo, setModelInfo] = useState("default TorusKnot");
  const [scaleLabel,setScaleLabel]= useState("1.00");
  const [err,       setErr]       = useState(null);

  // ── Scene setup (once) ─────────────────────────────────────────────────────
  useEffect(()=>{
    const mount=mountRef.current; if(!mount)return;
    try{
      const W=mount.clientWidth||640, H=mount.clientHeight||400;
      const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
      renderer.setSize(W,H); renderer.setPixelRatio(CONFIG.pixelRatio);
      renderer.setClearColor(0x050810,1); renderer.shadowMap.enabled =CONFIG.shadows;
      mount.appendChild(renderer.domElement);

      const scene=new THREE.Scene();
      if (CONFIG.fog) {
        scene.fog = new THREE.Fog(0x050810, 50, 120);
      }
      const camera=new THREE.PerspectiveCamera(60,W/H,.1,200);
      camera.position.set(0,0,CAM_Z);

      // Lights are isolated to keep render-mode tuning debug-safe.
      const { pL1, pL2 } = createLightingSystem(scene, CONFIG);

      // Grid
      const grid=new THREE.GridHelper(30,30,0x444466,0x222233);
      grid.position.y=-6; grid.material.transparent=true; grid.material.opacity=.3; scene.add(grid);

      // Default hero: TorusKnot chrome
      const geo=new THREE.TorusKnotGeometry(
      1.2,
      0.4,
      CONFIG.torusSegments,
      CONFIG.tubularSegments
        );
      const mat=new THREE.MeshStandardMaterial({color:0xcccccc,metalness:.95,roughness:.05});
      const hero=new THREE.Mesh(geo,mat); hero.castShadow=true; hero.receiveShadow=true; scene.add(hero);

      // Hand markers
      const markers=[0xff0066,0x00ffcc].map(c=>{
        const m=new THREE.Mesh(new THREE.SphereGeometry(.15,16,16),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.7}));
        m.visible=false; scene.add(m); return m;
      });

      stateRef.current={renderer,scene,camera,hero,markers,pL1,pL2,geo,mat};

      // Animation loop
      const animate=()=>{
        rafRef.current=requestAnimationFrame(animate);
        const now=performance.now();
        if(!stateRef.current)return;
        const {renderer,scene,camera,hero,markers,pL1,pL2}=stateRef.current;
        const hd=handsRef?.current;

        if(hd?.hands?.length>=2){
          const L=hd.hands.find(h=>h.handedness==="Left");
          const R=hd.hands.find(h=>h.handedness==="Right");
          if(L&&R){
            hcRef.current=2;
            applyTwoHandTargets({ leftHand: L, rightHand: R, tPos, tScale, tRY, tRZ, hdRef, markers });
          }
        }else if(hd?.hands?.length===1){
          hcRef.current=1;
          const p=lmW(hd.hands[0].landmarks[0]); tPos.current.set(p.x,p.y,p.z);
          tScale.current=1; markers[0].position.copy(tPos.current); markers[0].visible=true; markers[1].visible=false;
        }else{
          hcRef.current=0; tPos.current.set(0,0,0); tScale.current=1;
          markers.forEach(m=>m.visible=false);
          tRY.current+=.005; // idle spin
        }

        // Lerp
        lerp3(cPos.current,tPos.current,LP);
        // ← CORRECT: direct property assignment, NOT setFromEuler
        hero.rotation.y=THREE.MathUtils.lerp(hero.rotation.y,tRY.current,LR);
        hero.rotation.z=THREE.MathUtils.lerp(hero.rotation.z,tRZ.current,LR);
        hero.rotation.x+=.002; // constant slow tilt
        cScale.current=THREE.MathUtils.lerp(cScale.current,tScale.current,LS);
        hero.position.copy(cPos.current);
        hero.scale.setScalar(cScale.current);

        // Dynamic lighting
        animateLighting({ pL1, pL2, handCount: hcRef.current, handDistance: hdRef.current, now, minDistance: D_MIN, maxDistance: D_MAX });

        // Throttled UI update (250ms)
        
        if (now - uiTimer.current > CONFIG.uiThrottle){
          uiTimer.current=now;
          const c=hcRef.current;
          setHandCount(c);
          setScaleLabel(cScale.current.toFixed(2));
          setStatus(c===2?"✓ 2 hands — full control":c===1?"⚡ 1 hand":"waiting for hands…");
        }

        renderer.render(scene,camera);
      };
      animate();

      const onResize=()=>{ const W2=mount.clientWidth,H2=mount.clientHeight;camera.aspect=W2/H2;camera.updateProjectionMatrix();renderer.setSize(W2,H2); };
      window.addEventListener("resize",onResize);
      return()=>{ cancelAnimationFrame(rafRef.current);window.removeEventListener("resize",onResize);renderer.dispose();geo.dispose();mat.dispose();if(mount.contains(renderer.domElement))mount.removeChild(renderer.domElement); };
    }catch(e){ console.error(e); setErr(e?.message||String(e)); }
  },[]);

  // ── Load uploaded model ────────────────────────────────────────────────────
  useEffect(()=>{
    if(!uploadedModelFile||!stateRef.current)return;
    const {scene,hero:old}=stateRef.current;
    const name=uploadedModelFile.name.toLowerCase();
    const url=URL.createObjectURL(uploadedModelFile);
    setStatus("loading model…");

    const onOK=model=>{ scene.remove(old);fitAndCenter(model);scene.add(model);stateRef.current.hero=model;setModelInfo(uploadedModelFile.name);URL.revokeObjectURL(url); };
    const onErr=e=>{ console.error(e);setStatus("⚠ model load failed");URL.revokeObjectURL(url); };

    if(name.endsWith(".glb")||name.endsWith(".gltf")){
      new GLTFLoader().load(url,g=>onOK(g.scene),undefined,onErr);
    }else if(name.endsWith(".obj")){
      new OBJLoader().load(url,onOK,undefined,onErr);
    }else{
      setStatus(`⚠ unsupported: ${uploadedModelFile.name}`);
      URL.revokeObjectURL(url);
    }
  },[uploadedModelFile]);

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div style={{position:"relative",width:"100%",height:"100%"}}>
      {err&&(
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.92)",color:"#ff6666",padding:20,textAlign:"center",zIndex:99,fontFamily:"monospace",fontSize:11}}>
          <div>
            <div style={{fontWeight:"bold",marginBottom:8}}>3D init failed</div>
            <div style={{opacity:.8}}>{err}</div>
            <div style={{marginTop:10,opacity:.5,fontSize:9}}>Disable 3D and reload the page.</div>
          </div>
        </div>
      )}
      <div ref={mountRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
      {/* Status */}
      <div style={{position:"absolute",bottom:8,left:10,pointerEvents:"none",fontFamily:"monospace",fontSize:10,color:"#00ffcc",textShadow:"0 0 8px #00ffcc",zIndex:10}}>
        {status}
        <div style={{fontSize:8,opacity:.45,marginTop:2}}>hands:{handCount} · scale:{scaleLabel}x · {modelInfo}</div>
      </div>
      {/* Legend */}
      <div style={{position:"absolute",top:8,right:8,pointerEvents:"none",fontFamily:"monospace",fontSize:8,color:"#556",background:"rgba(0,0,0,0.45)",padding:"7px 11px",borderRadius:3,border:"1px solid rgba(0,255,204,0.08)",zIndex:10,lineHeight:1.7}}>
        🎯 Spatial 3D<br/>
        <span style={{fontSize:7,opacity:.7}}>
          · both hands → scale + rotate<br/>
          · distance → scale<br/>
          · tilt → y/z rotation<br/>
          · upload GLB in Upload tab
        </span>
      </div>
    </div>
  );
}
