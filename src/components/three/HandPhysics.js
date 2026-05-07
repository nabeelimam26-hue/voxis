import * as THREE from "three";

export const WORLD  = 6;
export const DEPTH  = 3;
export const LR     = 0.05;
export const LP     = 0.10;
export const LS     = 0.10;
export const CAM_Z  = 12;
export const D_MIN  = 0.15;
export const D_MAX  = 1.20;

export function lmW(lm){ return { x:(lm.x-.5)*WORLD, y:-(lm.y-.5)*WORLD, z:lm.z*-DEPTH }; }
export function d3(a,b){ return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2+(a.z-b.z)**2); }
export function lerp3(v,t,a){ v.x=THREE.MathUtils.lerp(v.x,t.x,a);v.y=THREE.MathUtils.lerp(v.y,t.y,a);v.z=THREE.MathUtils.lerp(v.z,t.z,a); }

export function applyTwoHandTargets({ leftHand, rightHand, tPos, tScale, tRY, tRZ, hdRef, markers }) {
  const lp=lmW(leftHand.landmarks[0]), rp=lmW(rightHand.landmarks[0]);
  tPos.current.set((lp.x+rp.x)*.5,(lp.y+rp.y)*.5,(lp.z+rp.z)*.5);
  const dist=d3(lp,rp); hdRef.current=dist;
  tScale.current=THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(dist,D_MIN,D_MAX,.3,2.5),.2,3);
  const v=new THREE.Vector3(rp.x-lp.x,rp.y-lp.y,rp.z-lp.z).normalize();
  tRY.current=v.x*Math.PI*.6;
  tRZ.current=v.y*Math.PI*.4;
  const ml=lmW(leftHand.landmarks[9]),mr=lmW(rightHand.landmarks[9]);
  markers[0].position.set(ml.x,ml.y,ml.z); markers[0].visible=true;
  markers[1].position.set(mr.x,mr.y,mr.z); markers[1].visible=true;
}

export function fitAndCenter(model){
  const box=new THREE.Box3().setFromObject(model);
  const ctr=box.getCenter(new THREE.Vector3());
  const sz=box.getSize(new THREE.Vector3()).length();
  model.position.sub(ctr);
  model.scale.setScalar(3.5/sz);
  model.traverse(c=>{ if(c.isMesh){c.castShadow=true;c.receiveShadow=true;} });
}
