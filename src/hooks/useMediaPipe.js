import { useFaceTracker } from "../utils/useFaceTracker";

// Compatibility hook that keeps the existing MediaPipe integration in one importable place.
export function useMediaPipe() {
  return useFaceTracker();
}
