import * as THREE from "three";

export function createLightingSystem(scene, config) {
  scene.add(new THREE.AmbientLight(0x1a1a2e,1.2));
  const dir=new THREE.DirectionalLight(0xffffff,1.5);
  dir.position.set(8,10,8); dir.castShadow=true; scene.add(dir);

  const pL1=new THREE.PointLight(0xff0066,2.5,40);
  pL1.position.set(-8,4,6); scene.add(pL1);
  let pL2 = null;

  if (config.pointLights >= 2) {
    pL2 = new THREE.PointLight(0x00ffcc,2.5,40);
    pL2.position.set(8,-4,6);
    scene.add(pL2);
  }

  scene.add(new THREE.PointLight(0x8844ff,1.5,30));
  return { pL1, pL2 };
}

export function animateLighting({ pL1, pL2, handCount, handDistance, now, minDistance, maxDistance }) {
  if(handCount===2){
    const t=THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(handDistance,minDistance,maxDistance,0,1),0,1);
    pL1.color.lerpColors(new THREE.Color(0xff3366),new THREE.Color(0x00ffcc),t);
    pL1.intensity=2+Math.sin(now*.003)*.5;
  }

  const tOrb = now * 0.0005;
  if (pL2) {
    pL2.position.x = Math.sin(tOrb) * 10;
    pL2.position.z = Math.cos(tOrb) * 8;
  }
}
