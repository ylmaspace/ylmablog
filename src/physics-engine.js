export class PhysicsWorld {
  constructor({ integrator = "semi-implicit", restitution = 0.7 } = {}) {
    this.bodies = [];
    this.gravity = { x: 0, y: 0 };
    this.airDensity = 1.225;
    this.time = 0;
    this.integrator = integrator;
    this.restitution = restitution;
  }

  addBody(body) { this.bodies.push(body); return body; }

  stepBody(body, dt) {
    const ax = body.fx / body.mass;
    const ay = body.fy / body.mass;

    if (this.integrator === "rk2") {
      const vxMid = body.vx + ax * dt * 0.5;
      const vyMid = body.vy + ay * dt * 0.5;
      body.x += vxMid * dt;
      body.y += vyMid * dt;
      body.vx += ax * dt;
      body.vy += ay * dt;
    } else {
      body.vx += ax * dt;
      body.vy += ay * dt;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
    }

    const aAng = body.torque / body.inertia;
    body.angularVelocity += aAng * dt;
    body.angle += body.angularVelocity * dt;
  }

  resolveCollisions() {
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const a = this.bodies[i], b = this.bodies[j];
        if (!a.collider || !b.collider) continue;
        if (a.collider.type !== "circle" || b.collider.type !== "circle") continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const minDist = a.collider.radius + b.collider.radius;
        if (dist >= minDist) continue;

        const nx = dx / dist, ny = dy / dist;
        const overlap = minDist - dist;

        if (!a.static) { a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5; }
        if (!b.static) { b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5; }

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const velAlongNormal = rvx * nx + rvy * ny;
        if (velAlongNormal > 0) continue;

        const e = Math.min(a.restitution ?? this.restitution, b.restitution ?? this.restitution);
        const invMassA = a.static ? 0 : 1 / a.mass;
        const invMassB = b.static ? 0 : 1 / b.mass;
        const denom = invMassA + invMassB || 1;
        const jImpulse = -(1 + e) * velAlongNormal / denom;

        const ix = jImpulse * nx;
        const iy = jImpulse * ny;
        if (!a.static) { a.vx -= ix * invMassA; a.vy -= iy * invMassA; }
        if (!b.static) { b.vx += ix * invMassB; b.vy += iy * invMassB; }
      }
    }
  }

  update(dt) {
    const safeDt = Math.max(0, Math.min(0.05, Number(dt) || 0));
    if (!safeDt) return;

    for (const b of this.bodies) {
      b.fx = 0; b.fy = 0; b.torque = 0;
      if (b.static) continue;
      b.fx += this.gravity.x * b.mass;
      b.fy += this.gravity.y * b.mass;
      for (const force of b.forces) force.apply?.(b, this, safeDt);
    }

    for (const b of this.bodies) if (!b.static) this.stepBody(b, safeDt);

    this.resolveCollisions();
    this.time += safeDt;
  }
}

export function createBody(c = {}) {
  return {
    id: c.id || null,
    x: c.x || 0, y: c.y || 0,
    vx: c.vx || 0, vy: c.vy || 0,
    angle: c.angle || 0, angularVelocity: c.angularVelocity || 0,
    mass: Math.max(1e-4, c.mass ?? 1),
    inertia: Math.max(1e-4, c.inertia ?? 1),
    area: Math.max(1e-4, c.area ?? 1),
    dragCoeff: Math.max(0, c.dragCoeff ?? 0.5),
    static: Boolean(c.static),
    collider: c.collider || null,
    restitution: c.restitution,
    fx: 0, fy: 0, torque: 0,
    forces: Array.isArray(c.forces) ? c.forces : [],
  };
}

export class GravityForce {
  constructor(G = 8, epsilon = 0.01) { this.G = G; this.epsilon = epsilon; }
  apply(body, world) {
    for (const other of world.bodies) {
      if (other === body) continue;
      const dx = other.x - body.x, dy = other.y - body.y;
      const d2 = dx * dx + dy * dy + this.epsilon;
      const d = Math.sqrt(d2);
      const f = (this.G * body.mass * other.mass) / d2;
      body.fx += f * (dx / d);
      body.fy += f * (dy / d);
    }
  }
}

export class DragForce {
  constructor(mult = 1) { this.mult = mult; }
  apply(body, world) {
    const s = Math.hypot(body.vx, body.vy);
    if (s < 1e-4) return;
    const drag = 0.5 * world.airDensity * s * s * body.dragCoeff * body.area * this.mult;
    body.fx -= drag * (body.vx / s);
    body.fy -= drag * (body.vy / s);
  }
}

export class ThrustForce {
  constructor(power) { this.power = power; this.active = false; this.throttle = 1; }
  apply(body) {
    if (!this.active) return;
    const p = this.power * Math.max(0, Math.min(1, this.throttle));
    body.fx += Math.cos(body.angle) * p;
    body.fy += Math.sin(body.angle) * p;
  }
}

export class TorqueForce {
  constructor(power) { this.power = power; this.direction = 0; }
  apply(body) { body.torque += this.power * this.direction; }
}

export const kineticEnergy = (b) => 0.5 * b.mass * (b.vx ** 2 + b.vy ** 2);
export const potentialEnergy = (a, b, G = 8, eps = 0.01) => {
  const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + eps);
  return -(G * a.mass * b.mass) / d;
};
export const totalEnergy = (body, attractor, G = 8) => kineticEnergy(body) + potentialEnergy(body, attractor, G);
