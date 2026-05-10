import EngineState from "../state/EngineState";

class EngineLoop {
  constructor() {
    this.lastTime = performance.now();
    this.running = false;
    this.rafId = null;
    this.frameCount = 0;
    this.fpsWindowStart = this.lastTime;
  }

  start(update) {
    if (this.running) return;

    this.running = true;
    this.lastTime = performance.now();
    this.fpsWindowStart = this.lastTime;
    this.frameCount = 0;

    const loop = (time) => {
      if (!this.running) return;

      const delta = time - this.lastTime;
      this.lastTime = time;
      this.frameCount += 1;

      EngineState.performance.updateFrameTime = delta;
      EngineState.performance.frameTime = EngineState.performance.renderFrameTime || delta;

      if (time - this.fpsWindowStart >= 1000) {
        EngineState.performance.updateFps = this.frameCount;
        if (!EngineState.performance.renderFps) {
          EngineState.performance.fps = this.frameCount;
        }
        this.frameCount = 0;
        this.fpsWindowStart = time;
      }

      update(delta);

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

const engineLoop = new EngineLoop();

export default engineLoop;
