import { ArenaBase } from "./arena-base.js";

export default class ReentryArena extends ArenaBase {
  constructor() { super("REENTRY", "REENTRY SURVIVAL"); this.t = 0; }
  update(dt) { this.t += dt; }
  evaluate() { return { stability: Math.max(0, 100 - this.t * 3), smoothness: 60, eccError: this.t * 0.1 }; }
  render(ctx, setHud) { ctx.clearRect(0, 0, 720, 520); ctx.fillStyle = "#ffd29c"; ctx.fillText("REENTRY SURVIVAL (preview)", 250, 260); setHud(this.name, { time: this.t, fuel: 85, stability: this.evaluate().stability, deltaV: 2, eccError: this.t * 0.1, smoothness: 60 }); }
}
