import { GC } from "../../utils/gestures";

export default function GesturePanel({ T, gesture, gCount }) {
  return (
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
  );
}
