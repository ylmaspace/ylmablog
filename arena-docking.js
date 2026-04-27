import { ArenaBase } from "./arena-base.js";

export default class DockingArena extends ArenaBase {
  constructor() { super("DOCKING", "DOCKING MASTER"); this.t = 0; }
  update(dt) { this.t += dt; }
  evaluate() { return { stability: Math.min(100, this.t * 10), smoothness: 75, eccError: 0 }; }
  render(ctx, setHud) { ctx.clearRect(0, 0, 720, 520); ctx.fillStyle = "#a8edff"; ctx.fillText("DOCKING MASTER (preview)", 260, 260); setHud(this.name, { time: this.t, fuel: 100, stability: this.evaluate().stability, deltaV: 0, eccError: 0, smoothness: 75 }); }
}
