export default function UploadPanel({ T, isMobile, modelFile, setModelFile, imgFile, setImgFile, vidSrc, setVidSrc, show3D, setShow3D, setTab, setInputMode, notify, detectImg, startVideo }) {
  return (
    <div>
      <div style={{fontSize:8,color:T.dim,letterSpacing:3,marginBottom:16}}>▸ FILE UPLOADS — load your own content</div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:16}}>
        <div style={{padding:16,border:"1px solid rgba(136,0,255,0.3)",borderRadius:4,background:"rgba(136,0,255,0.04)"}}>
          <div style={{fontSize:9,color:"#aa66ff",letterSpacing:2,marginBottom:6}}>◈ 3D MODEL</div>
          <div style={{fontSize:7,color:"#444",marginBottom:10,lineHeight:1.6}}>Upload GLB or OBJ/GLTF file.<br/>Enable 3D mode to see it.<br/>Dual hands: scale + rotate.</div>
          <label style={{display:"block",padding:"10px",textAlign:"center",border:"1px dashed rgba(136,0,255,0.35)",borderRadius:3,cursor:"pointer",color:modelFile?"#aa66ff":"#553377",fontSize:8,letterSpacing:1,transition:"all 0.2s"}}>
            {modelFile?`✓ ${modelFile.name}`:"➕ CHOOSE GLB / OBJ"}
            <input type="file" accept=".glb,.gltf,.obj" style={{display:"none"}} onChange={e=>{
              const f=e.target.files[0];if(f){setModelFile(f);if(!show3D)setShow3D(true);setTab("mirror");notify(`Model: ${f.name}`,"#aa66ff");}
            }}/>
          </label>
          {modelFile&&(<button onClick={()=>setModelFile(null)} style={{marginTop:8,width:"100%",padding:"6px",background:"rgba(255,68,68,0.12)",border:"1px solid rgba(255,68,68,0.3)",color:"#ff6666",cursor:"pointer",borderRadius:2,fontSize:7,fontFamily:"'Courier New',monospace"}}>✕ REMOVE</button>)}
        </div>

        <div style={{padding:16,border:`1px solid ${T.border}`,borderRadius:4,background:`${T.accent}04`}}>
          <div style={{fontSize:9,color:T.accent,letterSpacing:2,marginBottom:6}}>📷 HAND IMAGE</div>
          <div style={{fontSize:7,color:"#444",marginBottom:10,lineHeight:1.6}}>Upload any photo with a hand.<br/>Switch to IMAGE mode,<br/>then click RUN DETECTION.</div>
          <label style={{display:"block",padding:"10px",textAlign:"center",border:`1px dashed ${T.border}`,borderRadius:3,cursor:"pointer",color:imgFile?T.accent:"#2a5a4a",fontSize:8,letterSpacing:1}}>
            {imgFile?`✓ ${imgFile.name}`:"➕ CHOOSE IMAGE"}
            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files[0];if(f){setImgFile(f);notify(`Image: ${f.name}`,"#00ffcc");} }}/>
          </label>
          {imgFile&&(<div style={{marginTop:8,display:"flex",gap:6}}>
            <button onClick={()=>setImgFile(null)} style={{flex:1,padding:"6px",background:"rgba(255,68,68,0.12)",border:"1px solid rgba(255,68,68,0.3)",color:"#ff6666",cursor:"pointer",borderRadius:2,fontSize:7,fontFamily:"'Courier New',monospace"}}>✕</button>
            <button onClick={()=>{setTab("mirror");setInputMode("image");setTimeout(detectImg,200);}} style={{flex:3,padding:"6px",background:`${T.accent}18`,border:`1px solid ${T.accent}44`,color:T.accent,cursor:"pointer",borderRadius:2,fontSize:7,fontFamily:"'Courier New',monospace"}}>▶ DETECT NOW</button>
          </div>)}
        </div>

        <div style={{padding:16,border:"1px solid rgba(255,204,0,0.2)",borderRadius:4,background:"rgba(255,204,0,0.03)"}}>
          <div style={{fontSize:9,color:"#ffcc00",letterSpacing:2,marginBottom:6}}>🎞 VIDEO</div>
          <div style={{fontSize:7,color:"#444",marginBottom:10,lineHeight:1.6}}>Upload MP4 or WebM video.<br/>Switch to VIDEO mode,<br/>then click PLAY VIDEO.</div>
          <label style={{display:"block",padding:"10px",textAlign:"center",border:"1px dashed rgba(255,204,0,0.3)",borderRadius:3,cursor:"pointer",color:vidSrc?"#ffcc00":"#554400",fontSize:8,letterSpacing:1}}>
            {vidSrc?"✓ Video loaded":"➕ CHOOSE VIDEO"}
            <input type="file" accept="video/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files[0];if(f){if(vidSrc)URL.revokeObjectURL(vidSrc);const url=URL.createObjectURL(f);setVidSrc(url);notify(`Video: ${f.name}`,"#ffcc00");} }}/>
          </label>
          {vidSrc&&(<div style={{marginTop:8,display:"flex",gap:6}}>
            <button onClick={()=>{URL.revokeObjectURL(vidSrc);setVidSrc(null);}} style={{flex:1,padding:"6px",background:"rgba(255,68,68,0.12)",border:"1px solid rgba(255,68,68,0.3)",color:"#ff6666",cursor:"pointer",borderRadius:2,fontSize:7,fontFamily:"'Courier New',monospace"}}>✕</button>
            <button onClick={()=>{setTab("mirror");setInputMode("video");setTimeout(startVideo,200);}} style={{flex:3,padding:"6px",background:"rgba(255,204,0,0.15)",border:"1px solid rgba(255,204,0,0.35)",color:"#ffcc00",cursor:"pointer",borderRadius:2,fontSize:7,fontFamily:"'Courier New',monospace"}}>▶ PLAY NOW</button>
          </div>)}
        </div>
      </div>
    </div>
  );
}
