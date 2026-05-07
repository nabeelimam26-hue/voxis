import { btn } from "../../constants/themes";

export default function NotesPanel({ T, notes, setNotes }) {
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:9,color:T.dim,letterSpacing:2}}>NOTES ({notes.length}) — 👍 save note · 👎 delete last</div>
        <button onClick={()=>setNotes([])} style={btn(T)}>CLEAR ALL</button>
      </div>
      {notes.length===0
        ?<div style={{color:"#1a1a1a",padding:40,textAlign:"center",border:"1px dashed #111",borderRadius:4,fontSize:10}}>No notes. Give a 👍 Thumbs Up gesture to save one.</div>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
          {notes.map((n,i)=>(
            <div key={i} style={{padding:12,border:"1px solid rgba(255,204,0,0.15)",background:"rgba(255,204,0,0.03)",borderRadius:4}}>
              <div style={{fontSize:20,marginBottom:6}}>📝</div>
              <div style={{fontSize:10,color:"#ccc"}}>{n.text}</div>
              <div style={{fontSize:7,color:"#333",marginTop:6}}>{new Date(n.time).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
