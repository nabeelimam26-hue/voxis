export default function GestureOverlay({ particles, rain, cleared, notif, timerOn, timerN }) {
  return (
    <>
      {particles.map(p=><div key={p.id} style={{position:"fixed",left:`${p.x}%`,top:`${p.y}%`,width:p.size,height:p.size,background:p.color,transform:`rotate(${p.rot}deg)`,pointerEvents:"none",zIndex:60,borderRadius:"50%"}}/>)}
      {rain.map(p=><div key={p.id} style={{position:"fixed",left:`${p.x}%`,top:`${p.y}%`,fontSize:p.size,transform:`rotate(${p.rot}deg)`,pointerEvents:"none",zIndex:61,lineHeight:1}}>{p.emoji}</div>)}
      {cleared&&<div style={{position:"fixed",inset:0,background:"rgba(255,68,68,0.15)",zIndex:55,pointerEvents:"none"}}/>}
      {notif&&<div style={{position:"fixed",top:16,right:16,padding:"11px 18px",background:notif.color+"28",border:`2px solid ${notif.color}`,borderRadius:4,zIndex:200,letterSpacing:2,fontSize:11,color:notif.color,fontFamily:"'Courier New',monospace"}}>{notif.msg}</div>}
      {timerOn&&<div style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,pointerEvents:"none",fontSize:180,fontWeight:"bold",color:"rgba(0,255,204,0.25)"}}>{timerN}</div>}
    </>
  );
}
