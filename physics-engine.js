/* =======================================
   YLMA PHYSICS ENGINE CORE v1 (REAL BASE)
   ======================================= */
(function () {
  class PhysicsWorld {
    constructor() {
      this.bodies = [];
      this.gravity = { x: 0, y: 0 };
      this.airDensity = 1.225;
      this.time = 0;
    }

    addBody(body) {
      this.bodies.push(body);
      return body;
    }

    update(dt) {
      const safeDt = Math.max(0, Math.min(0.1, Number(dt) || 0));
      if (safeDt <= 0) return;

      for (const b of this.bodies) {
        b.fx = 0;
        b.fy = 0;
        b.torque = 0;

        if (b.static) continue;

        b.fx += this.gravity.x * b.mass;
        b.fy += this.gravity.y * b.mass;

        for (const force of b.forces) {
          if (force && typeof force.apply === "function") {
            force.apply(b, this, safeDt);
          }
        }
      }

      for (const b of this.bodies) {
        if (b.static) continue;

        const ax = b.fx / b.mass;
        const ay = b.fy / b.mass;

        b.vx += ax * safeDt;
        b.vy += ay * safeDt;

        b.x += b.vx * safeDt;
        b.y += b.vy * safeDt;

        const angularAcc = b.torque / b.inertia;
        b.angularVelocity += angularAcc * safeDt;
        b.angle += b.angularVelocity * safeDt;
      }

      this.time += safeDt;
    }
  }

  function createBody(config = {}) {
    const mass = Math.max(0.0001, Number(config.mass ?? 1));
    const inertia = Math.max(0.0001, Number(config.inertia ?? 1));

    return {
      id: config.id || null,
      x: Number(config.x || 0),
      y: Number(config.y || 0),
      vx: Number(config.vx || 0),
      vy: Number(config.vy || 0),

      angle: Number(config.angle || 0),
      angularVelocity: Number(config.angularVelocity || 0),

      mass,
      inertia,

      area: Math.max(0.0001, Number(config.area ?? 1)),
      dragCoeff: Math.max(0, Number(config.dragCoeff ?? 0.5)),

      static: Boolean(config.static),

      fx: 0,
      fy: 0,
      torque: 0,

      forces: Array.isArray(config.forces) ? config.forces : [],
    };
  }

  class GravityForce {
    constructor(G = 6.674e-3, epsilon = 1e-4) {
      this.G = G;
      this.epsilon = epsilon;
      this.maxForce = Infinity;
    }

    apply(body, world) {
      for (const other of world.bodies) {
        if (other === body) continue;

        const dx = other.x - body.x;
        const dy = other.y - body.y;

        const distSq = dx * dx + dy * dy + this.epsilon;
        const dist = Math.sqrt(distSq);

        let force = (this.G * body.mass * other.mass) / distSq;
        if (Number.isFinite(this.maxForce)) {
          force = Math.min(force, this.maxForce);
        }

        body.fx += force * (dx / dist);
        body.fy += force * (dy / dist);
      }
    }
  }

  class DragForce {
    constructor(multiplier = 1) {
      this.multiplier = multiplier;
    }

    apply(body, world) {
      const vx = body.vx;
      const vy = body.vy;
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed < 1e-4) return;

      const drag =
        0.5 *
        world.airDensity *
        speed * speed *
        body.dragCoeff *
        body.area *
        this.multiplier;

      body.fx -= drag * (vx / speed);
      body.fy -= drag * (vy / speed);
    }
  }

  class ThrustForce {
    constructor(power) {
      this.power = power;
      this.active = false;
      this.throttle = 1;
    }

    apply(body) {
      if (!this.active) return;

      const thrustPower = this.power * Math.max(0, Math.min(1, this.throttle));
      const fx = Math.cos(body.angle) * thrustPower;
      const fy = Math.sin(body.angle) * thrustPower;

      body.fx += fx;
      body.fy += fy;
    }
  }

  class TorqueForce {
    constructor(power) {
      this.power = power;
      this.direction = 0;
    }

    apply(body) {
      body.torque += this.power * this.direction;
    }
  }

  function kineticEnergy(body) {
    return 0.5 * body.mass * (body.vx * body.vx + body.vy * body.vy);
  }

  window.YLMAPhysics = {
    PhysicsWorld,
    createBody,
    GravityForce,
    DragForce,
    ThrustForce,
    TorqueForce,
    kineticEnergy,
  };
})();
