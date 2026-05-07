import { COMBOS } from "../../utils/combos";
import { GC } from "../../utils/gestures";

export default function CombosPanel({ comboLog, isMobile }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20}}>
      <div>
        <div style={{fontSize:9,color:"#3a4a3a",letterSpacing:2,marginBottom:10}}>AVAILABLE COMBOS</div>
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
        <div style={{fontSize:9,color:"#3a4a3a",letterSpacing:2,marginBottom:10}}>COMBO HISTORY ({comboLog.length})</div>
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
  );
}
