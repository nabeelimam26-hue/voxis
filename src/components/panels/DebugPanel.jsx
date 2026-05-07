import { btn } from "../../constants/themes";

export default function DebugPanel({ T, log, setLog }) {
  return (
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
  );
}
