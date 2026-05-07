import { btn } from "../../constants/themes";

export default function TopBar({ T, modelReady, videoPlay, camActive, fps, soundOn, speechOn, onToggleTheme, onToggleSound, onToggleSpeech }) {
  return (
    <div style={{marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <div>
        <div style={{fontSize:20,fontWeight:"bold",letterSpacing:4,color:T.accent}}>🪞 EMOJI MIRROR</div>
        <div style={{fontSize:8,color:T.dim,letterSpacing:2,marginTop:2}}>Gesture · Hand Tracking · 3D Physics</div>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:8,color:modelReady?"#00ffcc":"#ff8800",letterSpacing:1,marginRight:4}}>{modelReady?"● READY":"○ LOADING"}</span>
        {(videoPlay||camActive)&&<span style={{fontSize:8,color:T.dim}}>{fps}fps</span>}
        <button onClick={onToggleTheme} style={btn(T)}>🎨 THEME</button>
        <button onClick={onToggleSound} style={btn(T,soundOn)}>🔊 {soundOn?"ON":"OFF"}</button>
        <button onClick={onToggleSpeech} style={btn(T,speechOn)}>🗣 {speechOn?"ON":"OFF"}</button>
      </div>
    </div>
  );
}
