import EngineState from "../state/EngineState";

class EngineLoop {
  constructor() {
    this.lastTime = performance.now();
    this.running = false;
  }

  start(update) {
    if (this.running) return;

    this.running = true;

    const loop = (time) => {
      if (!this.running) return;

      const delta = time - this.lastTime;

      EngineState.performance.fps =
      delta > 0
    ? Math.round(1000 / delta)
    : 0;

      EngineState.performance.frameTime = delta;

      this.lastTime = time;

      update(delta);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }
}

const engineLoop = new EngineLoop();

export default engineLoop;