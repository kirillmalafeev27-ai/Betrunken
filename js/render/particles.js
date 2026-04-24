// Snow / ash / dust particle streams.

import { clamp, rand } from "../util.js";
const THREE = window.THREE;

export class Particles {
  constructor() {
    this.group = new THREE.Group();
    this.layers = [];

    // Distant veil, mid flakes, close flecks
    this.layers.push(this._makeLayer(900, 70, 2.2, 0xf1f6fa, 0.55));
    this.layers.push(this._makeLayer(600, 45, 1.6, 0xffffff, 0.75));
    this.layers.push(this._makeLayer(420, 28, 1.0, 0xffffff, 0.95));
    for (const l of this.layers) this.group.add(l.points);

    this.stormStrength = 0.4;
    this.phaseRatio = 0;
    this.serenity = 0;
  }

  _makeLayer(count, spread, size, color, opacity) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = rand(-spread, spread);
      positions[i * 3 + 1] = rand(-spread * 0.6, spread * 0.6);
      positions[i * 3 + 2] = rand(-spread, 4);
      vel[i * 3]     = rand(-0.2, 0.2);
      vel[i * 3 + 1] = rand(-4, -1.2);
      vel[i * 3 + 2] = rand(-0.2, 0.2);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity,
      fog: true,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    return { points: pts, geo, mat, vel, spread };
  }

  setPreset(preset, phaseRatio) {
    const ashy = phaseRatio > 0.55 && preset !== "newyear";
    for (const l of this.layers) {
      if (ashy) {
        l.mat.color.setHex(0x3a2f28).lerp(new THREE.Color(0xd9a266), 0.35);
      } else if (preset === "newyear") {
        l.mat.color.setHex(0xffffff);
      } else {
        l.mat.color.setHex(0xffffff);
      }
    }
  }

  update(dt, ctx) {
    this.stormStrength = ctx.stormStrength;
    this.phaseRatio = ctx.phaseRatio;
    this.serenity = ctx.serenity;

    const strength = clamp(
      0.25 + this.stormStrength * 0.9 + ctx.danger * 0.2 - this.serenity * 0.25,
      0.05,
      1.35
    );
    const wind = (ctx.stormStrength - 0.3) * 2.5;
    const fallBias = 1 + this.phaseRatio * 0.4;

    for (const layer of this.layers) {
      const pos = layer.geo.attributes.position.array;
      const vel = layer.vel;
      const count = pos.length / 3;
      layer.mat.opacity = clamp(layer.mat.opacity, 0, 1);
      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        pos[ix]     += (vel[ix] + wind) * dt * strength;
        pos[ix + 1] += vel[ix + 1] * dt * fallBias * strength;
        pos[ix + 2] += vel[ix + 2] * dt * strength;

        if (pos[ix + 1] < -30) {
          pos[ix]     = rand(-layer.spread, layer.spread);
          pos[ix + 1] = rand(30, 50);
          pos[ix + 2] = rand(-layer.spread, 4);
        }
        if (Math.abs(pos[ix]) > layer.spread + 6) {
          pos[ix] = rand(-layer.spread, layer.spread);
        }
      }
      layer.geo.attributes.position.needsUpdate = true;
    }
  }
}
