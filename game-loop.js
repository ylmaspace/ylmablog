export class FixedGameLoop {
  constructor(update, render, dt = 1 / 60) { this.update = update; this.render = render; this.dt = dt; this.acc = 0; this.last = performance.now(); }
  frame = (now) => {
    const elapsed = Math.min(0.05, (now - this.last) / 1000 || this.dt);
    this.last = now;
    this.acc += elapsed;
    while (this.acc >= this.dt) { this.update(this.dt); this.acc -= this.dt; }
    this.render();
    requestAnimationFrame(this.frame);
  };
  start() { requestAnimationFrame(this.frame); }
}
