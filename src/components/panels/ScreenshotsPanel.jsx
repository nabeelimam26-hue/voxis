export default function ScreenshotsPanel({ T, shots }) {
  return (
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
  );
}
