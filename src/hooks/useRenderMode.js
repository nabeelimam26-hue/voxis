import { useState } from "react";
import { RENDER_PRESETS } from "../constants/renderPresets";

export function useRenderMode(defaultMode = "luxury") {
  const [renderMode, setRenderMode] = useState(defaultMode);
  return { renderMode, setRenderMode, renderPreset: RENDER_PRESETS[renderMode] };
}
