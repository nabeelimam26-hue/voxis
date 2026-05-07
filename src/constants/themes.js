// Cyberpunk theme tokens shared by the UI shell and panels.
export const THEMES = {
  dark:  {bg:"#080c10",panel:"#0c1018",border:"rgba(0,255,204,0.18)",accent:"#00ffcc",dim:"#3a4a3a",text:"#d0e8d0",grid:"rgba(0,255,204,0.04)"},
  neon:  {bg:"#0a0020",panel:"#10002a",border:"rgba(180,0,255,0.25)",accent:"#cc00ff",dim:"#440066",text:"#e0c0ff",grid:"rgba(180,0,255,0.05)"},
};

export const btn = (T,active=false,color=null)=>({
  padding:"7px 13px", fontSize:9, letterSpacing:1.5, cursor:"pointer",
  background: active?`${color||T.accent}18`:"transparent",
  border:`1px solid ${active?(color||T.accent):T.border}`,
  color: active?(color||T.accent):T.dim,
  borderRadius:3, fontFamily:"'Courier New',monospace", transition:"all 0.15s",
});
