import { btn } from "../../constants/themes";

export default function BottomNav({ T, tab, setTab }) {
  return (
    <div style={{display:"flex",gap:4,marginBottom:14,borderBottom:`1px solid ${T.border}`,paddingBottom:8,overflowX:"auto"}}>
      {["mirror","upload","log","notes","screenshots","combos"].map(t=>(
        <button key={t} onClick={()=>setTab(t)} style={{...btn(T,tab===t),padding:"6px 14px",fontSize:8,letterSpacing:2,whiteSpace:"nowrap"}}>
          {t.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
