import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const WORLD_SCALE  = 6;      
const DEPTH_SCALE  = 3;      
const LERP_ALPHA   = 0.1;    
const TRAIL_MAX    = 100;    
const TRAIL_RADIUS = 0.09;
const CAMERA_Z     = 18;

// ─── COORDINATE MAPPING ──────────────────────────────────────────────────────
function lmToWorld(lm) {
  return {
    x:  (lm.x - 0.5) * WORLD_SCALE,
    y: -(lm.y - 0.5) * WORLD_SCALE,
    z:   lm.z        * -DEPTH_SCALE,
  };
}

function lmDist(a, b) {
  return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2);
}

function lerpVec3(vec, target, alpha) {
  vec.x = THREE.MathUtils.lerp(vec.x, target.x, alpha);
  vec.y = THREE.MathUtils.lerp(vec.y, target.y, alpha);
  vec.z = THREE.MathUtils.lerp(vec.z, target.z, alpha);
}

const PAINT_COLORS = [0x00ffcc, 0xff00aa, 0x8800ff, 0xffcc00, 0xff8800, 0x44ccff];

export default function ThreeCanvas({ landmarksRef, gesture }) {
  const mountRef   = useRef(null);
  const stateRef   = useRef(null);
  const rafRef     = useRef(null);

  const targetPos    = useRef(new THREE.Vector3(0, 0, 0));
  const currentPos   = useRef(new THREE.Vector3(0, 0, 0));
  const targetScale  = useRef(1);
  const currentScale = useRef(1);
  const fistRef      = useRef({ lastX: 0, lastY: 0, rotX: 0, rotY: 0 });
  const trailRef     = useRef([]);
  const paintColorI  = useRef(0);
  const lastDropRef  = useRef(0);
  const idleRef      = useRef(true);
  const clockRef     = useRef(0);

  const [status, setStatus] = useState("loading model...");
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth  || 640;
    const H = mount.clientHeight || 400;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W/H, 0.1, 200);
    camera.position.set(0, 0, CAMERA_Z);

    scene.add(new THREE.AmbientLight(0x222233, 1.5));
    const dirLight = new THREE.DirectionalLight(0x00ffcc, 3);
    dirLight.position.set(5, 10, 8);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pLight1 = new THREE.PointLight(0xff00aa, 4, 30);
    const pLight2 = new THREE.PointLight(0x8800ff, 3, 25);
    scene.add(pLight1, pLight2);

    // Star field
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(600 * 3);
    for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random()-0.5)*50;
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color:0x00ffcc, size:0.06, transparent:true, opacity:0.35 }));
    scene.add(stars);

    // Cursor
    const cursor = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff00aa })
    );
    const cRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.022, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.7 })
    );
    cursor.add(cRing);
    scene.add(cursor);

    const trailGroup = new THREE.Group();
    scene.add(trailGroup);

    // Fallback model
    const fallback = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.2, 0),
      new THREE.MeshPhongMaterial({ color:0x00ffcc, transparent:true, opacity:0.85 })
    );
    scene.add(fallback);

    stateRef.current = { renderer, scene, camera, cursor, cRing, trailGroup, pLight1, pLight2, stars, hero: fallback };

    const loader = new GLTFLoader();
    loader.load("/models/trainengine.glb", (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const size = box.getSize(new THREE.Vector3()).length();
      const autoScale = 1.8 / size;
      model.scale.setScalar(autoScale);

      scene.remove(fallback);
      scene.add(model);
      stateRef.current.hero = model;
      stateRef.current._autoScale = autoScale;
      setModelLoaded(true);
      setStatus("trainengine loaded ✓");[cite: 6]
    }, undefined, (err) => setStatus("⚠ load failed"));

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = 1/60; 
      clockRef.current += dt;
      const t = clockRef.current;

      if (!stateRef.current) return;
      const { renderer, scene, camera, cursor, cRing, trailGroup, pLight1, pLight2, stars, hero } = stateRef.current;
      
      // FIXED: Safely check for landmarks in the Ref
      const lm = landmarksRef?.current;[cite: 3]

      if (lm && lm.length >= 21) {
        idleRef.current = false;
        const tip8 = lmToWorld(lm[8]);   
        targetPos.current.set(tip8.x, tip8.y, tip8.z);

        if (gesture === "fist") {
          const palm = lmToWorld(lm[0]);
          fistRef.current.rotY += (palm.x - (fistRef.current.lastX || palm.x)) * 3;
          fistRef.current.rotX += (palm.y - (fistRef.current.lastY || palm.y)) * 3;
          fistRef.current.lastX = palm.x; fistRef.current.lastY = palm.y;
        } else {
          fistRef.current.lastX = 0; fistRef.current.lastY = 0;
        }

        const pinch = lmDist(lm[4], lm[8]);
        targetScale.current = (gesture === "ok" || pinch < 0.08) 
          ? THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(pinch, 0.02, 0.15, 0.3, 2.8), 0.2, 3.0) 
          : 1.0;

        if (gesture === "point" && now - lastDropRef.current > 90) {
          lastDropRef.current = now;
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(TRAIL_RADIUS, 8, 8),
            new THREE.MeshBasicMaterial({ color: PAINT_COLORS[paintColorI.current++ % PAINT_COLORS.length], transparent:true, opacity:0.85 })
          );
          dot.position.set(tip8.x, tip8.y, tip8.z);
          dot._born = now;
          trailGroup.add(dot);
          trailRef.current.push(dot);
          if (trailRef.current.length > TRAIL_MAX) trailGroup.remove(trailRef.current.shift());
        }

        if (gesture === "open_palm") trailRef.current.forEach(d => d.position.multiplyScalar(1.02));
        if (gesture === "thumbs_down") {
           trailRef.current.forEach(d => trailGroup.remove(d));
           trailRef.current = [];
        }
      } else {
        idleRef.current = true;
        targetPos.current.set(0, 0, 0);
        targetScale.current = 1.0;
      }

      lerpVec3(currentPos.current, targetPos.current, LERP_ALPHA);
      currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale.current, LERP_ALPHA);

      cursor.position.copy(currentPos.current);
      cRing.rotation.z += 0.05;

      if (hero) {
        if (gesture === "fist") {
          hero.position.copy(currentPos.current);
          hero.rotation.x = fistRef.current.rotX;
          hero.rotation.y = fistRef.current.rotY;
        } else if (idleRef.current) {
          hero.position.y = Math.cos(t * 0.5) * 0.25;
          hero.rotation.y += 0.006;
        } else {
          hero.position.lerp(new THREE.Vector3(currentPos.current.x * 0.5, currentPos.current.y * 0.5, 0), 0.05);
          hero.rotation.y += 0.007;
        }
        hero.scale.setScalar(currentScale.current * (stateRef.current._autoScale || 1));
      }

      pLight1.position.x = Math.sin(t * 0.5) * 8;
      pLight2.position.x = Math.cos(t * 0.4) * 7;
      stars.rotation.y += 0.0003;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  const gestureLabels = {
    fist: "✊ rotating", ok: "👌 scaling", point: "☝️ painting", 
    open_palm: "🖐️ explode", thumbs_down: "👎 clear", none: "waiting...", unknown: "waiting..."
  };

  return (
    <div style={{ position:"relative", width:"100%", height:"100%" }}>
      <div ref={mountRef} style={{ position:"absolute", inset:0 }} />
      <div style={{ position:"absolute", bottom:10, left:10, fontSize:9, color:"#00ffcc" }}>
        THREE.JS · {gestureLabels[gesture] || "searching..."}
      </div>
      <div style={{ position:"absolute", top:10, left:10, fontSize:8, color: modelLoaded ? "#00ffcc" : "#ff8800" }}>{status}</div>
    </div>
  );
}