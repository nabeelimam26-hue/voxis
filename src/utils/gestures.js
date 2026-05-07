// Gesture config and detection helpers. Keep thresholds unchanged for MediaPipe stability.
export const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],
];

export const GC = {
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

export function drawHand(ctx, lm, w, h) {
  if (!lm?.length) return;
  const pts = lm.map(p => ({ x: p.x*w, y: p.y*h }));
  ctx.shadowColor="#00ffcc"; ctx.shadowBlur=12;
  ctx.strokeStyle="rgba(0,255,204,0.75)"; ctx.lineWidth=2.5;
  HAND_CONNECTIONS.forEach(([a,b])=>{ ctx.beginPath();ctx.moveTo(pts[a].x,pts[a].y);ctx.lineTo(pts[b].x,pts[b].y);ctx.stroke(); });
  pts.forEach((pt,i)=>{
    const k=[0,5,9,13,17].includes(i);
    ctx.shadowColor=k?"#ff00aa":"#00ffcc"; ctx.shadowBlur=18;
    ctx.beginPath(); ctx.arc(pt.x,pt.y,k?6:4,0,Math.PI*2);
    ctx.fillStyle=k?"#ff00aa":"#00ffcc"; ctx.fill();
  });
  ctx.shadowBlur=0;
}

export function dist2D(a,b){ return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2); }
export function getFingerStates(lm) {
  const M=0.04;
  const index=lm[8].y<lm[5].y-M, middle=lm[12].y<lm[9].y-M,
        ring=lm[16].y<lm[13].y-M, pinky=lm[20].y<lm[17].y-M;
  const [t,ti,w,im]=[lm[4],lm[3],lm[0],lm[5]];
  const thumbUp=t.y<w.y-0.1&&t.y<ti.y-0.02;
  const thumbDown=t.y>w.y+0.1&&t.y>ti.y+0.02;
  const thumbOut=!thumbUp&&!thumbDown&&dist2D(t,im)>0.15;
  return {index,middle,ring,pinky,thumbUp,thumbDown,thumbOut};
}
export function classifyGesture(lm) {
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
