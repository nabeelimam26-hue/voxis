import { classifyGesture } from "../utils/gestures";

// Thin gesture utility hook for future hand-tracking feature work.
export function useHandTracking() {
  return { classifyGesture };
}
