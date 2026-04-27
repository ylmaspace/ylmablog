import { PhysicsWorld, createBody, GravityForce, DragForce, ThrustForce, TorqueForce, totalEnergy } from "../../physics-engine.js";

export class OrbitCorrectorArena {
  constructor(logEvent) { this.id = "ORBIT_CORRECTOR"; this.name = "ORBIT CORRECTOR"; this.logEvent = logEvent; }
  init() {
    this.center = { x: 360, y: 260 };
    this.targetRadius = 200; this.targetMargin = 16;
    this.mainEngineOn = false; this.rcsPower = 0.12; this.fuel = 100;
    this.world = new PhysicsWorld({ integrator: "rk2" });
    this.world.airDensity = 0.001;

    this.planet = createBody({ id: "planet", mass: 18000, static: true, collider: { type: "circle", radius: 58 } });
    this.ship = createBody({ id: "ship", x: 195, y: -20, vx: -0.46, vy: 1.75, mass: 5, inertia: 2.5, area: 1.8, dragCoeff: 0.16, collider: { type: "circle", radius: 8 } });
    this.ship.forces.push(new GravityForce(42), new DragForce(1));
    this.thrust = new ThrustForce(28); this.torque = new TorqueForce(7);
    this.ship.forces.push(this.thrust, this.torque);

    this.world.addBody(this.planet); this.world.addBody(this.ship);
    this.path = []; this.distanceSamples = []; this.speedSamples = [];
    this.deltaV = 0; this.start = performance.now(); this.stableSince = null;
    this.won = false; this.rewarded = false;
    this.prevStability = 0;
    this.floaters = [];
    this.particles = [];
    this.eventTimer = 0;
    this.screenShake = 0;
    this.EVENTS = {
      SOLAR_WIND: () => { this.world.airDensity = Math.min(0.006, this.world.airDensity * 1.35); this.showFloatingText(\"SOLAR WIND\", 0, -40, \"#ffd38f\"); },
      ENGINE_FAIL: () => { this.thrust.throttle = 0.5; this.showFloatingText(\"ENGINE FAIL\", 0, -20, \"#ff9a9a\"); },
      ORBIT_DRIFT: () => { this.ship.vx += (Math.random() - 0.5) * 0.3; this.ship.vy += (Math.random() - 0.5) * 0.3; this.showFloatingText(\"ORBIT DRIFT\", 0, 0, \"#c8b6ff\"); },
    };
  }
  showFloatingText(text, dx = 0, dy = 0, color = \"#9cf5ff\") {
    this.floaters.push({ text, x: this.center.x + this.ship.x + dx, y: this.center.y + this.ship.y + dy, life: 1, color });
  }
  input(action) {
    if (this.fuel <= 0 || this.won) return;
    if (action === "UP") this.ship.vy -= this.rcsPower;
    if (action === "DOWN") this.ship.vy += this.rcsPower;
    if (action === "LEFT") this.ship.vx -= this.rcsPower;
    if (action === "RIGHT") this.ship.vx += this.rcsPower;
    if (action === "FORWARD") { this.ship.vx += Math.cos(this.ship.angle) * this.rcsPower * 1.4; this.ship.vy += Math.sin(this.ship.angle) * this.rcsPower * 1.4; }
    if (action === "BACKWARD") { this.ship.vx -= Math.cos(this.ship.angle) * this.rcsPower * 1.2; this.ship.vy -= Math.sin(this.ship.angle) * this.rcsPower * 1.2; }
    if (["UP","DOWN","LEFT","RIGHT","FORWARD","BACKWARD"].includes(action)) { this.fuel = Math.max(0, this.fuel - 0.8); this.deltaV += this.rcsPower; }
    if (action === "MAIN_TOGGLE") { this.mainEngineOn = !this.mainEngineOn; this.logEvent?.(`Main engine ${this.mainEngineOn ? "ON" : "OFF"}`); }
  }
  update(dt) {
    this.thrust.active = this.mainEngineOn && this.fuel > 0;
    this.torque.direction = 0;
    if (this.mainEngineOn && this.fuel > 0) { this.fuel = Math.max(0, this.fuel - 0.06); this.deltaV += 0.03; }
    this.world.update(dt);
    this.eventTimer += dt;
    if (this.eventTimer > 8) {
      this.eventTimer = 0;
      const key = [\"SOLAR_WIND\", \"ENGINE_FAIL\", \"ORBIT_DRIFT\"][Math.floor(Math.random() * 3)];
      this.EVENTS[key]?.();
    }
    this.ship.angle = Math.atan2(this.ship.vy, this.ship.vx);

    const d = Math.hypot(this.ship.x, this.ship.y);
    this.path.push({ x: this.center.x + this.ship.x, y: this.center.y + this.ship.y }); if (this.path.length > 620) this.path.shift();
    this.distanceSamples.push(d); this.speedSamples.push(Math.hypot(this.ship.vx, this.ship.vy));
    if (this.distanceSamples.length > 300) this.distanceSamples.shift();
    if (this.speedSamples.length > 300) this.speedSamples.shift();

    const e = this.evaluate();
    if (e.stability > this.prevStability + 0.6) this.showFloatingText(\"+STABILITY\", 0, -26, \"#98ffcb\");
    this.prevStability = e.stability;
    if (e.stability < 40) this.screenShake = 4;
    this.screenShake *= 0.88;
    if (e.stable) {
      if (!this.stableSince) this.stableSince = performance.now();
      if (performance.now() - this.stableSince > 5000) this.won = true;
    } else this.stableSince = null;

    this.floaters = this.floaters.map((f) => ({ ...f, y: f.y - 16 * dt, life: f.life - dt * 0.7 })).filter((f) => f.life > 0);
    this.particles = this.particles.map((p) => ({ ...p, x: p.x - p.vx * dt, y: p.y - p.vy * dt, life: p.life - dt * 1.2 })).filter((p) => p.life > 0);
  }
  evaluate() {
    if (this.distanceSamples.length < 80) return { stable: false, stability: 0, smoothness: 0, energy: 0 };
    const m = this.distanceSamples.reduce((a,b)=>a+b,0)/this.distanceSamples.length;
    const dev = Math.sqrt(this.distanceSamples.reduce((a,b)=>a+(b-m)**2,0)/this.distanceSamples.length);
    const speedMean = this.speedSamples.reduce((a,b)=>a+b,0)/this.speedSamples.length;
    const speedDev = Math.sqrt(this.speedSamples.reduce((a,b)=>a+(b-speedMean)**2,0)/this.speedSamples.length);
    const radiusErr = Math.abs(m - this.targetRadius);
    const stability = Math.max(0, Math.min(100, 100 - (dev * 4 + radiusErr * 2 + speedDev * 55)));
    const energy = totalEnergy(this.ship, this.planet, 42);
    return { stable: dev < 6.5 && radiusErr < this.targetMargin && speedDev < 0.08, stability, smoothness: Math.max(0, 100 - speedDev * 75), eccError: radiusErr, variance: dev, energy };
  }
  render(ctx, setHud, grantRewards) {
    const s = this.ship; const c = this.center; const e = this.evaluate();
    ctx.clearRect(0,0,720,520);
    const camX = -s.x + this.center.x + (Math.random() - 0.5) * this.screenShake;
    const camY = -s.y + this.center.y + (Math.random() - 0.5) * this.screenShake;
    ctx.save();
    ctx.translate(camX - this.center.x, camY - this.center.y);
    ctx.fillStyle = "#020811"; ctx.fillRect(0,0,720,520);
    for(let i=0;i<80;i++){ ctx.fillStyle="rgba(150,210,255,0.5)"; ctx.fillRect((i*97)%720,(i*53)%520,1,1); }
    const atmo = ctx.createRadialGradient(c.x,c.y,58,c.x,c.y,120); atmo.addColorStop(0,"rgba(100,180,255,0.25)"); atmo.addColorStop(1,"rgba(100,180,255,0)");
    ctx.fillStyle = atmo; ctx.beginPath(); ctx.arc(c.x,c.y,120,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(130,230,255,0.35)"; ctx.setLineDash([7,8]); ctx.beginPath(); ctx.arc(c.x,c.y,this.targetRadius,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle="#3b94ea"; ctx.beginPath(); ctx.arc(c.x,c.y,58,0,Math.PI*2); ctx.fill();
    if(this.path.length>1){ ctx.strokeStyle="rgba(120,235,255,.85)"; ctx.beginPath(); ctx.moveTo(this.path[0].x,this.path[0].y); for(let i=1;i<this.path.length;i++) ctx.lineTo(this.path[i].x,this.path[i].y); ctx.stroke(); }
    const px = c.x + s.x, py = c.y + s.y;
    ctx.strokeStyle="#9af2ff"; ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+s.vx*25,py+s.vy*25); ctx.stroke();
    if (this.mainEngineOn && this.fuel > 0) {
      for (let i = 0; i < 5; i++) {
        this.particles.push({ x: px - Math.cos(s.angle) * (10 + i * 2), y: py - Math.sin(s.angle) * (10 + i * 2), vx: s.vx * 12 + Math.random() * 8, vy: s.vy * 12 + Math.random() * 8, life: 0.5 });
      }
    }
    for (const p of this.particles) {
      ctx.fillStyle = `rgba(124,230,255,${p.life})`;
      ctx.fillRect(p.x, p.y, 2, 2);
    }
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#7ce6ff";
    ctx.save(); ctx.translate(px,py); ctx.rotate(s.angle); ctx.fillStyle=this.won?"#9fffc9":"#fff"; ctx.beginPath(); ctx.moveTo(13,0); ctx.lineTo(-8,6); ctx.lineTo(-8,-6); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.shadowBlur = 0;
    for (const f of this.floaters) {
      ctx.fillStyle = f.color;
      ctx.globalAlpha = f.life;
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    setHud(this.name,{ time:(performance.now()-this.start)/1000, fuel:this.fuel, stability:e.stability, deltaV:this.deltaV, eccError:e.eccError||0, smoothness:e.smoothness });
    if(this.won && !this.rewarded){ this.rewarded=true; grantRewards({ stability:e.stability, smoothness:e.smoothness }); }
  }
}
