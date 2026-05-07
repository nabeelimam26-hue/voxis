import SpatialObjectController from "../three/SpatialObjectController";
import DetectionControls from "./DetectionControls";
import GesturePanel from "../panels/GesturePanel";

export default function MirrorViewport(props) {
  const { T, isMobile, canvasRef, show3D, handsRef, renderMode, modelFile, inputMode, fps, sessTime, fmt, modelReady, switchMode, setShow3D, setRenderMode, cfg, drawMode, gCount, gesture } = props;

  return (
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 260px",gap:16}}>
      <div>
        <div style={{marginBottom:10,border:`1px solid ${show3D?"rgba(136,0,255,0.5)":T.border}`,borderRadius:4,overflow:"hidden",background:"#050810",position:"relative"}}>
          <canvas ref={canvasRef} width={600} height={380}
            style={{display:"block",width:"100%",height:"auto",opacity:show3D?0:1,position:show3D?"absolute":"relative",transition:"opacity 0.2s"}}/>
          {show3D&&(
            <div style={{position:"relative",width:"100%",paddingTop:"63.3%"}}>
              <div style={{position:"absolute",inset:0}}>
                <SpatialObjectController handsRef={handsRef} renderMode={renderMode} uploadedModelFile={modelFile}/>
              </div>
            </div>
          )}
          <div style={{padding:"5px 10px",borderTop:`1px solid ${T.border}`,fontSize:8,color:T.dim,display:"flex",justifyContent:"space-between"}}>
            <span>{inputMode.toUpperCase()} · {fps} FPS · {fmt(sessTime)}</span>
            <span style={{color:modelReady?T.accent+"66":"#ff880066"}}>{modelReady?"READY":"LOADING"}</span>
          </div>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:isMobile?"wrap":"nowrap"}}>
          {[{k:"image",l:"📷 IMAGE"},{k:"video",l:"🎞 VIDEO"},{k:"webcam",l:"🎥 WEBCAM"}].map(m=>(
            <button key={m.k} onClick={()=>switchMode(m.k)} style={{flex:1,minWidth:isMobile?"45%":0,padding:"9px",background:inputMode===m.k?`${T.accent}18`:"transparent",border:`1px solid ${inputMode===m.k?T.accent:T.border}`,color:inputMode===m.k?T.accent:T.dim,cursor:"pointer",borderRadius:3,fontSize:9,letterSpacing:1,fontFamily:"'Courier New',monospace"}}>
              {m.l}
            </button>
          ))}
          <button onClick={()=>setShow3D(s=>!s)} style={{flex:1,minWidth:isMobile?"45%":0,padding:"9px",background:show3D?"rgba(136,0,255,0.18)":"transparent",border:`1px solid ${show3D?"#9900ff":T.border}`,color:show3D?"#bb44ff":T.dim,cursor:"pointer",borderRadius:3,fontSize:9,letterSpacing:1,fontFamily:"'Courier New',monospace"}}>
            ◈ 3D {show3D?"ON":"OFF"}
          </button>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:8}}>
          <button onClick={() => setRenderMode("safe")} style={{flex:1,padding:"9px",background:renderMode==="safe"?"rgba(0,255,204,0.18)":"transparent",border:`1px solid ${renderMode==="safe"?"#00ffcc":T.border}`,color:renderMode==="safe"?"#00ffcc":T.dim,cursor:"pointer",borderRadius:3,fontSize:9,letterSpacing:1,fontFamily:"'Courier New',monospace"}}>⚡ SAFE</button>
          <button onClick={() => setRenderMode("luxury")} style={{flex:1,padding:"9px",background:renderMode==="luxury"?"rgba(136,0,255,0.18)":"transparent",border:`1px solid ${renderMode==="luxury"?"#aa66ff":T.border}`,color:renderMode==="luxury"?"#bb66ff":T.dim,cursor:"pointer",borderRadius:3,fontSize:9,letterSpacing:1,fontFamily:"'Courier New',monospace"}}>💎 LUXURY</button>
        </div>

        <DetectionControls {...props} />

        <div style={{padding:"10px 14px",border:`1px solid ${cfg.color}33`,background:`${cfg.color}08`,borderRadius:3,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:34,lineHeight:1}}>{cfg.emoji}</span>
          <div>
            <div style={{fontSize:13,fontWeight:"bold",color:cfg.color,letterSpacing:2}}>{cfg.label}</div>
            <div style={{fontSize:8,color:T.dim,marginTop:2}}>{cfg.desc}</div>
          </div>
          {drawMode&&<div style={{marginLeft:"auto",fontSize:8,color:"#8888ff",letterSpacing:1,border:"1px solid #8888ff44",padding:"3px 7px",borderRadius:2}}>✏️ DRAW</div>}
        </div>
      </div>

      <GesturePanel T={T} gesture={gesture} gCount={gCount} />
    </div>
  );
}
