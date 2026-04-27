import { ArenaBase } from "./arena-base.js";

export default class EnergyArena extends ArenaBase {
  constructor() { super("ENERGY", "ENERGY MANAGEMENT"); this.energy = 100; this.t = 0; }
  input(a) { if (a === "FORWARD") this.energy = Math.max(0, this.energy - 2); }
  update(dt) { this.t += dt; }
  evaluate() { return { stability: this.energy, smoothness: 70, eccError: 100 - this.energy }; }
  render(ctx, setHud) { ctx.clearRect(0, 0, 720, 520); ctx.fillStyle = "#b7ffa8"; ctx.fillText("ENERGY MANAGEMENT (preview)", 240, 260); setHud(this.name, { time: this.t, fuel: this.energy, stability: this.energy, deltaV: 1, eccError: 100 - this.energy, smoothness: 70 }); }
}
