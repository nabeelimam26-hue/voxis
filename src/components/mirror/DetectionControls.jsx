export default function DetectionControls({ inputMode, modelReady, scanning, videoPlay, camActive, vidErr, detectImg, startVideo, stopVideo, startCam, stopCam }) {
  return (
    <>
      {inputMode==="image"&&(
        <button onClick={detectImg} disabled={!modelReady||scanning} style={{width:"100%",padding:"10px",marginBottom:8,background:modelReady?"#00ffcc1a":"#111",border:`1px solid ${modelReady?"#00ffcc44":"#222"}`,color:modelReady?"#00ffcc":"#333",cursor:modelReady?"pointer":"not-allowed",borderRadius:3,fontSize:10,letterSpacing:2,fontFamily:"'Courier New',monospace"}}>
          {!modelReady?"⏳ LOADING...":(scanning?"SCANNING...":"▶  RUN DETECTION")}
        </button>
      )}
      {inputMode==="video"&&(
        <div style={{display:"flex",gap:6,marginBottom:8}}>
          <button onClick={startVideo} disabled={!modelReady||videoPlay} style={{flex:1,padding:"10px",background:"#44ffaa1a",border:"1px solid #44ffaa44",color:"#44ffaa",cursor:modelReady&&!videoPlay?"pointer":"not-allowed",borderRadius:3,fontSize:9,letterSpacing:2,fontFamily:"'Courier New',monospace"}}>
            {videoPlay?"● PLAYING":"▶  PLAY VIDEO"}
          </button>
          {videoPlay&&<button onClick={stopVideo} style={{padding:"10px 14px",background:"rgba(255,68,68,0.18)",border:"1px solid rgba(255,68,68,0.4)",color:"#ff6666",cursor:"pointer",borderRadius:3,fontSize:9,fontFamily:"'Courier New',monospace"}}>■ STOP</button>}
        </div>
      )}
      {inputMode==="webcam"&&(
        <div style={{display:"flex",gap:6,marginBottom:8}}>
          <button onClick={startCam} disabled={!modelReady||camActive} style={{flex:1,padding:"10px",background:"#ff66ff1a",border:"1px solid #ff66ff44",color:"#ff66ff",cursor:modelReady&&!camActive?"pointer":"not-allowed",borderRadius:3,fontSize:9,letterSpacing:2,fontFamily:"'Courier New',monospace"}}>
            {camActive?"● ACTIVE":"▶  START WEBCAM"}
          </button>
          {camActive&&<button onClick={stopCam} style={{padding:"10px 14px",background:"rgba(255,68,68,0.18)",border:"1px solid rgba(255,68,68,0.4)",color:"#ff6666",cursor:"pointer",borderRadius:3,fontSize:9,fontFamily:"'Courier New',monospace"}}>■ STOP</button>}
        </div>
      )}
      {vidErr&&<div style={{marginBottom:8,padding:"7px 10px",background:"rgba(255,68,68,0.1)",border:"1px solid rgba(255,68,68,0.3)",borderRadius:3,fontSize:8,color:"#ff6666"}}>⚠ {vidErr}</div>}
    </>
  );
}
