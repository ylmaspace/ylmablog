export class ArenaManager {
  constructor({ canvas, setHud, grantRewards, logEvent, onArenaChange }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.setHud = setHud;
    this.grantRewards = grantRewards;
    this.logEvent = logEvent;
    this.onArenaChange = onArenaChange;
    this.arenas = {};
    this.activeKey = null;
    this.active = null;
    this.last = performance.now();
    this.acc = 0;
    this.fixedDt = 1 / 60;
  }

  register(key, factory) { this.arenas[key] = factory; }

  switchTo(key) {
    if (!this.arenas[key]) return;
    this.activeKey = key;
    this.active = this.arenas[key]();
    this.active.init(this.ctx);
    this.logEvent?.(`Arena activa: ${this.active.name}`);
    this.onArenaChange?.(key, this.active);
  }

  input(action) { this.active?.input?.(action); }
  evaluate(manual = false) {
    const e = this.active?.evaluate?.() || { stability: 0 };
    if (manual) document.getElementById("arenaResult").textContent = `Evaluación manual: estabilidad ${e.stability.toFixed(1)}%`;
    return e;
  }
  reset() { this.switchTo(this.activeKey); }

  loop = (now) => {
    const dt = Math.min(0.05, (now - this.last) / 1000 || this.fixedDt);
    this.last = now;
    this.acc += dt;
    while (this.acc >= this.fixedDt) {
      this.active?.update?.(this.fixedDt);
      this.acc -= this.fixedDt;
    }
    this.active?.render?.(this.ctx, this.setHud, this.grantRewards);
    requestAnimationFrame(this.loop);
  };

  start() { requestAnimationFrame(this.loop); }
}
