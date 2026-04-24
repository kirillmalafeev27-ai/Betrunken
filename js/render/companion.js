// Companion climber (appears beside the player, falls after 3 mistakes).

import { makeClimber } from "./climber.js";
import { clamp, lerp } from "../util.js";

const THREE = window.THREE;

export class Companion {
  constructor() {
    const built = makeClimber({ jacketColor: 0x3d6f9c, packColor: 0x453021 });
    this.group = built.group;
    this.group.scale.setScalar(0.9);
    this.fallen = false;
    this.fallY = 0;
  }

  update(dt, ctx) {
    if (this.fallen) {
      this.fallY += -30 * dt;
      this.group.position.y += -30 * dt;
      this.group.rotation.z += dt * 6;
      if (this.group.position.y < -40) this.group.visible = false;
      return;
    }
    const offset = ctx.playerX < 0 ? 2.6 : -2.6;
    const targetX = ctx.playerX + offset;
    this.group.position.x = lerp(this.group.position.x, targetX, Math.min(1, dt * 4));
    this.group.position.y = lerp(this.group.position.y, -0.25, Math.min(1, dt * 3));
    this.group.position.z = lerp(this.group.position.z, ctx.playerZ - 0.4, Math.min(1, dt * 3));
    const breathe = Math.sin(performance.now() * 0.003) * 0.04;
    this.group.position.y += breathe;
  }

  triggerFall() {
    this.fallen = true;
  }
}
